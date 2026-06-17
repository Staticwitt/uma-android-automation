import epithetsData from "../data/epithets.json"
import type { Settings } from "../context/BotStateContext"
import type { EpithetEntry } from "./solver/constants"
import { charactersForEpithet, scenariosForEpithet } from "./solver/scoring"
import { buildEpithetTiersFromLists } from "./epithetTiers"

const ALL_EPITHETS = Object.values(epithetsData) as EpithetEntry[]

export interface ParentFarmingFeasibilityIssue {
    epithet: string
    severity: "error" | "warning"
    message: string
}

const parseStringList = (json: string | undefined): string[] => {
    try {
        const parsed = JSON.parse(json || "[]")
        return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string" && value.length > 0) : []
    } catch {
        return []
    }
}

const findEpithet = (name: string): EpithetEntry | undefined => ALL_EPITHETS.find((entry) => entry.name === name)

/** Checks whether a forced epithet can plausibly complete for the active scenario and character. */
export const assessForcedEpithetFeasibility = (
    forcedEpithets: string[],
    scenario: string,
    characterName: string,
): ParentFarmingFeasibilityIssue[] => {
    const issues: ParentFarmingFeasibilityIssue[] = []
    const scenarioLower = scenario.toLowerCase()
    const characterLower = characterName.toLowerCase()

    for (const epithet of forcedEpithets) {
        const entry = findEpithet(epithet)
        if (!entry) {
            issues.push({
                epithet,
                severity: "error",
                message: `"${epithet}" is not in the epithet database — the solver cannot plan it.`,
            })
            continue
        }

        const matchers = entry.matchers ?? []
        if (matchers.length === 0) {
            issues.push({
                epithet,
                severity: "error",
                message: `"${epithet}" has no race matchers — forced routes on this epithet usually produce empty schedules.`,
            })
        }

        const scenarios = scenariosForEpithet(entry)
        if (scenarios.length > 0 && !scenarios.some((value) => value.toLowerCase() === scenarioLower)) {
            issues.push({
                epithet,
                severity: "error",
                message: `"${epithet}" requires ${scenarios.join(" / ")} scenario — current scenario is ${scenario}.`,
            })
        }

        const characters = charactersForEpithet(entry)
        if (characters.length > 0 && !characters.some((value) => value.toLowerCase() === characterLower)) {
            issues.push({
                epithet,
                severity: "warning",
                message: `"${epithet}" is restricted to ${characters.join(", ")} — may be unreachable on ${characterName}.`,
            })
        }
    }

    return issues
}

/** Returns setup issues for the active parent-farming configuration. */
export const assessParentFarmingFeasibility = (settings: Settings): ParentFarmingFeasibilityIssue[] => {
    if (!settings.racing.enableParentFarmingMode) return []

    const warnings: ParentFarmingFeasibilityIssue[] = []
    const scenario = settings.general?.scenario || "Trackblazer"
    const character = settings.racing.smartRaceSolverCharacterPreset || "Special Week"

    if (scenario !== "Trackblazer") {
        warnings.push({
            epithet: "",
            severity: "warning",
            message: `Parent farming is tuned for Trackblazer. Scenario "${scenario}" has limited Smart Race Solver main-loop integration.`,
        })
    }

    const forced = parseStringList(settings.racing.smartRaceSolverForcedEpithets)
    warnings.push(...assessForcedEpithetFeasibility(forced, scenario, character))

    return warnings
}

/** Moves infeasible forced epithets into targets so the solver can still run. */
export const autoDowngradeInfeasibleForcedEpithets = (settings: Settings): Settings => {
    if (!settings.racing.enableParentFarmingAutoDowngradeForcedEpithets) return settings

    const scenario = settings.general?.scenario || "Trackblazer"
    const character = settings.racing.smartRaceSolverCharacterPreset || "Special Week"
    const forced = parseStringList(settings.racing.smartRaceSolverForcedEpithets)
    if (forced.length === 0) return settings

    const errors = assessForcedEpithetFeasibility(forced, scenario, character).filter((issue) => issue.severity === "error")
    if (errors.length === 0) return settings

    const downgrade = new Set(errors.map((issue) => issue.epithet))
    const nextForced = forced.filter((name) => !downgrade.has(name))
    const targets = parseStringList(settings.racing.smartRaceSolverTargetEpithets)
    const nextTargets = Array.from(new Set([...targets, ...forced.filter((name) => downgrade.has(name))]))

    return {
        ...settings,
        racing: {
            ...settings.racing,
            smartRaceSolverForcedEpithets: JSON.stringify(nextForced),
            smartRaceSolverTargetEpithets: JSON.stringify(nextTargets),
            smartRaceSolverEpithetTiers: JSON.stringify(buildEpithetTiersFromLists(nextForced, nextTargets)),
        },
    }
}

export const formatFeasibilityIssues = (issues: ParentFarmingFeasibilityIssue[]): string[] =>
    issues.map((issue) => (issue.epithet ? `${issue.epithet}: ${issue.message}` : issue.message))
