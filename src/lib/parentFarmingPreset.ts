import type { Settings } from "../context/BotStateContext"
import { DEFAULT_WEIGHTS, OPTIMIZE_MODE_PRESETS, type WeightsMap } from "./solver/constants"

/** Human-readable label for the settings bundle used by the UI and message log. */
export const PARENT_FARMING_MODE_LABEL = "Parent Farming Mode"

/** Short summary of what the preset changes. */
export const PARENT_FARMING_MODE_SUMMARY = "Enables Smart Race Solver, fan-weighted epithet routing, fan-farming fallback, safer career completion, skill-hint priority, and relaxed stat targets."

/** Solver tuning for parent-farming runs: prefer race-heavy G1/fan/epithet value without fully force-racing every turn. */
export const PARENT_FARMING_SOLVER_WEIGHT_OVERRIDES: Partial<WeightsMap> = {
    ...OPTIMIZE_MODE_PRESETS.FANS_EPITAPH,
    targetEpithetMultiplier: 4.0,
    consecutiveRacePenalty: 2.0,
    raceCostPct: 75.0,
    includeOpAndPreOp: false,
    allowSummerRacing: false,
}

const parseWeights = (weightsJson: string | undefined): WeightsMap => {
    try {
        const parsed = JSON.parse(weightsJson || "{}")
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return { ...DEFAULT_WEIGHTS, ...parsed }
        }
    } catch {
        // Fall through to defaults.
    }
    return { ...DEFAULT_WEIGHTS }
}

/**
 * Builds the racing-slice changes for parent farming while preserving user-specific solver fields
 * such as character preset, aptitudes, target epithets, forced epithets, and manual locks.
 */
export const buildParentFarmingRacingSettings = (racing: Settings["racing"]): Partial<Settings["racing"]> => {
    const weights = parseWeights(racing.smartRaceSolverWeights)
    return {
        enableParentFarmingMode: true,
        enableFarmingFans: true,
        ignoreConsecutiveRaceWarning: true,
        daysToRunExtraRaces: 3,
        enableCompleteCareerOnFailure: true,
        enableForceRacing: false,
        enableUserInGameRaceAgenda: false,
        enableSmartRaceSolver: true,
        smartRaceSolverWeights: JSON.stringify({
            ...weights,
            ...PARENT_FARMING_SOLVER_WEIGHT_OVERRIDES,
        }),
    }
}

/**
 * Applies a cross-slice preset tuned for unattended parent farming. The preset intentionally keeps
 * character-specific solver choices and existing skill plans intact.
 */
export const applyParentFarmingPreset = (settings: Settings): Settings => ({
    ...settings,
    general: {
        ...settings.general,
        enableStopBeforeFinals: false,
    },
    racing: {
        ...settings.racing,
        ...buildParentFarmingRacingSettings(settings.racing),
    },
    skills: {
        ...settings.skills,
        enableSkillPointCheck: false,
    },
    training: {
        ...settings.training,
        maximumFailureChance: Math.min(settings.training.maximumFailureChance, 15),
        preferredDistanceOverride: "Auto",
        enablePrioritizeSkillHints: true,
        disableStatTargets: true,
    },
})

/** Clears the mode marker without reverting the user's current settings. */
export const disableParentFarmingMode = (settings: Settings): Settings => ({
    ...settings,
    racing: {
        ...settings.racing,
        enableParentFarmingMode: false,
    },
})
