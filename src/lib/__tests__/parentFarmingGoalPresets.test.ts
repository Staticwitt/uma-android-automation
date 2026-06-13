import type { Settings } from "../../context/BotStateContext"
import { applyParentFarmingGoalPresetToRacing, PARENT_FARMING_GOAL_PRESETS } from "../parentFarmingGoalPresets"

const createRacingSettings = (): Settings["racing"] =>
    ({
        enableParentFarmingMode: false,
        enableFarmingFans: false,
        ignoreConsecutiveRaceWarning: false,
        daysToRunExtraRaces: 5,
        enableCompleteCareerOnFailure: false,
        enableForceRacing: true,
        enableUserInGameRaceAgenda: true,
        enableSmartRaceSolver: false,
        smartRaceSolverCharacterPreset: "Special Week",
        smartRaceSolverAptitudes: "{}",
        smartRaceSolverTargetEpithets: JSON.stringify(["Manual Target"]),
        smartRaceSolverForcedEpithets: JSON.stringify(["Manual Forced"]),
        smartRaceSolverManualLocks: "{}",
        smartRaceSolverWeights: JSON.stringify({
            raceValue: 1,
            epithetValue: 1,
            targetEpithetMultiplier: 3,
            statWeight: 1,
            spWeight: 1,
            hintWeight: 8,
            consecutiveRacePenalty: 3,
            summerPenalty: 5,
            raceBonusPct: 50,
            raceCostPct: 100,
            fanWeight: 0,
            minimumRaceGapTurns: 0,
            aptitudeThreshold: "C",
            includeOpAndPreOp: false,
            allowSummerRacing: false,
        }),
    }) as Settings["racing"]

describe("parentFarmingGoalPresets", () => {
    it("adds preset targets and weights without removing existing selections", () => {
        const preset = PARENT_FARMING_GOAL_PRESETS.find((p) => p.key === "classic-crown")
        expect(preset).toBeDefined()

        const result = applyParentFarmingGoalPresetToRacing(createRacingSettings(), preset!)
        const targets = JSON.parse(result.smartRaceSolverTargetEpithets!)
        const forced = JSON.parse(result.smartRaceSolverForcedEpithets!)
        const weights = JSON.parse(result.smartRaceSolverWeights!)

        expect(result.enableParentFarmingMode).toBe(true)
        expect(result.enableSmartRaceSolver).toBe(true)
        expect(result.enableForceRacing).toBe(false)
        expect(result.enableUserInGameRaceAgenda).toBe(false)
        expect(targets).toEqual(expect.arrayContaining(["Manual Target", "Triple Crown", "Senior Autumn Triple Crown"]))
        expect(forced).toEqual(["Manual Forced"])
        expect(weights.targetEpithetMultiplier).toBe(4)
        expect(weights.minimumRaceGapTurns).toBe(1)
    })

    it("respects allowed epithet filters when adding targets", () => {
        const preset = PARENT_FARMING_GOAL_PRESETS.find((p) => p.key === "classic-crown")!
        const result = applyParentFarmingGoalPresetToRacing(createRacingSettings(), preset, new Set(["Triple Crown"]))
        const targets = JSON.parse(result.smartRaceSolverTargetEpithets!)

        expect(targets).toEqual(["Manual Target", "Triple Crown"])
    })
})
