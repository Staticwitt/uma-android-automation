import type { Settings } from "../context/BotStateContext"
import { DEFAULT_WEIGHTS, OPTIMIZE_MODE_PRESETS, type WeightsMap } from "./solver/constants"
import { PARENT_FARMING_SPARK_SELECTION_STRATEGY } from "./sparkSelection"
import { PARENT_FARMING_LEGACY_PARENT_SELECTION_STRATEGY } from "./legacyParentSelection"
import { buildEpithetTiersFromLists } from "./epithetTiers"

/** Default goal when parent farming is enabled without a stored preset key. */
export const PARENT_FARMING_DEFAULT_GOAL_PRESET_KEY = "g1-fans"

/**
 * Bump when preset definitions change so `applyMigrations` re-resolves active parent-farming profiles.
 */
export const PARENT_FARMING_RESOLVER_REVISION = 8

/** Solver tuning for parent-farming runs: prefer race-heavy G1/fan/epithet value without fully force-racing every turn. */
export const PARENT_FARMING_SOLVER_WEIGHT_OVERRIDES: Partial<WeightsMap> = {
    ...OPTIMIZE_MODE_PRESETS.FANS_EPITAPH,
    targetEpithetMultiplier: 4.0,
    consecutiveRacePenalty: 2.0,
    minimumRaceGapTurns: 1,
    raceCostPct: 75.0,
    includeOpAndPreOp: false,
    allowSummerRacing: false,
    minWinRateGuard: 0.72,
    assumedRaceWinRate: 0.92,
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
    enableParentRunArchive: true,
    enableParentFarmingStopOnForcedEpithetFail: true,
    sparkSelectionStrategy: PARENT_FARMING_SPARK_SELECTION_STRATEGY,
    enableAutoBorrowSupportCard: true,
    enableAutoEquipOwnedSupportDeck: true,
    enableAutoStartCareer: true,
    enableAutoSelectLegacyParents: true,
    legacyParentSelectionStrategy: PARENT_FARMING_LEGACY_PARENT_SELECTION_STRATEGY,
    enableParentFarmingFullUnattended: true,
    enableParentFarmingAutoDowngradeForcedEpithets: true,
    enableParentFarmingAdaptiveMultiRun: true,
    enableParentFarmingLockPreset: false,
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
    const parseStringList = (json: string | undefined): string[] => {
        try {
            const parsed = JSON.parse(json || "[]")
            return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string" && value.length > 0) : []
        } catch {
            return []
        }
    }
    const forced = parseStringList(racing.smartRaceSolverForcedEpithets)
    const targets = parseStringList(racing.smartRaceSolverTargetEpithets)
    return {
        ...PARENT_FARMING_GOAL_RACING_BASE,
        smartRaceSolverWeights: JSON.stringify({
            ...weights,
            ...PARENT_FARMING_SOLVER_WEIGHT_OVERRIDES,
        }),
        smartRaceSolverEpithetTiers: JSON.stringify(buildEpithetTiersFromLists(forced, targets)),
    }
}
