import type { Settings } from "../../context/BotStateContext"
import { applyParentFarmingPreset, disableParentFarmingMode } from "../parentFarmingPreset"
import { PARENT_FARMING_SPARK_SELECTION_STRATEGY } from "../sparkSelection"

const createSettings = (): Settings =>
    ({
        general: {
            enableStopBeforeFinals: true,
        },
        racing: {
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
            smartRaceSolverTargetEpithets: "[]",
            smartRaceSolverForcedEpithets: "[]",
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
        },
        skills: {
            enableSkillPointCheck: true,
        },
        training: {
            maximumFailureChance: 20,
            preferredDistanceOverride: "Default",
            enablePrioritizeSkillHints: false,
            disableStatTargets: false,
        },
    }) as Settings

describe("parentFarmingPreset", () => {
    it("applies parent-farming settings while preserving solver choices", () => {
        const settings = createSettings()
        settings.racing.smartRaceSolverCharacterPreset = "Oguri Cap"
        settings.racing.smartRaceSolverTargetEpithets = JSON.stringify(["Globe-Trotter"])
        settings.racing.smartRaceSolverForcedEpithets = JSON.stringify(["Triple Crown"])
        settings.racing.smartRaceSolverManualLocks = JSON.stringify({ "31": "Tokyo Yushun (Japanese Derby)" })
        settings.racing.smartRaceSolverWeights = JSON.stringify({
            ...JSON.parse(settings.racing.smartRaceSolverWeights),
            hintWeight: 12,
            allowSummerRacing: true,
        })

        const result = applyParentFarmingPreset(settings)
        const weights = JSON.parse(result.racing.smartRaceSolverWeights)

        expect(result.racing.enableParentFarmingMode).toBe(true)
        expect(result.racing.enableSmartRaceSolver).toBe(true)
        expect(result.racing.enableFarmingFans).toBe(true)
        expect(result.racing.enableForceRacing).toBe(false)
        expect(result.racing.enableUserInGameRaceAgenda).toBe(false)
        expect(result.racing.ignoreConsecutiveRaceWarning).toBe(true)
        expect(result.racing.enableCompleteCareerOnFailure).toBe(true)
        expect(result.racing.daysToRunExtraRaces).toBe(3)
        expect(result.racing.sparkSelectionStrategy).toBe(PARENT_FARMING_SPARK_SELECTION_STRATEGY)
        expect(result.racing.parentFarmingGoalPresetKey).toBe("g1-fans")
        expect(result.racing.enableParentRunSummary).toBe(true)

        expect(result.racing.smartRaceSolverCharacterPreset).toBe("Oguri Cap")
        const targets = JSON.parse(result.racing.smartRaceSolverTargetEpithets!)
        expect(targets).toEqual(expect.arrayContaining(["Globe-Trotter", "G1 Hunter", "Epoch Pioneer"]))
        expect(result.racing.smartRaceSolverForcedEpithets).toBe(JSON.stringify(["Triple Crown"]))
        expect(result.racing.smartRaceSolverManualLocks).toBe(JSON.stringify({ "31": "Tokyo Yushun (Japanese Derby)" }))

        expect(weights.fanWeight).toBe(1.5e-3)
        expect(weights.minimumFanTarget).toBe(120000)
        expect(weights.targetEpithetMultiplier).toBe(4)
        expect(weights.minimumRaceGapTurns).toBe(0)
        expect(weights.raceCostPct).toBe(70)
        expect(weights.consecutiveRacePenalty).toBe(2)
        expect(weights.hintWeight).toBe(12)
        expect(weights.allowSummerRacing).toBe(false)

        expect(result.general.enableStopBeforeFinals).toBe(false)
        expect(result.training.maximumFailureChance).toBe(15)
        expect(result.training.preferredDistanceOverride).toBe("Auto")
        expect(result.training.enablePrioritizeSkillHints).toBe(true)
        expect(result.training.disableStatTargets).toBe(true)
        expect(result.skills.enableSkillPointCheck).toBe(false)
    })

    it("only clears the mode marker when disabled", () => {
        const applied = applyParentFarmingPreset(createSettings())
        const result = disableParentFarmingMode(applied)

        expect(result.racing.enableParentFarmingMode).toBe(false)
        expect(result.racing.enableSmartRaceSolver).toBe(true)
        expect(result.racing.enableFarmingFans).toBe(true)
        expect(result.training.disableStatTargets).toBe(true)
    })
})
