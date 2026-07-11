import { createContext, useState, useMemo, useCallback, useContext, useEffect, type ReactNode } from "react"
import { startTiming } from "../lib/performanceLogger"
import { createDatingCardSchedule, type DatingCardSchedule } from "../lib/datingSchedule"
import { skillPlanSettingsPages } from "../pages/SkillPlanSettings/config"

/**
 * Configuration for an individual skill plan (e.g. preFinals, careerComplete).
 */
interface SkillPlanSettingsConfig {
    /** Whether this skill plan is enabled. */
    enabled: boolean
    /** The spending strategy for this plan. */
    strategy: string
    /** Whether to buy negative skills. */
    enableBuyNegativeSkills: boolean
    /** The serialized skill plan data (comma-separated skill IDs). */
    plan: string
    /** Comma-separated skill IDs that should never be purchased by this plan, even when ranked highly by a strategy. */
    blacklist: string
    /** When true, all green skills are excluded from this plan's purchases. */
    excludeGreenSkills: boolean
    /** When true, all red skills (debuffs like Intimidate, Speed Eater) are excluded from this plan's purchases. */
    excludeRedSkills: boolean
    /** When true, all inherited unique (legacy) skills are excluded from this plan's purchases, even if listed in the plan. */
    excludeUniqueSkills: boolean
}

/**
 * The complete application settings interface.
 * Organized into category-specific sub-objects for general, racing, skills,
 * training events, misc, training, stat targets, OCR, and debug settings.
 */
export interface Settings {
    // General settings
    general: {
        scenario: string
        enableCraneGameAttempt: boolean
        enableSwipeBasedScrolling: boolean
        enableStopBeforeFinals: boolean
        enableStopAtDate: boolean
        stopAtDates: string[]
        enableDatingSchedule: boolean
        enableRecreationCatchUp: boolean
        /** Per-card recreation schedules. Each card's rows in the "Choose Recreation Partner" dialog are matched by OCR'd name; a blank cardName matches any row no other entry claimed. */
        datingCards: DatingCardSchedule[]
        waitDelay: number
        dialogWaitDelay: number
        /** Log a Wait Delay calibration summary (measured loading-wait stats + a tuning suggestion) at the end of each run. */
        enableDelayCalibrationTelemetry: boolean
        /** JSON map of action key -> override delay in seconds, applied in place of the relevant hardcoded default (e.g. `"tapFollowUpDelay"`). */
        delayOverrides: string
    }

    // Racing settings
    racing: {
        enableParentFarmingMode: boolean
        enableParentRunSummary: boolean
        /** Persist completed parent runs locally for history and comparison. */
        enableParentRunArchive: boolean
        enableFarmingFans: boolean
        ignoreConsecutiveRaceWarning: boolean
        ignoreLowEnergyRacingBlock: boolean
        /** Minimum energy % required to start optional (extra) races. 0 = disabled; hard requirements always bypass. */
        minimumEnergyForOptionalRacing: number
        daysToRunExtraRaces: number
        disableRaceRetries: boolean
        enableFreeRaceRetry: boolean
        enableCaratRaceRetry: boolean
        maxCaratRaceRetriesPerRun: number
        enableCompleteCareerOnFailure: boolean
        enableStopOnMandatoryRaces: boolean
        enableForceRacing: boolean
        enableG1DayPreference: boolean
        g1DayMinRainbowCount: number
        enableUserInGameRaceAgenda: boolean
        limitRacesToInGameAgenda: boolean
        skipSummerTrainingForAgenda: boolean
        selectedUserAgenda: string
        customAgendaTitle: string
        juniorYearRaceStrategy: string
        originalRaceStrategy: string
        enablePerDistanceStrategy: boolean
        juniorYearPerDistanceStrategies: Record<string, string>
        originalPerDistanceStrategies: Record<string, string>
        /** JSON array of named `RaceStrategyPreset` bundles the user saved for quick manual reuse. */
        raceStrategyPresets: string
        // Smart Race Solver — beam-search-based race scheduler driven by epithet completions.
        // The static bundled assets (`racesData`, `epithetsData`, `characterPresetsData`) are
        // intentionally NOT in this interface: they're written once at bootstrap by
        // `populateSolverData` and read directly from SQLite by Kotlin. Round-tripping them
        // through React state inflated re-renders by ~160 KB and made every toggle re-write the
        // blobs to SQLite via the auto-save effect.
        enableSmartRaceSolver: boolean
        /** Selects a hand-authored turn-by-turn career plan that bypasses the solver entirely. Empty string = disabled (normal solver behavior). */
        fixedSchedule: string
        /** Auto-select a character preset by fuzzy-matching the OCR'd trainee name, when no preset is manually set. */
        enableAutoDetectCharacterPreset: boolean
        /** Minimum Jaro-Winkler match confidence (0-100) required for [enableAutoDetectCharacterPreset] to apply a match. */
        autoDetectCharacterPresetConfidence: number
        smartRaceSolverCharacterPreset: string
        smartRaceSolverAptitudes: string
        smartRaceSolverTargetEpithets: string
        smartRaceSolverForcedEpithets: string
        /** JSON map of epithet name → tier multiplier (forced 2×, primary 1.5×). Auto-built from lists when empty. */
        smartRaceSolverEpithetTiers: string
        smartRaceSolverManualLocks: string
        smartRaceSolverWeights: string
        /** Inheritance spark picker: Default, StatAndAptitude, SkillHints, or Balanced. */
        sparkSelectionStrategy: string
        /** Tap Start Career on final confirmation when parent farming mode is on. */
        enableAutoStartCareer: boolean
        /** Run multiple parent-farming careers in one bot session. */
        enableParentFarmingMultiRun: boolean
        /** Target careers per session (0 = until manually stopped). */
        parentFarmingMultiRunCount: number
        /** Stop multi-run early when parent quality score meets [parentFarmingQualityTargetScore]. */
        enableParentFarmingStopOnQualityTarget: boolean
        /** Minimum parent quality score (0–100) to stop multi-run early. */
        parentFarmingQualityTargetScore: number
        /** Log session-best run when multi-run completes. */
        enableParentFarmingKeepBestRun: boolean
        /** Stop multi-run when a forced epithet route becomes unreachable or is missed. */
        enableParentFarmingStopOnForcedEpithetFail: boolean
        /** Rotate friend borrow priority each run in a multi-run session. */
        enableParentFarmingBorrowRotation: boolean
        /** Resume a multi-run session at its last completed generation after a bot restart, if the breeding plan is unchanged. */
        enableParentFarmingResumeSession: boolean
        /** Fall back to the previous generation's trainee when generation-farm auto-navigation can't find the next one. */
        enableParentFarmingNavFallbackTrainee: boolean
        /** End-to-end unattended: career-complete skills + carat race retry. */
        enableParentFarmingFullUnattended: boolean
        /** Re-sync preset-owned fields when conflicting toggles are changed. */
        enableParentFarmingLockPreset: boolean
        /** Downgrade infeasible forced epithets to targets at resolve time. */
        enableParentFarmingAutoDowngradeForcedEpithets: boolean
        /** Relax forced epithets between multi-run attempts after a forced-route failure. */
        enableParentFarmingAdaptiveMultiRun: boolean
        /** Cycle through different goal presets/bundles each multi-run career. */
        enableParentFarmingGoalQueue: boolean
        /** JSON array of `{ type: "bundle"|"preset", key: string }` queue items. */
        parentFarmingGoalQueue: string
        /** Pre-resolved Kotlin patches for each queue item (written when queue is saved). */
        parentFarmingGoalQueueResolved: string
        /** When applying a character bundle, auto-equip saved owned deck if 4+ cards are saved. */
        enableParentFarmingAutoApplyOwnedDeck: boolean
        /** Emit throttled parent-farming progress lines to the in-app message log. */
        enableParentFarmingLiveMessageLog: boolean
        /** Auto-run solver feasibility preview when parent setup changes. */
        enableParentFarmingAutoFeasibilityPreview: boolean
        /** Score spark/parent OCR against bundled skills database. */
        enableParentFarmingGameDataFactorOcr: boolean
        /** OCR inherited skills at career end for harvest verdict. */
        enableParentFarmingHarvestReport: boolean
        /** Bias training stat priorities toward weak parent aptitudes. */
        enableParentFarmingTrainingOptimizer: boolean
        /** When the Smart Race Solver recommends training, skip the fan-farming interval race fallback instead of racing anyway. */
        enableParentFarmingRespectSolverTraining: boolean
        /** Surface dead-epithet recovery guidance mid-run. */
        enableParentFarmingRecoveryCoach: boolean
        /** Scroll friend borrow lists when visible slots fail OCR. */
        enableParentFarmingBorrowIntelligence: boolean
        /** Sync general.scenario from URA/Unity goal presets before bot start. */
        enableParentFarmingAutoScenario: boolean
        /** Multi-generation breeding plan JSON (generations with target factors). */
        parentFarmingBreedingPlan: string
        /** Apply breeding plan as the multi-run goal queue. */
        enableParentFarmingBreedingPlan: boolean
        /** JSON array of target inherited skill names for harvest OCR matching. */
        parentFarmingTargetFactorSkills: string
        /** JSON snapshot for reverting settings when exiting parent farming mode. */
        parentFarmingSettingsSnapshot: string
        /** Auto-select the legacy parent pair at career selection (in-game Auto-Select or preferred pair OCR). */
        enableAutoSelectLegacyParents: boolean
        /** Open the friend borrow picker at career selection and tap the first OCR match from [supportBorrowPreferredCards]. */
        enableAutoBorrowSupportCard: boolean
        /** Tap the Support Formation screen's own Auto-Select to fill owned support deck slots at career selection. */
        enableAutoEquipSupportCards: boolean
        /** OCR scoring strategy when no preferred parent names are configured. */
        legacyParentSelectionStrategy: string
        /** JSON array of up to two preferred legacy parent names for OCR pair selection. */
        legacyParentPreferredPair: string
        /** JSON object of tunable weight overrides for the "StatAndAptitude" legacy parent strategy. Empty/missing falls back to defaults. */
        legacyParentStatAptitudeWeights: string
        /** JSON array of preferred support card names (first OCR match wins). */
        supportBorrowPreferredCards: string
        /** Friend borrow priority sort: "goal" (goal-fit scoring, default) or "raceBonus" (pure in-kit race bonus). */
        supportBorrowSortMode: string
        /** JSON array of support cards the user owns (filters recommendations). */
        ownedSupportCards: string
        /** JSON array of four owned support slots from the last applied deck recommendation. */
        supportDeckOwnedCards: string
        /** Per-bundle user overrides for support borrow order (`bundleKey` → names). */
        parentFarmingSupportBorrowOverrides: string
        /** JSON object of card name → limit break level (0-4) for deck/borrow scoring. */
        supportCardLimitBreaks: string
        /** Fallback limit break level (0-4) for cards not listed in [supportCardLimitBreaks]. */
        supportCardLimitBreakDefault: number
        /** Last applied parent goal preset / bundle keys for run summaries. */
        parentFarmingGoalPresetKey: string
        parentFarmingGoalPresetLabel: string
        parentFarmingBundleKey: string
        parentFarmingBundleLabel: string
        /** Bumped when preset definitions change; triggers re-resolve on settings load. */
        parentFarmingResolverRevision: number
    }

    // Skill Settings
    skills: {
        enableSkillPointCheck: boolean
        skillPointCheck: number
        preferredRunningStyle: string
        preferredTrackDistance: string
        preferredTrackSurface: string
        prioritizeRecoveryForStamina: boolean
        plans: Record<string, SkillPlanSettingsConfig>
    }

    // Training Event settings
    trainingEvent: {
        enablePrioritizeEnergyOptions: boolean
        enableAutomaticOCRRetry: boolean
        ocrConfidence: number
        enableHideOCRComparisonResults: boolean
        specialEventOverrides: Record<string, { selectedOption: string; requiresConfirmation: boolean; enableEnergyBasedSelection?: boolean }>
        characterEventOverrides: Record<string, number>
        supportEventOverrides: Record<string, number>
        scenarioEventOverrides: Record<string, number>
    }

    // Misc settings
    misc: {
        enableSettingsDisplay: boolean
        formattedSettingsString: string
        currentProfileName: string
        messageLogFontSize: number
    }

    // Training settings
    training: {
        trainingBlacklist: string[]
        statPrioritization: string[]
        eventChoiceStatPriority: string[]
        summerTrainingStatPriority: string[]
        maximumFailureChance: number
        disableTrainingOnMaxedStat: boolean
        enableRainbowTrainingBonus: boolean
        enablePrioritizeNearMaxFriendship: boolean
        enableBondEfficiencyCapping: boolean
        preferredDistanceOverride: string
        mustRestBeforeSummer: boolean
        enableEnergyBanking: boolean
        energyBankingThreshold: number
        energyBankingLookaheadTurns: number
        minimumMoodForTraining: string
        enableRiskyTraining: boolean
        riskyTrainingMinStatGain: number
        riskyTrainingMaxFailureChance: number
        trainWitDuringFinale: boolean
        enablePrioritizeSkillHints: boolean
        enableTrainingLevelWeighting: boolean
        /** Scale the stamina stat target by running style (Front Runners need less, End Closers more). Off by default. */
        enableRunningStyleStaminaAdjustment: boolean
        disableStatTargets: boolean
        enableGoalRaceStatBias: boolean
        goalRaceStatBiasLookaheadTurns: number
        enableTrainingAnalysisValidation: boolean
        enableYoloStatDetection: boolean
        classicMilestonePercent: number
        seniorMilestonePercent: number
        enableUnityCupTrainOnlyMode: boolean
        /** When enabled, deliberately seeks out and challenges the pink-highlighted "Elite Team" opponent (when offered) at Unity Cup's 4th Preseason race, instead of the default race-prediction-favorability logic. Beating it unlocks a stronger Team Zenith in the Finals with better rewards. */
        preferEliteTeamOpponent: boolean
        sparkTraitMaxRerolls: number
        sparkTraitMinStars: number
        /** OCR stat-value validation cap. 0 = auto (1800). Values above this are rejected as misreads. */
        manualStatCap: number
        /** Per-scenario blacklist for URA Finale (overrides global blacklist when non-empty). */
        "trainingBlacklist_URA Finale": string[]
        /** Per-scenario blacklist for Unity Cup (overrides global blacklist when non-empty). */
        "trainingBlacklist_Unity Cup": string[]
        /** Per-scenario blacklist for Trackblazer (overrides global blacklist when non-empty). */
        "trainingBlacklist_Trackblazer": string[]
    }

    // Training Stat Target settings
    trainingStatTarget: {
        // Sprint
        trainingSprintStatTarget_speedStatTarget: number
        trainingSprintStatTarget_staminaStatTarget: number
        trainingSprintStatTarget_powerStatTarget: number
        trainingSprintStatTarget_gutsStatTarget: number
        trainingSprintStatTarget_witStatTarget: number

        // Mile
        trainingMileStatTarget_speedStatTarget: number
        trainingMileStatTarget_staminaStatTarget: number
        trainingMileStatTarget_powerStatTarget: number
        trainingMileStatTarget_gutsStatTarget: number
        trainingMileStatTarget_witStatTarget: number

        // Medium
        trainingMediumStatTarget_speedStatTarget: number
        trainingMediumStatTarget_staminaStatTarget: number
        trainingMediumStatTarget_powerStatTarget: number
        trainingMediumStatTarget_gutsStatTarget: number
        trainingMediumStatTarget_witStatTarget: number

        // Long
        trainingLongStatTarget_speedStatTarget: number
        trainingLongStatTarget_staminaStatTarget: number
        trainingLongStatTarget_powerStatTarget: number
        trainingLongStatTarget_gutsStatTarget: number
        trainingLongStatTarget_witStatTarget: number
    }

    // Debug settings
    debug: {
        enableDebugMode: boolean
        ocrThreshold: number
        templateMatchConfidence: number
        templateMatchCustomScale: number
        enableAutoDisplayProfileTuning: boolean
        debugMode_startTemplateMatchingTest: boolean
        debugMode_startSingleTrainingOCRTest: boolean
        debugMode_startComprehensiveTrainingOCRTest: boolean
        debugMode_startRaceListDetectionTest: boolean
        debugMode_startMainScreenUpdateTest: boolean
        debugMode_startSkillListBuyTest: boolean
        debugMode_startScrollBarDetectionTest: boolean
        debugMode_startTrackblazerRaceSelectionTest: boolean
        debugMode_startTrackblazerInventorySyncTest: boolean
        debugMode_startTrackblazerBuyItemsTest: boolean
        debugMode_startTrackblazerShopClickDiagnosticTest: boolean
        enableScreenRecording: boolean
        recordingBitRate: number
        recordingFrameRate: number
        recordingResolutionScale: number
        enableRemoteLogViewer: boolean
        remoteLogViewerPort: number
        enableMessageIdDisplay: boolean
        overlayButtonSizeDP: number
    }

    // Discord settings
    discord: {
        enableDiscordNotifications: boolean
        enableDiscordEmbeds: boolean
        enableDiscordLiveStatus: boolean
        enableDiscordRaceAlerts: boolean
        enableDiscordWinRateGuardAlerts: boolean
        discordLiveStatusTurnInterval: number
        discordToken: string
        discordUserID: string
        /** Fan counts that trigger a Discord DM when crossed during a run (comma-separated, e.g. "10000,50000,100000"). */
        fanMilestones: string
        /** Send a Discord DM after each race with the result (win/loss) and current streak. */
        enableRaceMomentumNotifications: boolean
        /** Send a Discord DM at key scenario milestones (Unity Cup rounds, URA Finale duels). */
        enableScenarioProgressPings: boolean
    }

    // On-device docs chatbot settings
    chat: {
        enableAskTheDocs: boolean
    }

    // Scenario specific overrides
    scenarioOverrides: {
        trackblazerConsecutiveRacesLimit: number
        /** The mood the trainee must be strictly below before Trackblazer recovers mood: GOOD (eager), NORMAL (default), or BAD (rarely). */
        trackblazerMoodRecoveryFloor: string
        trackblazerEnergyThreshold: number
        trackblazerForceTrainEnergyFloor: number
        trackblazerShopCheckGrades: string[]
        trackblazerSkipRiskyCharmTrainingBelowGain: number
        trackblazerSkipBadMoodItemsBelowGain: number
        trackblazerMaxRetriesPerRace: number
        trackblazerWhistleForcesTraining: boolean
        trackblazerRetryRacesBeforeFinalGrades: string[]
        trackblazerEnableIrregularTraining: boolean
        trackblazerIrregularTrainingMinStatGain: number
        trackblazerIrregularTrainingRaceLookahead: number
        trackblazerEnableMegaphoneForceRaceForecast: boolean
        trackblazerMegaphoneForceRaceForecastThreshold: number
        trackblazerEnableMegaphoneTierOverwrite: boolean
        trackblazerMegaphoneTierOverwriteMinGain: number
        trackblazerMegaphoneSurplusBurnReserve: number
        trackblazerExcludedItems: string[]
        trackblazerShopCheckFrequency: number
        trackblazerPreferredDistances: string[]
        trackblazerPreferredSurfaces: string[]
        trackblazerEnergyItemReserve: number
        trackblazerCupcakeReserve: number
        trackblazerMasterHammerFinaleReserve: number
        trackblazerArtisanHammerMinStockForG3: number
        trackblazerArtisanHammerMinStockForG2: number
        trackblazerGlowStickFinalReserve: number
        trackblazerGlowStickMinFans: number
        trackblazerValueAwareShopping: boolean
        unityCupBurstMaxFailureChance: number
    }
}

// Set the default settings.
export const defaultSettings: Settings = {
    general: {
        scenario: "",
        enableCraneGameAttempt: false,
        enableSwipeBasedScrolling: false,
        enableStopBeforeFinals: false,
        enableStopAtDate: false,
        stopAtDates: ["Senior January Early"],
        enableDatingSchedule: false,
        enableRecreationCatchUp: true,
        datingCards: [createDatingCardSchedule("siriusSenior")],
        waitDelay: 0.5,
        dialogWaitDelay: 0.5,
        enableDelayCalibrationTelemetry: false,
        delayOverrides: "{}",
    },
    racing: {
        enableParentFarmingMode: false,
        enableParentRunSummary: true,
        enableParentRunArchive: true,
        enableFarmingFans: false,
        ignoreConsecutiveRaceWarning: false,
        ignoreLowEnergyRacingBlock: false,
        minimumEnergyForOptionalRacing: 0,
        daysToRunExtraRaces: 5,
        disableRaceRetries: false,
        enableFreeRaceRetry: false,
        enableCaratRaceRetry: false,
        maxCaratRaceRetriesPerRun: 5,
        enableCompleteCareerOnFailure: false,
        enableStopOnMandatoryRaces: false,
        enableForceRacing: false,
        enableG1DayPreference: false,
        g1DayMinRainbowCount: 2,
        enableUserInGameRaceAgenda: false,
        limitRacesToInGameAgenda: true,
        skipSummerTrainingForAgenda: false,
        selectedUserAgenda: "Agenda 1",
        customAgendaTitle: "",
        juniorYearRaceStrategy: "Default",
        originalRaceStrategy: "Default",
        enablePerDistanceStrategy: false,
        juniorYearPerDistanceStrategies: { Short: "Default", Mile: "Default", Medium: "Default", Long: "Default" },
        originalPerDistanceStrategies: { Short: "Default", Mile: "Default", Medium: "Default", Long: "Default" },
        raceStrategyPresets: "[]",
        enableSmartRaceSolver: false,
        fixedSchedule: "",
        enableAutoDetectCharacterPreset: false,
        autoDetectCharacterPresetConfidence: 85,
        smartRaceSolverCharacterPreset: "Special Week",
        smartRaceSolverAptitudes: JSON.stringify({
            Sprint: "F",
            Mile: "C",
            Medium: "A",
            Long: "A",
            Turf: "A",
            Dirt: "G",
        }),
        smartRaceSolverTargetEpithets: "[]",
        smartRaceSolverForcedEpithets: "[]",
        smartRaceSolverEpithetTiers: "",
        smartRaceSolverManualLocks: "{}",
        sparkSelectionStrategy: "Default",
        enableAutoStartCareer: false,
        enableParentFarmingMultiRun: false,
        parentFarmingMultiRunCount: 3,
        enableParentFarmingStopOnQualityTarget: false,
        parentFarmingQualityTargetScore: 80,
        enableParentFarmingKeepBestRun: true,
        enableParentFarmingStopOnForcedEpithetFail: false,
        enableParentFarmingBorrowRotation: false,
        enableParentFarmingResumeSession: true,
        enableParentFarmingNavFallbackTrainee: false,
        enableParentFarmingFullUnattended: true,
        enableParentFarmingLockPreset: false,
        enableParentFarmingAutoDowngradeForcedEpithets: true,
        enableParentFarmingAdaptiveMultiRun: true,
        enableParentFarmingGoalQueue: false,
        parentFarmingGoalQueue: "[]",
        parentFarmingGoalQueueResolved: "[]",
        enableParentFarmingAutoApplyOwnedDeck: true,
        enableParentFarmingLiveMessageLog: true,
        enableParentFarmingAutoFeasibilityPreview: true,
        enableParentFarmingGameDataFactorOcr: true,
        enableParentFarmingHarvestReport: true,
        enableParentFarmingTrainingOptimizer: true,
        enableParentFarmingRespectSolverTraining: false,
        enableParentFarmingRecoveryCoach: true,
        enableParentFarmingBorrowIntelligence: true,
        enableParentFarmingAutoScenario: true,
        parentFarmingBreedingPlan: "[]",
        enableParentFarmingBreedingPlan: false,
        parentFarmingTargetFactorSkills: "[]",
        parentFarmingSettingsSnapshot: "",
        enableAutoSelectLegacyParents: false,
        enableAutoBorrowSupportCard: false,
        enableAutoEquipSupportCards: false,
        legacyParentSelectionStrategy: "Default",
        legacyParentPreferredPair: "[]",
        legacyParentStatAptitudeWeights: "{}",
        supportBorrowPreferredCards: "[]",
        supportBorrowSortMode: "goal",
        ownedSupportCards: "[]",
        supportDeckOwnedCards: "[]",
        parentFarmingSupportBorrowOverrides: "{}",
        supportCardLimitBreaks: "{}",
        supportCardLimitBreakDefault: 4,
        parentFarmingGoalPresetKey: "",
        parentFarmingGoalPresetLabel: "",
        parentFarmingBundleKey: "",
        parentFarmingBundleLabel: "",
        parentFarmingResolverRevision: 0,
        smartRaceSolverWeights: JSON.stringify({
            raceValue: 1.0,
            epithetValue: 1.0,
            targetEpithetMultiplier: 3.0,
            statWeight: 1.0,
            spWeight: 1.0,
            hintWeight: 8.0,
            consecutiveRacePenalty: 3.0,
            summerPenalty: 5.0,
            raceBonusPct: 50.0,
            raceCostPct: 100.0,
            fanWeight: 0.0,
            minimumFanTarget: 0,
            minimumRaceGapTurns: 0,
            aptitudeThreshold: "C",
            includeOpAndPreOp: false,
            allowSummerRacing: false,
        }),
    },
    skills: {
        enableSkillPointCheck: false,
        skillPointCheck: 750,
        preferredRunningStyle: "inherit",
        preferredTrackDistance: "inherit",
        preferredTrackSurface: "no_preference",
        prioritizeRecoveryForStamina: true,
        plans: Object.keys(skillPlanSettingsPages).reduce(
            (acc, curr) => {
                acc[curr] = {
                    enabled: false,
                    strategy: "default",
                    enableBuyNegativeSkills: false,
                    plan: "",
                    blacklist: "",
                    excludeGreenSkills: false,
                    excludeRedSkills: false,
                    excludeUniqueSkills: false,
                }
                return acc
            },
            {} as Record<string, SkillPlanSettingsConfig>
        ),
    },
    trainingEvent: {
        enablePrioritizeEnergyOptions: false,
        enableAutomaticOCRRetry: true,
        ocrConfidence: 90,
        enableHideOCRComparisonResults: true,
        specialEventOverrides: {
            "New Year's Resolutions": {
                selectedOption: "Option 2: Energy +20",
                requiresConfirmation: false,
            },
            "New Year's Shrine Visit": {
                selectedOption: "Option 1: Energy +30",
                requiresConfirmation: false,
            },
            "Victory!": {
                selectedOption: "Option 2: Energy -5 and random stat gain",
                requiresConfirmation: false,
                enableEnergyBasedSelection: false,
            },
            "Solid Showing": {
                selectedOption: "Option 2: Energy -5/-20 and random stat gain",
                requiresConfirmation: false,
                enableEnergyBasedSelection: false,
            },
            Defeat: {
                selectedOption: "Option 1: Energy -25 and random stat gain",
                requiresConfirmation: false,
                enableEnergyBasedSelection: false,
            },
            "Get Well Soon!": {
                selectedOption: "Option 2: (Random) Mood -1 / Stat decrease / Get Practice Poor negative status",
                requiresConfirmation: false,
            },
            "Don't Overdo It!": {
                selectedOption: "Option 2: (Random) Mood -3 / Stat decrease / Get Practice Poor negative status",
                requiresConfirmation: false,
            },
            "Extra Training": {
                selectedOption: "Option 2: Energy +5",
                requiresConfirmation: false,
            },
            "Acupuncture (Just an Acupuncturist, No Worries! ☆)": {
                selectedOption: "Option 5: Energy +10",
                requiresConfirmation: true,
            },
            "Etsuko's Exhaustive Coverage": {
                selectedOption: "Option 2: Energy Down / Gain skill points",
                requiresConfirmation: false,
            },
            "A Team at Last": {
                selectedOption: "Default",
                requiresConfirmation: false,
            },
        },
        characterEventOverrides: {},
        supportEventOverrides: {},
        scenarioEventOverrides: {},
    },
    misc: {
        enableSettingsDisplay: false,
        formattedSettingsString: "",
        currentProfileName: "",
        messageLogFontSize: 8,
    },
    training: {
        trainingBlacklist: [],
        statPrioritization: ["Speed", "Stamina", "Power", "Wit", "Guts"],
        eventChoiceStatPriority: ["Speed", "Stamina", "Power", "Wit", "Guts"],
        summerTrainingStatPriority: ["Speed", "Stamina", "Power", "Wit", "Guts"],
        maximumFailureChance: 20,
        disableTrainingOnMaxedStat: true,
        enableRainbowTrainingBonus: false,
        enablePrioritizeNearMaxFriendship: true,
        enableBondEfficiencyCapping: false,
        preferredDistanceOverride: "Auto",
        mustRestBeforeSummer: false,
        enableEnergyBanking: false,
        energyBankingThreshold: 50,
        energyBankingLookaheadTurns: 2,
        minimumMoodForTraining: "GOOD",
        enableRiskyTraining: false,
        riskyTrainingMinStatGain: 20,
        riskyTrainingMaxFailureChance: 30,
        trainWitDuringFinale: false,
        enablePrioritizeSkillHints: false,
        enableTrainingLevelWeighting: true,
        enableRunningStyleStaminaAdjustment: false,
        disableStatTargets: false,
        enableGoalRaceStatBias: false,
        goalRaceStatBiasLookaheadTurns: 3,
        enableTrainingAnalysisValidation: false,
        enableYoloStatDetection: false,
        classicMilestonePercent: 33,
        seniorMilestonePercent: 66,
        enableUnityCupTrainOnlyMode: false,
        preferEliteTeamOpponent: false,
        sparkTraitMaxRerolls: 0,
        sparkTraitMinStars: 0,
        manualStatCap: 0,
        "trainingBlacklist_URA Finale": [],
        "trainingBlacklist_Unity Cup": [],
        "trainingBlacklist_Trackblazer": [],
    },
    trainingStatTarget: {
        trainingSprintStatTarget_speedStatTarget: 1200,
        trainingSprintStatTarget_staminaStatTarget: 450,
        trainingSprintStatTarget_powerStatTarget: 900,
        trainingSprintStatTarget_gutsStatTarget: 500,
        trainingSprintStatTarget_witStatTarget: 1200,
        trainingMileStatTarget_speedStatTarget: 1200,
        trainingMileStatTarget_staminaStatTarget: 650,
        trainingMileStatTarget_powerStatTarget: 1000,
        trainingMileStatTarget_gutsStatTarget: 400,
        trainingMileStatTarget_witStatTarget: 800,
        trainingMediumStatTarget_speedStatTarget: 1200,
        trainingMediumStatTarget_staminaStatTarget: 800,
        trainingMediumStatTarget_powerStatTarget: 900,
        trainingMediumStatTarget_gutsStatTarget: 400,
        trainingMediumStatTarget_witStatTarget: 600,
        trainingLongStatTarget_speedStatTarget: 1200,
        trainingLongStatTarget_staminaStatTarget: 1100,
        trainingLongStatTarget_powerStatTarget: 1000,
        trainingLongStatTarget_gutsStatTarget: 500,
        trainingLongStatTarget_witStatTarget: 600,
    },
    debug: {
        enableDebugMode: false,
        ocrThreshold: 230,
        templateMatchConfidence: 0.8,
        templateMatchCustomScale: 1.0,
        enableAutoDisplayProfileTuning: true,
        debugMode_startTemplateMatchingTest: false,
        debugMode_startSingleTrainingOCRTest: false,
        debugMode_startComprehensiveTrainingOCRTest: false,
        debugMode_startRaceListDetectionTest: false,
        debugMode_startMainScreenUpdateTest: false,
        debugMode_startSkillListBuyTest: false,
        debugMode_startScrollBarDetectionTest: false,
        debugMode_startTrackblazerRaceSelectionTest: false,
        debugMode_startTrackblazerInventorySyncTest: false,
        debugMode_startTrackblazerBuyItemsTest: false,
        debugMode_startTrackblazerShopClickDiagnosticTest: false,
        enableScreenRecording: false,
        recordingBitRate: 6,
        recordingFrameRate: 30,
        recordingResolutionScale: 1.0,
        enableRemoteLogViewer: false,
        remoteLogViewerPort: 9000,
        enableMessageIdDisplay: false,
        overlayButtonSizeDP: 40,
    },
    discord: {
        enableDiscordNotifications: false,
        enableDiscordEmbeds: true,
        enableDiscordLiveStatus: true,
        enableDiscordRaceAlerts: true,
        enableDiscordWinRateGuardAlerts: true,
        discordLiveStatusTurnInterval: 6,
        discordToken: "",
        discordUserID: "",
        fanMilestones: "",
        enableRaceMomentumNotifications: false,
        enableScenarioProgressPings: false,
    },
    chat: {
        enableAskTheDocs: false,
    },
    scenarioOverrides: {
        trackblazerConsecutiveRacesLimit: 3,
        trackblazerMoodRecoveryFloor: "NORMAL",
        trackblazerEnergyThreshold: 40,
        trackblazerForceTrainEnergyFloor: 20,
        trackblazerShopCheckGrades: ["G1", "G2", "G3"],
        trackblazerSkipRiskyCharmTrainingBelowGain: 30,
        trackblazerSkipBadMoodItemsBelowGain: 15,
        trackblazerMaxRetriesPerRace: 1,
        trackblazerWhistleForcesTraining: true,
        trackblazerRetryRacesBeforeFinalGrades: ["G1", "G2", "G3"],
        trackblazerEnableIrregularTraining: false,
        trackblazerIrregularTrainingMinStatGain: 30,
        trackblazerIrregularTrainingRaceLookahead: 0,
        trackblazerEnableMegaphoneForceRaceForecast: false,
        trackblazerMegaphoneForceRaceForecastThreshold: 0,
        trackblazerEnableMegaphoneTierOverwrite: false,
        trackblazerMegaphoneTierOverwriteMinGain: 30,
        trackblazerMegaphoneSurplusBurnReserve: 0,
        trackblazerExcludedItems: [],
        trackblazerShopCheckFrequency: 3,
        trackblazerPreferredDistances: [] as string[],
        trackblazerPreferredSurfaces: [] as string[],
        trackblazerEnergyItemReserve: 1,
        trackblazerCupcakeReserve: 1,
        trackblazerMasterHammerFinaleReserve: 2,
        trackblazerArtisanHammerMinStockForG3: 3,
        trackblazerArtisanHammerMinStockForG2: 2,
        trackblazerGlowStickFinalReserve: 1,
        trackblazerGlowStickMinFans: 20000,
        trackblazerValueAwareShopping: false,
        unityCupBurstMaxFailureChance: 0,
    },
}

/**
 * Slice updater accepts either a partial slice (merged shallowly) or a functional updater
 * that receives the previous slice and returns the next. Functional callers always see the
 * latest slice value, eliminating stale-closure races on rapid taps.
 */
type SliceUpdater<T> = (update: Partial<T> | ((prev: T) => T)) => void

/** App metadata + readyStatus + immutable defaultSettings. Updates rarely. */
export interface BotMetaContextValue {
    readyStatus: boolean
    setReadyStatus: (readyStatus: boolean) => void
    defaultSettings: Settings
    appName: string
    setAppName: (appName: string) => void
    appVersion: string
    setAppVersion: (appVersion: string) => void
    /**
     * Bulk settings setter. Exposed here (rather than only via the legacy `BotStateContext`)
     * so cross-slice writers (e.g., profile overwrite) can mutate without subscribing to the
     * full settings object, since `setSettings` is a stable callback identity.
     */
    setSettings: (settings: Settings | ((prev: Settings) => Settings)) => void
}

export interface RacingContextValue {
    racing: Settings["racing"]
    updateRacing: SliceUpdater<Settings["racing"]>
}

export interface SkillsContextValue {
    skills: Settings["skills"]
    updateSkills: SliceUpdater<Settings["skills"]>
}

export interface TrainingContextValue {
    training: Settings["training"]
    trainingStatTarget: Settings["trainingStatTarget"]
    updateTraining: SliceUpdater<Settings["training"]>
    updateTrainingStatTarget: SliceUpdater<Settings["trainingStatTarget"]>
}

export interface TrainingEventContextValue {
    trainingEvent: Settings["trainingEvent"]
    updateTrainingEvent: SliceUpdater<Settings["trainingEvent"]>
}

export interface GeneralMiscContextValue {
    general: Settings["general"]
    misc: Settings["misc"]
    updateGeneral: SliceUpdater<Settings["general"]>
    updateMisc: SliceUpdater<Settings["misc"]>
}

export interface DebugContextValue {
    debug: Settings["debug"]
    updateDebug: SliceUpdater<Settings["debug"]>
}

export interface DiscordContextValue {
    discord: Settings["discord"]
    updateDiscord: SliceUpdater<Settings["discord"]>
}

export interface ChatContextValue {
    chat: Settings["chat"]
    updateChat: SliceUpdater<Settings["chat"]>
}

export interface ScenarioOverridesContextValue {
    scenarioOverrides: Settings["scenarioOverrides"]
    updateScenarioOverrides: SliceUpdater<Settings["scenarioOverrides"]>
}

export const BotMetaContext = createContext<BotMetaContextValue>({} as BotMetaContextValue)
export const RacingContext = createContext<RacingContextValue>({} as RacingContextValue)
export const SkillsContext = createContext<SkillsContextValue>({} as SkillsContextValue)
export const TrainingContext = createContext<TrainingContextValue>({} as TrainingContextValue)
export const TrainingEventContext = createContext<TrainingEventContextValue>({} as TrainingEventContextValue)
export const GeneralMiscContext = createContext<GeneralMiscContextValue>({} as GeneralMiscContextValue)
export const DebugContext = createContext<DebugContextValue>({} as DebugContextValue)
export const DiscordContext = createContext<DiscordContextValue>({} as DiscordContextValue)
export const ChatContext = createContext<ChatContextValue>({} as ChatContextValue)
export const ScenarioOverridesContext = createContext<ScenarioOverridesContextValue>({} as ScenarioOverridesContextValue)

/**
 * Provider component for the BotState context.
 * Manages application-wide state including readiness, settings, and metadata.
 * Settings updates are wrapped with performance timing.
 * @param children The child components to render within the provider.
 * @returns The bot state context provider.
 */
export const BotStateProvider = ({ children }: any): React.ReactElement => {
    const [readyStatus, setReadyStatus] = useState<boolean>(false)
    const [appName, setAppName] = useState<string>("")
    const [appVersion, setAppVersion] = useState<string>("")

    // Create a deep copy of default settings to avoid reference issues.
    const [settings, setSettings] = useState<Settings>(() => JSON.parse(JSON.stringify(defaultSettings)))

    /**
     * Wrapped setSettings with performance logging.
     * @param update The update to apply to the settings.
     */
    const setSettingsWithLogging = useCallback((update: Settings | ((prev: Settings) => Settings)) => {
        const endTiming = startTiming("bot_state_set_settings", "state")

        try {
            if (typeof update === "function") {
                setSettings((prev) => {
                    const newSettings = update(prev)
                    endTiming({ status: "success" })
                    return newSettings
                })
            } else {
                setSettings(update)
                endTiming({ status: "success" })
            }
        } catch (error) {
            endTiming({ status: "error", error: error instanceof Error ? error.message : String(error) })
            throw error
        }
    }, [])

    // Build a slice-aware updater. Accepts either `Partial<Slice>` (shallow-merged) or
    // `(prev) => next`. Functional updaters always read the freshest slice, avoiding
    // stale-closure races when multiple toggles fire in the same React batch.
    const makeSliceUpdater = useCallback(
        <K extends keyof Settings>(key: K): SliceUpdater<Settings[K]> =>
            (update) => {
                setSettingsWithLogging((prev) => {
                    const prevSlice = prev[key]
                    const nextSlice = typeof update === "function" ? (update as (p: Settings[K]) => Settings[K])(prevSlice) : ({ ...prevSlice, ...update } as Settings[K])
                    if (nextSlice === prevSlice) return prev
                    return { ...prev, [key]: nextSlice }
                })
            },
        [setSettingsWithLogging]
    )

    const updateRacing = useMemo(() => makeSliceUpdater("racing"), [makeSliceUpdater])
    const updateSkills = useMemo(() => makeSliceUpdater("skills"), [makeSliceUpdater])
    const updateTraining = useMemo(() => makeSliceUpdater("training"), [makeSliceUpdater])
    const updateTrainingStatTarget = useMemo(() => makeSliceUpdater("trainingStatTarget"), [makeSliceUpdater])
    const updateTrainingEvent = useMemo(() => makeSliceUpdater("trainingEvent"), [makeSliceUpdater])
    const updateGeneral = useMemo(() => makeSliceUpdater("general"), [makeSliceUpdater])
    const updateMisc = useMemo(() => makeSliceUpdater("misc"), [makeSliceUpdater])
    const updateDebug = useMemo(() => makeSliceUpdater("debug"), [makeSliceUpdater])
    const updateDiscord = useMemo(() => makeSliceUpdater("discord"), [makeSliceUpdater])
    const updateChat = useMemo(() => makeSliceUpdater("chat"), [makeSliceUpdater])
    const updateScenarioOverrides = useMemo(() => makeSliceUpdater("scenarioOverrides"), [makeSliceUpdater])

    // Per-slice values memoized on their own slice reference. An untouched slice keeps a
    // stable identity across renders, so consumers of that slice's context skip re-rendering
    // when an unrelated domain mutates.
    const metaValue = useMemo<BotMetaContextValue>(
        () => ({ readyStatus, setReadyStatus, defaultSettings, appName, setAppName, appVersion, setAppVersion, setSettings: setSettingsWithLogging }),
        [readyStatus, appName, appVersion, setSettingsWithLogging]
    )
    const racingValue = useMemo<RacingContextValue>(() => ({ racing: settings.racing, updateRacing }), [settings.racing, updateRacing])
    const skillsValue = useMemo<SkillsContextValue>(() => ({ skills: settings.skills, updateSkills }), [settings.skills, updateSkills])
    const trainingValue = useMemo<TrainingContextValue>(
        () => ({ training: settings.training, trainingStatTarget: settings.trainingStatTarget, updateTraining, updateTrainingStatTarget }),
        [settings.training, settings.trainingStatTarget, updateTraining, updateTrainingStatTarget]
    )
    const trainingEventValue = useMemo<TrainingEventContextValue>(() => ({ trainingEvent: settings.trainingEvent, updateTrainingEvent }), [settings.trainingEvent, updateTrainingEvent])
    const generalMiscValue = useMemo<GeneralMiscContextValue>(
        () => ({ general: settings.general, misc: settings.misc, updateGeneral, updateMisc }),
        [settings.general, settings.misc, updateGeneral, updateMisc]
    )
    const debugValue = useMemo<DebugContextValue>(() => ({ debug: settings.debug, updateDebug }), [settings.debug, updateDebug])
    const discordValue = useMemo<DiscordContextValue>(() => ({ discord: settings.discord, updateDiscord }), [settings.discord, updateDiscord])
    const chatValue = useMemo<ChatContextValue>(() => ({ chat: settings.chat, updateChat }), [settings.chat, updateChat])
    const scenarioOverridesValue = useMemo<ScenarioOverridesContextValue>(
        () => ({ scenarioOverrides: settings.scenarioOverrides, updateScenarioOverrides }),
        [settings.scenarioOverrides, updateScenarioOverrides]
    )

    return (
        <BotMetaContext.Provider value={metaValue}>
            <GeneralMiscContext.Provider value={generalMiscValue}>
                <RacingContext.Provider value={racingValue}>
                    <SkillsContext.Provider value={skillsValue}>
                        <TrainingContext.Provider value={trainingValue}>
                            <TrainingEventContext.Provider value={trainingEventValue}>
                                <DebugContext.Provider value={debugValue}>
                                    <DiscordContext.Provider value={discordValue}>
                                        <ChatContext.Provider value={chatValue}>
                                            <ScenarioOverridesContext.Provider value={scenarioOverridesValue}>
                                                <SettingsSnapshotPublisher>{children}</SettingsSnapshotPublisher>
                                            </ScenarioOverridesContext.Provider>
                                        </ChatContext.Provider>
                                    </DiscordContext.Provider>
                                </DebugContext.Provider>
                            </TrainingEventContext.Provider>
                        </TrainingContext.Provider>
                    </SkillsContext.Provider>
                </RacingContext.Provider>
            </GeneralMiscContext.Provider>
        </BotMetaContext.Provider>
    )
}

/**
 * Subscribes to every slice context and returns a `Settings` snapshot. Used by the
 * three remaining full-settings consumers (`useSettingsManager`, `useSettingsFileManager`)
 * that genuinely need cross-slice reads. MessageLog reads `getLatestSettingsSnapshot()` via
 * `SettingsRevisionContext` instead. The returned object identity changes whenever any slice changes, mirroring the legacy
 * aggregate `BotStateContext.settings` it replaces.
 *
 * @returns A `Settings` object assembled from every slice context's current value.
 */
export const useSettingsSnapshot = (): Settings => {
    const { general, misc } = useContext(GeneralMiscContext)
    const { racing } = useContext(RacingContext)
    const { skills } = useContext(SkillsContext)
    const { training, trainingStatTarget } = useContext(TrainingContext)
    const { trainingEvent } = useContext(TrainingEventContext)
    const { debug } = useContext(DebugContext)
    const { discord } = useContext(DiscordContext)
    const { chat } = useContext(ChatContext)
    const { scenarioOverrides } = useContext(ScenarioOverridesContext)
    return useMemo(
        () => ({ general, racing, skills, trainingEvent, misc, training, trainingStatTarget, debug, discord, chat, scenarioOverrides }),
        [general, racing, skills, trainingEvent, misc, training, trainingStatTarget, debug, discord, chat, scenarioOverrides]
    )
}

/**
 * Module-level lazy getter for the latest aggregated `Settings` snapshot. Populated by the
 * mounted `BotStateProvider` (see `useSettingsSnapshotPublisher` below) and read by callers that
 * only need the value at user-action time (e.g. import / export handlers). Reading it does NOT
 * subscribe to any context, so call sites don't re-render when slices change.
 *
 * Falls back to `defaultSettings` if no provider is mounted (test environments).
 */
let _latestSettingsSnapshot: Settings = defaultSettings
export const getLatestSettingsSnapshot = (): Settings => _latestSettingsSnapshot

/** Monotonic counter bumped whenever any settings slice changes. Lightweight alternative to `useSettingsSnapshot` for banner refresh. */
export const SettingsRevisionContext = createContext(0)

/**
 * Publishes the live snapshot to `_latestSettingsSnapshot` and bumps `SettingsRevisionContext` so
 * consumers like MessageLog can debounce banner rebuilds without subscribing to every slice.
 */
const SettingsSnapshotPublisher = ({ children }: { children: ReactNode }) => {
    const snapshot = useSettingsSnapshot()
    const [revision, setRevision] = useState(0)
    useEffect(() => {
        _latestSettingsSnapshot = snapshot
        setRevision((r) => r + 1)
    }, [snapshot])
    return <SettingsRevisionContext.Provider value={revision}>{children}</SettingsRevisionContext.Provider>
}
