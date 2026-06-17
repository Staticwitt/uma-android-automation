import type { Settings } from "../../context/BotStateContext"
import { applyGeneralSolverPreset, GENERAL_SOLVER_PRESET_LABEL } from "../generalSolverPreset"

const createSettings = (): Settings =>
    ({
        general: { scenario: "Trackblazer" },
        racing: {
            enableParentFarmingMode: true,
            parentFarmingGoalPresetKey: "g1-fans",
            parentFarmingGoalPresetLabel: "G1 / Fan Parent",
            parentFarmingBundleKey: "special-week-junior",
            parentFarmingBundleLabel: "Special Week",
            parentFarmingSettingsSnapshot: "{}",
            enableSmartRaceSolver: false,
            enableForceRacing: true,
            enableUserInGameRaceAgenda: true,
            enableFarmingFans: true,
            enableCompleteCareerOnFailure: true,
            smartRaceSolverWeights: JSON.stringify({ minimumFanTarget: 50000 }),
        },
    }) as Settings

describe("generalSolverPreset", () => {
    it("exposes a stable preset label", () => {
        expect(GENERAL_SOLVER_PRESET_LABEL).toBe("General Solver Preset")
    })

    it("enables solver and clears parent-farming automation", () => {
        const result = applyGeneralSolverPreset(createSettings())
        expect(result.racing.enableParentFarmingMode).toBe(false)
        expect(result.racing.enableSmartRaceSolver).toBe(true)
        expect(result.racing.enableForceRacing).toBe(false)
        expect(result.racing.enableUserInGameRaceAgenda).toBe(false)
        expect(result.racing.enableFarmingFans).toBe(false)
        expect(result.racing.parentFarmingGoalPresetKey).toBe("")
        expect(result.racing.parentFarmingBundleKey).toBe("")
    })

    it("applies stat epitaph weights while preserving existing solver weight keys", () => {
        const result = applyGeneralSolverPreset(createSettings())
        const weights = JSON.parse(result.racing.smartRaceSolverWeights)
        expect(weights.minimumFanTarget).toBe(50000)
        expect(weights.minWinRateGuard).toBe(0.75)
        expect(weights.epithetValue).toBe(1)
    })
})
