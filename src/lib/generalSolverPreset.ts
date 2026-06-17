import type { Settings } from "../context/BotStateContext"
import { OPTIMIZE_MODE_PRESETS } from "./solver/constants"

/** Label for the general Smart Race Solver preset (no parent automation). */
export const GENERAL_SOLVER_PRESET_LABEL = "General Solver Preset"

export const GENERAL_SOLVER_PRESET_SUMMARY =
    "Enables Smart Race Solver with stat epitaph routing. Leaves parent farming off and does not enable fan-farming fallback."

/** Applies a one-tap general solver setup without parent-farming automation. */
export const applyGeneralSolverPreset = (settings: Settings): Settings => {
    const weights = (() => {
        try {
            return { ...JSON.parse(settings.racing.smartRaceSolverWeights || "{}") }
        } catch {
            return {}
        }
    })()

    return {
        ...settings,
        racing: {
            ...settings.racing,
            enableParentFarmingMode: false,
            parentFarmingGoalPresetKey: "",
            parentFarmingGoalPresetLabel: "",
            parentFarmingBundleKey: "",
            parentFarmingBundleLabel: "",
            parentFarmingSettingsSnapshot: "",
            enableSmartRaceSolver: true,
            enableForceRacing: false,
            enableUserInGameRaceAgenda: false,
            enableFarmingFans: false,
            enableCompleteCareerOnFailure: settings.racing.enableCompleteCareerOnFailure,
            smartRaceSolverWeights: JSON.stringify({
                ...weights,
                ...OPTIMIZE_MODE_PRESETS.STAT_EPITAPH,
                minWinRateGuard: 0.75,
            }),
        },
    }
}
