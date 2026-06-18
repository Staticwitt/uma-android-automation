import type { Settings } from "../context/BotStateContext"

/**
 * Racing keys the user can change in Parent Farming / Racing settings that must survive
 * preset re-resolve on load, bot start, and migration — not only explicit preset apply.
 */
export const PARENT_FARMING_USER_PREFERENCE_RACING_KEYS: ReadonlyArray<keyof Settings["racing"]> = [
    "enableAutoBorrowSupportCard",
    "enableAutoEquipOwnedSupportDeck",
    "enableAutoStartCareer",
    "enableAutoSelectLegacyParents",
    "legacyParentSelectionStrategy",
    "legacyParentPreferredPair",
    "supportBorrowPreferredCards",
    "ownedSupportCards",
    "supportDeckOwnedCards",
    "parentFarmingSupportBorrowOverrides",
    "enableParentFarmingMultiRun",
    "parentFarmingMultiRunCount",
    "enableParentFarmingStopOnQualityTarget",
    "parentFarmingQualityTargetScore",
    "enableParentFarmingKeepBestRun",
    "enableParentFarmingStopOnForcedEpithetFail",
    "enableParentFarmingBorrowRotation",
    "enableParentFarmingFullUnattended",
    "enableParentFarmingLockPreset",
    "enableParentFarmingAutoDowngradeForcedEpithets",
    "enableParentFarmingAdaptiveMultiRun",
    "enableParentFarmingGoalQueue",
    "parentFarmingGoalQueue",
    "parentFarmingGoalQueueResolved",
    "enableParentFarmingAutoApplyOwnedDeck",
    "enableParentFarmingLiveMessageLog",
    "enableParentFarmingAutoFeasibilityPreview",
    "enableParentFarmingColdStart",
    "enableParentFarmingGameDataFactorOcr",
    "enableParentFarmingHarvestReport",
    "enableParentFarmingTrainingOptimizer",
    "enableParentFarmingRecoveryCoach",
    "enableParentFarmingBorrowIntelligence",
    "enableParentFarmingAutoScenario",
    "parentFarmingBreedingPlan",
    "enableParentFarmingBreedingPlan",
    "parentFarmingTargetFactorSkills",
    "sparkSelectionStrategy",
    "enableCaratRaceRetry",
    "maxCaratRaceRetriesPerRun",
    "enableForceRacing",
    "enableUserInGameRaceAgenda",
    "enableFarmingFans",
    "ignoreConsecutiveRaceWarning",
    "daysToRunExtraRaces",
    "enableCompleteCareerOnFailure",
    "enableParentRunSummary",
    "enableParentRunArchive",
    "enableSmartRaceSolver",
]

/** Restores user-edited racing toggles and lists after a preset re-resolve. */
export const preserveParentFarmingUserRacing = (
    seed: Settings["racing"],
    resolved: Settings["racing"],
): Settings["racing"] => {
    const next = { ...resolved }
    for (const key of PARENT_FARMING_USER_PREFERENCE_RACING_KEYS) {
        const value = seed[key]
        if (value !== undefined) {
            ;(next as Record<string, unknown>)[key as string] = value
        }
    }
    return next
}
