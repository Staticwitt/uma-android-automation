import type { Settings } from "../context/BotStateContext"

/** Slice stored when parent farming is enabled so the user can revert on exit. */
export interface ParentFarmingSettingsSnapshot {
    general: Pick<Settings["general"], "enableStopBeforeFinals" | "scenario">
    racing: Pick<
        Settings["racing"],
        | "enableSmartRaceSolver"
        | "enableFarmingFans"
        | "enableForceRacing"
        | "enableUserInGameRaceAgenda"
        | "enableCompleteCareerOnFailure"
        | "enableCaratRaceRetry"
        | "maxCaratRaceRetriesPerRun"
        | "sparkSelectionStrategy"
        | "smartRaceSolverWeights"
        | "smartRaceSolverTargetEpithets"
        | "smartRaceSolverForcedEpithets"
        | "smartRaceSolverManualLocks"
    >
    training: Pick<
        Settings["training"],
        "maximumFailureChance" | "preferredDistanceOverride" | "enablePrioritizeSkillHints" | "disableStatTargets"
    >
    skills: Pick<Settings["skills"], "enableSkillPointCheck" | "plans">
}

export const captureParentFarmingSnapshot = (settings: Settings): string => {
    const snapshot: ParentFarmingSettingsSnapshot = {
        general: {
            enableStopBeforeFinals: settings.general.enableStopBeforeFinals,
            scenario: settings.general.scenario,
        },
        racing: {
            enableSmartRaceSolver: settings.racing.enableSmartRaceSolver,
            enableFarmingFans: settings.racing.enableFarmingFans,
            enableForceRacing: settings.racing.enableForceRacing,
            enableUserInGameRaceAgenda: settings.racing.enableUserInGameRaceAgenda,
            enableCompleteCareerOnFailure: settings.racing.enableCompleteCareerOnFailure,
            enableCaratRaceRetry: settings.racing.enableCaratRaceRetry,
            maxCaratRaceRetriesPerRun: settings.racing.maxCaratRaceRetriesPerRun,
            sparkSelectionStrategy: settings.racing.sparkSelectionStrategy,
            smartRaceSolverWeights: settings.racing.smartRaceSolverWeights,
            smartRaceSolverTargetEpithets: settings.racing.smartRaceSolverTargetEpithets,
            smartRaceSolverForcedEpithets: settings.racing.smartRaceSolverForcedEpithets,
            smartRaceSolverManualLocks: settings.racing.smartRaceSolverManualLocks,
        },
        training: {
            maximumFailureChance: settings.training.maximumFailureChance,
            preferredDistanceOverride: settings.training.preferredDistanceOverride,
            enablePrioritizeSkillHints: settings.training.enablePrioritizeSkillHints,
            disableStatTargets: settings.training.disableStatTargets,
        },
        skills: {
            enableSkillPointCheck: settings.skills.enableSkillPointCheck,
            plans: settings.skills.plans,
        },
    }
    return JSON.stringify(snapshot)
}

export const restoreParentFarmingSnapshot = (settings: Settings, snapshotJson: string): Settings | null => {
    try {
        const snapshot = JSON.parse(snapshotJson) as ParentFarmingSettingsSnapshot
        if (!snapshot?.general || !snapshot?.racing || !snapshot?.training || !snapshot?.skills) return null
        return {
            ...settings,
            general: { ...settings.general, ...snapshot.general },
            racing: {
                ...settings.racing,
                ...snapshot.racing,
                enableParentFarmingMode: false,
                parentFarmingGoalPresetKey: "",
                parentFarmingGoalPresetLabel: "",
                parentFarmingBundleKey: "",
                parentFarmingBundleLabel: "",
                parentFarmingResolverRevision: 0,
                parentFarmingSettingsSnapshot: "",
            },
            training: { ...settings.training, ...snapshot.training },
            skills: { ...settings.skills, ...snapshot.skills },
        }
    } catch {
        return null
    }
}
