import type { Settings } from "../context/BotStateContext"
import { resolveParentFarmingSettings } from "./parentFarmingResolver"

const TRAINING_DRIFT_KEYS: Array<keyof Settings["training"]> = [
    "preferredDistanceOverride",
    "disableStatTargets",
    "enablePrioritizeSkillHints",
    "maximumFailureChance",
    "statPrioritization",
    "eventChoiceStatPriority",
    "summerTrainingStatPriority",
]

const arraysEqual = (left?: string[], right?: string[]): boolean => {
    if (!left && !right) return true
    if (!left || !right) return false
    if (left.length !== right.length) return false
    return left.every((value, index) => value === right[index])
}

/** Labels for the active parent-farming bundle and goal preset. */
export const getParentFarmingActiveLabels = (settings: Settings): { bundleLabel: string; goalPresetLabel: string } => ({
    bundleLabel: settings.racing.parentFarmingBundleLabel?.trim() ?? "",
    goalPresetLabel: settings.racing.parentFarmingGoalPresetLabel?.trim() ?? "",
})

/** Short training bias line for banners and summaries. */
export const formatParentFarmingTrainingBias = (training: Settings["training"]): string => {
    const distance = training.preferredDistanceOverride === "Default" ? "Auto" : training.preferredDistanceOverride || "Auto"
    const topStat = training.statPrioritization?.[0] ?? "Speed"
    const skillHints = training.enablePrioritizeSkillHints ? "skill hints on" : "skill hints off"
    const statTargets = training.disableStatTargets ? "stat targets off" : "stat targets on"
    return `${distance} distance · ${topStat}-first · ${skillHints} · ${statTargets}`
}

const parseStringList = (json: string | undefined): string[] => {
    try {
        const parsed = JSON.parse(json || "[]")
        return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []
    } catch {
        return []
    }
}

const setsEqual = (left: string[], right: string[]): boolean => {
    if (left.length !== right.length) return false
    const rightSet = new Set(right)
    return left.every((value) => rightSet.has(value))
}

/** Whether forced epithets differ from what the resolver would apply. */
export const hasParentFarmingForcedEpithetDrift = (settings: Settings): boolean => {
    if (!settings.racing.enableParentFarmingMode) return false
    const resolved = resolveParentFarmingSettings(settings)
    const current = parseStringList(settings.racing.smartRaceSolverForcedEpithets)
    const expected = parseStringList(resolved.racing.smartRaceSolverForcedEpithets)
    return !setsEqual(current, expected)
}

/** Whether parent-farming training fields differ from what the resolver would apply. */
export const hasParentFarmingTrainingDrift = (settings: Settings): boolean => {
    if (!settings.racing.enableParentFarmingMode) return false
    const resolved = resolveParentFarmingSettings(settings)
    for (const key of TRAINING_DRIFT_KEYS) {
        const current = settings.training[key]
        const expected = resolved.training[key]
        if (Array.isArray(current) || Array.isArray(expected)) {
            if (!arraysEqual(current as string[] | undefined, expected as string[] | undefined)) return true
            continue
        }
        if (current !== expected) return true
    }
    return false
}

/**
 * Detects parent-farming configuration drift: stale keys, disabled mode flags, or training overrides
 * that no longer match the active preset.
 */
export const detectParentFarmingDrift = (settings: Settings): string[] => {
    const warnings: string[] = []
    const racing = settings.racing
    const hasPresetKey = Boolean(racing.parentFarmingGoalPresetKey || racing.parentFarmingBundleKey)

    if (!racing.enableParentFarmingMode && hasPresetKey) {
        warnings.push(
            "Parent farming mode is off but a goal preset or bundle is still stored. Re-enable parent farming or clear the preset to avoid confusion.",
        )
    }

    if (racing.enableParentFarmingMode) {
        if (!racing.enableSmartRaceSolver) {
            warnings.push("Parent farming is on but Smart Race Solver is off. Racing may not follow your goal epithets.")
        }
        if (!racing.enableFarmingFans) {
            warnings.push("Parent farming is on but fan farming is off. Extra fan races and fan-floor scoring may not run.")
        }
        if (hasParentFarmingTrainingDrift(settings)) {
            warnings.push(
                "Training settings differ from the active parent-farming preset. The bot will use your current training values until you re-apply the preset or start a run (which re-syncs from the preset).",
            )
        }
        if (hasParentFarmingForcedEpithetDrift(settings)) {
            warnings.push(
                "Forced epithets differ from the active parent-farming preset. Critical epithet routes may be skipped until you re-apply the preset or start a run.",
            )
        }
    }

    return warnings
}
