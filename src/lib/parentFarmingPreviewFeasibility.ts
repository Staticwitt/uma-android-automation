import type { Settings } from "../context/BotStateContext"
import { DEFAULT_APTITUDES, DEFAULT_WEIGHTS, type AptitudeMap } from "./solver/constants"
import { previewSchedule, type SchedulePreview } from "./solver/preview"
import { assessParentFarmingFeasibility, type ParentFarmingFeasibilityIssue } from "./parentFarmingFeasibility"
import racesData from "../data/races.json"
import epithetsData from "../data/epithets.json"

const RACES_DATA_JSON = JSON.stringify(racesData)
const EPITHETS_DATA_JSON = JSON.stringify(epithetsData)

const parseStringList = (json: string | undefined): string[] => {
    try {
        const parsed = JSON.parse(json || "[]")
        return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []
    } catch {
        return []
    }
}

const parseAptitudes = (json: string | undefined): AptitudeMap => {
    try {
        const parsed = JSON.parse(json || "{}")
        if (parsed && typeof parsed === "object") return { ...DEFAULT_APTITUDES, ...parsed }
    } catch {
        // Fall through.
    }
    return { ...DEFAULT_APTITUDES }
}

const parseWeights = (json: string | undefined) => {
    try {
        const parsed = JSON.parse(json || "{}")
        if (parsed && typeof parsed === "object") return { ...DEFAULT_WEIGHTS, ...parsed }
    } catch {
        // Fall through.
    }
    return { ...DEFAULT_WEIGHTS }
}

const parseManualLocks = (json: string | undefined): Record<string, string> => {
    try {
        const parsed = JSON.parse(json || "{}")
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, string>
    } catch {
        // Fall through.
    }
    return {}
}

export interface ParentFarmingPreviewFeasibilityResult {
    issues: ParentFarmingFeasibilityIssue[]
    preview: SchedulePreview | null
    raceCount: number
    projectedEpithetCount: number
}

/** Runs static + solver preview checks for the active parent-farming setup. */
export const assessParentFarmingPreviewFeasibility = async (settings: Settings): Promise<ParentFarmingPreviewFeasibilityResult> => {
    const issues = [...assessParentFarmingFeasibility(settings)]
    if (!settings.racing.enableSmartRaceSolver) {
        return { issues, preview: null, raceCount: 0, projectedEpithetCount: 0 }
    }

    const forced = parseStringList(settings.racing.smartRaceSolverForcedEpithets)
    let preview: SchedulePreview | null = null

    try {
        preview = await previewSchedule({
            scenario: settings.general?.scenario || "Trackblazer",
            characterPreset: settings.racing.smartRaceSolverCharacterPreset || "Special Week",
            aptitudes: parseAptitudes(settings.racing.smartRaceSolverAptitudes),
            targetEpithets: parseStringList(settings.racing.smartRaceSolverTargetEpithets),
            forcedEpithets: forced,
            manualLocks: parseManualLocks(settings.racing.smartRaceSolverManualLocks),
            weights: parseWeights(settings.racing.smartRaceSolverWeights),
            racesDataJson: RACES_DATA_JSON,
            epithetsDataJson: EPITHETS_DATA_JSON,
        })
    } catch (error) {
        issues.push({
            epithet: "",
            severity: "warning",
            message: `Solver preview failed: ${error instanceof Error ? error.message : String(error)}`,
        })
        return { issues, preview: null, raceCount: 0, projectedEpithetCount: 0 }
    }

    if (preview.error) {
        issues.push({ epithet: "", severity: "error", message: `Solver preview error: ${preview.error}` })
    }

    const raceCount = Object.values(preview.decisions).filter((entry) => entry.type === "Race").length
    const projectedEpithetCount = preview.projectedEpithets.length

    if (raceCount === 0) {
        issues.push({
            epithet: "",
            severity: "error",
            message: "Solver produced an empty race schedule. Check forced epithets, aptitudes, and scenario.",
        })
    }

    if (forced.length > 0) {
        const missingForced = forced.filter((name) => !preview!.projectedEpithets.includes(name))
        for (const epithet of missingForced) {
            issues.push({
                epithet,
                severity: "warning",
                message: `"${epithet}" is forced but not projected to complete in the preview schedule.`,
            })
        }
    }

    return { issues, preview, raceCount, projectedEpithetCount }
}

export const formatPreviewFeasibilitySummary = (result: ParentFarmingPreviewFeasibilityResult): string => {
    const parts = [`${result.raceCount} planned races`, `${result.projectedEpithetCount} projected epithets`]
    if (result.issues.some((issue) => issue.severity === "error")) parts.push("errors detected")
    else if (result.issues.length > 0) parts.push("warnings present")
    else parts.push("looks feasible")
    return parts.join(" · ")
}
