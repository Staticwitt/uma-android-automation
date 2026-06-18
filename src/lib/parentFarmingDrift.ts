import type { Settings } from "../context/BotStateContext"
import { resolveParentFarmingSettings } from "./parentFarmingResolver"
import { assessParentFarmingFeasibility, formatFeasibilityIssues } from "./parentFarmingFeasibility"
import { parseOwnedSupportCards } from "./recommendSupportDeck"
import { PARENT_FARMING_CHARACTER_BUNDLES } from "./parentFarmingCharacterBundles"
import { buildEpithetTiersFromRacing } from "./epithetTiers"
import { applyParentFarmingGoalPresetToRacing, findParentFarmingGoalPreset } from "./parentFarmingGoalPresets"

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

/** Preset expectations without restoring user-edited toggles (for drift detection). */
const resolveParentFarmingPresetExpectations = (settings: Settings): Settings =>
    resolveParentFarmingSettings(settings, { preserveUserPreferences: false })

/** Whether spark selection strategy differs from what the resolver would apply. */
export const hasParentFarmingSparkStrategyDrift = (settings: Settings): boolean => {
    if (!settings.racing.enableParentFarmingMode) return false
    const resolved = resolveParentFarmingPresetExpectations(settings)
    return settings.racing.sparkSelectionStrategy !== resolved.racing.sparkSelectionStrategy
}

/** Whether forced epithets differ from what the resolver would apply. */
export const hasParentFarmingForcedEpithetDrift = (settings: Settings): boolean => {
    if (!settings.racing.enableParentFarmingMode) return false
    const resolved = resolveParentFarmingPresetExpectations(settings)
    const current = parseStringList(settings.racing.smartRaceSolverForcedEpithets)
    const expected = parseStringList(resolved.racing.smartRaceSolverForcedEpithets)
    return !setsEqual(current, expected)
}

/** Whether parent-farming training fields differ from what the resolver would apply. */
export const hasParentFarmingTrainingDrift = (settings: Settings): boolean => {
    if (!settings.racing.enableParentFarmingMode) return false
    const resolved = resolveParentFarmingPresetExpectations(settings)
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

/** Whether support borrow order differs from the active bundle's expected list. */
export const hasParentFarmingSupportBorrowDrift = (settings: Settings): boolean => {
    if (!settings.racing.enableParentFarmingMode) return false
    const bundleKey = settings.racing.parentFarmingBundleKey
    if (!bundleKey) return false
    const bundle = PARENT_FARMING_CHARACTER_BUNDLES.find((b) => b.key === bundleKey)
    if (!bundle) return false
    const current = parseStringList(settings.racing.supportBorrowPreferredCards)
    return !arraysEqual(current, bundle.supportBorrowCards)
}

/** Whether solver fan weight / minimum fan target differ from the resolved parent-farming preset. */
export const hasParentFarmingSolverWeightDrift = (settings: Settings): boolean => {
    if (!settings.racing.enableParentFarmingMode) return false
    const resolved = resolveParentFarmingPresetExpectations(settings)
    try {
        const current = JSON.parse(settings.racing.smartRaceSolverWeights || "{}") as Record<string, number>
        const expected = JSON.parse(resolved.racing.smartRaceSolverWeights || "{}") as Record<string, number>
        return current.fanWeight !== expected.fanWeight || current.minimumFanTarget !== expected.minimumFanTarget
    } catch {
        return false
    }
}

/** Whether target epithet list differs from the resolved parent-farming preset. */
export const hasParentFarmingTargetEpithetDrift = (settings: Settings): boolean => {
    if (!settings.racing.enableParentFarmingMode) return false
    const resolved = resolveParentFarmingPresetExpectations(settings)
    const current = parseStringList(settings.racing.smartRaceSolverTargetEpithets)
    const expected = parseStringList(resolved.racing.smartRaceSolverTargetEpithets)
    return !arraysEqual(current, expected)
}

/** Whether forced epithet list differs from resolved preset (beyond the existing forced drift check scope). */
export const hasParentFarmingTargetWeightDrift = (settings: Settings): boolean => {
    if (!settings.racing.enableParentFarmingMode) return false
    const resolved = resolveParentFarmingPresetExpectations(settings)
    try {
        const current = JSON.parse(settings.racing.smartRaceSolverWeights || "{}") as Record<string, number>
        const expected = JSON.parse(resolved.racing.smartRaceSolverWeights || "{}") as Record<string, number>
        const keys = ["targetEpithetMultiplier", "raceCostPct", "minimumRaceGapTurns", "consecutiveRacePenalty", "hintWeight"]
        return keys.some((key) => current[key] !== expected[key])
    } catch {
        return false
    }
}

const tierMapsEqual = (left: Record<string, number>, right: Record<string, number>): boolean => {
    const leftKeys = Object.keys(left).sort()
    const rightKeys = Object.keys(right).sort()
    if (leftKeys.length !== rightKeys.length) return false
    return leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key])
}

/** Whether epithet tier multipliers differ from the resolved preset. */
export const hasParentFarmingEpithetTierDrift = (settings: Settings): boolean => {
    if (!settings.racing.enableParentFarmingMode) return false
    const resolved = resolveParentFarmingPresetExpectations(settings)
    return !tierMapsEqual(buildEpithetTiersFromRacing(settings.racing), buildEpithetTiersFromRacing(resolved.racing))
}

/** Whether legacy parent strategy differs from the resolved preset. */
export const hasParentFarmingLegacyStrategyDrift = (settings: Settings): boolean => {
    if (!settings.racing.enableParentFarmingMode) return false
    const resolved = resolveParentFarmingPresetExpectations(settings)
    return settings.racing.legacyParentSelectionStrategy !== resolved.racing.legacyParentSelectionStrategy
}

/** Whether quality target settings differ from the active goal preset defaults. */
export const hasParentFarmingQualityTargetDrift = (settings: Settings): boolean => {
    if (!settings.racing.enableParentFarmingMode) return false
    const presetKey = settings.racing.parentFarmingGoalPresetKey
    if (!presetKey) return false
    const preset = findParentFarmingGoalPreset(presetKey)
    if (!preset?.qualityTargetScore) return false
    const resolved = applyParentFarmingGoalPresetToRacing(settings.racing, preset)
    return (
        settings.racing.enableParentFarmingStopOnQualityTarget !== resolved.enableParentFarmingStopOnQualityTarget ||
        settings.racing.parentFarmingQualityTargetScore !== resolved.parentFarmingQualityTargetScore
    )
}

/** Whether auto-equip is on but no owned deck slots are saved. */
export const hasParentFarmingAutoEquipWarning = (settings: Settings): boolean => {
    if (!settings.racing.enableParentFarmingMode) return false
    if (!settings.racing.enableAutoEquipOwnedSupportDeck) return false
    return parseOwnedSupportCards(settings.racing.supportDeckOwnedCards).length === 0
}

/** Whether auto-borrow is on but the borrow priority list is empty. */
export const hasParentFarmingAutoBorrowListWarning = (settings: Settings): boolean => {
    if (!settings.racing.enableParentFarmingMode) return false
    if (!settings.racing.enableAutoBorrowSupportCard) return false
    try {
        const parsed = JSON.parse(settings.racing.supportBorrowPreferredCards || "[]")
        return !Array.isArray(parsed) || parsed.filter((name) => typeof name === "string" && name.length > 0).length === 0
    } catch {
        return true
    }
}
/** Whether auto-borrow is on but owned inventory is empty while a character preset is set. */
export const hasParentFarmingOwnedInventoryWarning = (settings: Settings): boolean => {
    if (!settings.racing.enableParentFarmingMode) return false
    if (!settings.racing.enableAutoBorrowSupportCard) return false
    if (!settings.racing.smartRaceSolverCharacterPreset) return false
    return parseOwnedSupportCards(settings.racing.ownedSupportCards).length === 0
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
        if (hasParentFarmingSparkStrategyDrift(settings)) {
            warnings.push(
                "Spark selection strategy differs from the active parent-farming preset. Inheritance picks may not match your goal until you re-apply the preset or start a run.",
            )
        }
        if (hasParentFarmingForcedEpithetDrift(settings)) {
            warnings.push(
                "Forced epithets differ from the active parent-farming preset. Critical epithet routes may be skipped until you re-apply the preset or start a run.",
            )
        }
        if (hasParentFarmingSupportBorrowDrift(settings)) {
            warnings.push(
                "Support borrow priority differs from the active character bundle. Re-apply the bundle or update borrow order to match.",
            )
        }
        if (hasParentFarmingTargetEpithetDrift(settings)) {
            warnings.push(
                "Target epithets differ from the active parent-farming preset. Re-sync from preset or re-apply your character setup.",
            )
        }
        if (hasParentFarmingTargetWeightDrift(settings)) {
            warnings.push(
                "Solver race-weight tuning differs from the active parent-farming preset (epithet multiplier, race cost, gaps). Re-sync from preset.",
            )
        }
        if (hasParentFarmingSolverWeightDrift(settings)) {
            warnings.push(
                "Solver fan weight or fan floor differs from the active parent-farming preset. Fan-weighted epithet scoring may not match your goal.",
            )
        }
        if (hasParentFarmingEpithetTierDrift(settings)) {
            warnings.push("Epithet priority tiers differ from the active preset. Re-sync to restore forced/primary weighting.")
        }
        if (hasParentFarmingLegacyStrategyDrift(settings)) {
            warnings.push("Legacy parent selection strategy differs from the active preset.")
        }
        if (hasParentFarmingQualityTargetDrift(settings)) {
            warnings.push("Multi-run quality target differs from the active goal preset default.")
        }
        if (hasParentFarmingAutoEquipWarning(settings)) {
            warnings.push("Auto-equip is on but no owned support slots are saved. Apply full deck or pick a character setup.")
        }
        if (hasParentFarmingAutoBorrowListWarning(settings)) {
            warnings.push("Auto-borrow is on but the friend borrow list is empty. Apply a setup or full deck.")
        }
        if (hasParentFarmingOwnedInventoryWarning(settings)) {
            warnings.push(
                "Auto-borrow is on but owned support inventory is empty. Add owned cards for better deck recommendations (friend borrow still runs).",
            )
        }
        warnings.push(...formatFeasibilityIssues(assessParentFarmingFeasibility(settings)))
    }

    return warnings
}

/** Whether any parent-farming reliability toggles differ from resolver defaults. */
export const formatParentFarmingReliabilitySummary = (settings: Settings): string => {
    const { racing } = settings
    if (!racing.enableParentFarmingMode) return ""
    const parts: string[] = []
    if (racing.enableParentFarmingFullUnattended) parts.push("full unattended")
    if (racing.enableParentFarmingColdStart) parts.push("cold start")
    if (racing.enableParentFarmingAutoDowngradeForcedEpithets) parts.push("auto-downgrade forced")
    if (racing.enableParentFarmingAdaptiveMultiRun) parts.push("adaptive multi-run")
    if (racing.enableParentFarmingLockPreset) parts.push("lock preset")
    return parts.length > 0 ? parts.join(" · ") : "defaults"
}
