import type { Settings } from "../context/BotStateContext"
import { PARENT_FARMING_DEFAULT_GOAL_PRESET_KEY } from "./parentFarmingConstants"
import { findParentFarmingGoalPreset } from "./parentFarmingGoalPresets"
import { enableParentFarmingMode as resolveEnableParentFarmingMode, resolveParentFarmingSettings } from "./parentFarmingResolver"
import { restoreParentFarmingSnapshot } from "./parentFarmingSnapshot"

/** Human-readable label for the settings bundle used by the UI and message log. */
export const PARENT_FARMING_MODE_LABEL = "Parent Farming Mode"

/** Short summary of what the preset changes. */
export const PARENT_FARMING_MODE_SUMMARY =
    "Enables Smart Race Solver, fan-weighted epithet routing, fan-farming fallback, stat/aptitude spark picking, goal-aligned training bias, safer career completion, skill-hint priority, and relaxed stat targets."

/**
 * Enables parent farming and resolves racing/training from stored keys or the default goal preset.
 */
export const applyParentFarmingPreset = (settings: Settings): Settings => {
    const hasStoredPreset = settings.racing.parentFarmingGoalPresetKey || settings.racing.parentFarmingBundleKey

    if (!hasStoredPreset) {
        const defaultPreset = findParentFarmingGoalPreset(PARENT_FARMING_DEFAULT_GOAL_PRESET_KEY)
        if (defaultPreset) {
            return resolveEnableParentFarmingMode({
                ...settings,
                racing: {
                    ...settings.racing,
                    parentFarmingGoalPresetKey: defaultPreset.key,
                    parentFarmingGoalPresetLabel: defaultPreset.label,
                    parentFarmingBundleKey: "",
                    parentFarmingBundleLabel: "",
                },
            }, { preserveUserPreferences: false })
        }
    }

    return resolveEnableParentFarmingMode(settings, { preserveUserPreferences: false })
}

/** Clears the mode marker without reverting the user's current settings. */
export const disableParentFarmingMode = (settings: Settings, options?: { revert?: boolean }): Settings => {
    if (options?.revert && settings.racing.parentFarmingSettingsSnapshot) {
        const restored = restoreParentFarmingSnapshot(settings, settings.racing.parentFarmingSettingsSnapshot)
        if (restored) return restored
    }

    return {
        ...settings,
        racing: {
            ...settings.racing,
            enableParentFarmingMode: false,
            parentFarmingGoalPresetKey: "",
            parentFarmingGoalPresetLabel: "",
            parentFarmingBundleKey: "",
            parentFarmingBundleLabel: "",
            parentFarmingResolverRevision: 0,
            parentFarmingSettingsSnapshot: "",
        },
    }
}

/** Re-applies parent-farming solver/training slices from stored keys without resetting user toggles. */
export const refreshParentFarmingSettings = (settings: Settings): Settings =>
    resolveParentFarmingSettings(settings, { preserveUserPreferences: true })
