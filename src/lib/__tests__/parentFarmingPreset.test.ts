import { defaultSettings, type Settings } from "../../context/BotStateContext"
import { applyParentFarmingPreset, disableParentFarmingMode } from "../parentFarmingPreset"

const cloneDefaults = (): Settings => JSON.parse(JSON.stringify(defaultSettings))

describe("parentFarmingPreset", () => {
    it("applies parent-farming settings while preserving solver choices", () => {
        const settings = cloneDefaults()
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

        expect(result.racing.smartRaceSolverCharacterPreset).toBe("Oguri Cap")
        expect(result.racing.smartRaceSolverTargetEpithets).toBe(JSON.stringify(["Globe-Trotter"]))
        expect(result.racing.smartRaceSolverForcedEpithets).toBe(JSON.stringify(["Triple Crown"]))
        expect(result.racing.smartRaceSolverManualLocks).toBe(JSON.stringify({ "31": "Tokyo Yushun (Japanese Derby)" }))

        expect(weights.fanWeight).toBe(1.0e-3)
        expect(weights.raceCostPct).toBe(75)
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
        const applied = applyParentFarmingPreset(cloneDefaults())
        const result = disableParentFarmingMode(applied)

        expect(result.racing.enableParentFarmingMode).toBe(false)
        expect(result.racing.enableSmartRaceSolver).toBe(true)
        expect(result.racing.enableFarmingFans).toBe(true)
        expect(result.training.disableStatTargets).toBe(true)
    })
})
