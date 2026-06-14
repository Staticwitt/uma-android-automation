import type { Settings } from "../context/BotStateContext"
import { DEFAULT_WEIGHTS, OPTIMIZE_MODE_PRESETS, type WeightsMap } from "./solver/constants"
import { PARENT_FARMING_SPARK_SELECTION_STRATEGY } from "./sparkSelection"

/** Default goal when parent farming is enabled without a stored preset key. */
export const PARENT_FARMING_DEFAULT_GOAL_PRESET_KEY = "g1-fans"

/**
 * Bump when preset definitions change so `applyMigrations` re-resolves active parent-farming profiles.
 */
export const PARENT_FARMING_RESOLVER_REVISION = 1

/** Solver tuning for parent-farming runs: prefer race-heavy G1/fan/epithet value without fully force-racing every turn. */
export const PARENT_FARMING_SOLVER_WEIGHT_OVERRIDES: Partial<WeightsMap> = {
    ...OPTIMIZE_MODE_PRESETS.FANS_EPITAPH,
    targetEpithetMultiplier: 4.0,
    consecutiveRacePenalty: 2.0,
    minimumRaceGapTurns: 0,
    raceCostPct: 75.0,
    includeOpAndPreOp: false,
    allowSummerRacing: false,
}

/** Racing flags shared by parent farming mode and goal-preset application. */
export const PARENT_FARMING_GOAL_RACING_BASE: Partial<Settings["racing"]> = {
    enableParentFarmingMode: true,
    enableSmartRaceSolver: true,
    enableForceRacing: false,
    enableUserInGameRaceAgenda: false,
    enableFarmingFans: true,
    ignoreConsecutiveRaceWarning: true,
    daysToRunExtraRaces: 3,
    enableCompleteCareerOnFailure: true,
    enableParentRunSummary: true,
    sparkSelectionStrategy: PARENT_FARMING_SPARK_SELECTION_STRATEGY,
}

/** Shared parent-farming training defaults applied before goal-specific overrides. */
export const buildParentFarmingTrainingSettings = (training: Settings["training"]): Partial<Settings["training"]> => ({
    maximumFailureChance: Math.min(training.maximumFailureChance, 15),
    preferredDistanceOverride: "Auto",
    enablePrioritizeSkillHints: true,
    disableStatTargets: true,
})

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

/** Builds racing-slice solver weights and flags while preserving character-specific solver fields. */
export const buildParentFarmingRacingSettings = (racing: Settings["racing"]): Partial<Settings["racing"]> => {
    const weights = parseWeights(racing.smartRaceSolverWeights)
    return {
        ...PARENT_FARMING_GOAL_RACING_BASE,
        smartRaceSolverWeights: JSON.stringify({
            ...weights,
            ...PARENT_FARMING_SOLVER_WEIGHT_OVERRIDES,
        }),
    }
}
