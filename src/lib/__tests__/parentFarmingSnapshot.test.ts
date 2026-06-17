import type { Settings } from "../../context/BotStateContext"
import { captureParentFarmingSnapshot, restoreParentFarmingSnapshot } from "../parentFarmingSnapshot"

describe("parentFarmingSnapshot", () => {
    it("captures and restores a revert snapshot", () => {
        const settings = {
            general: { enableStopBeforeFinals: true, scenario: "URA" },
            racing: {
                enableSmartRaceSolver: false,
                enableFarmingFans: false,
                enableForceRacing: true,
                enableUserInGameRaceAgenda: false,
                enableCompleteCareerOnFailure: false,
                enableCaratRaceRetry: false,
                maxCaratRaceRetriesPerRun: 5,
                sparkSelectionStrategy: "Default",
                smartRaceSolverWeights: "{}",
                smartRaceSolverTargetEpithets: "[]",
                smartRaceSolverForcedEpithets: "[]",
                smartRaceSolverManualLocks: "{}",
                enableParentFarmingMode: true,
            },
            training: {
                maximumFailureChance: 20,
                preferredDistanceOverride: "Default",
                enablePrioritizeSkillHints: false,
                disableStatTargets: false,
            },
            skills: {
                enableSkillPointCheck: true,
                plans: {},
            },
        } as Settings

        const snapshot = captureParentFarmingSnapshot(settings)
        const mutated = {
            ...settings,
            racing: { ...settings.racing, enableSmartRaceSolver: true, enableFarmingFans: true },
        } as Settings

        const restored = restoreParentFarmingSnapshot(mutated, snapshot)
        expect(restored?.racing.enableSmartRaceSolver).toBe(false)
        expect(restored?.racing.enableParentFarmingMode).toBe(false)
        expect(restored?.general.scenario).toBe("URA")
    })
})
