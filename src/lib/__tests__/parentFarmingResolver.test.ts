import type { Settings } from "../../context/BotStateContext"
import { applyParentFarmingPreset } from "../parentFarmingPreset"
import { PARENT_FARMING_DEFAULT_GOAL_PRESET_KEY, PARENT_FARMING_RESOLVER_REVISION } from "../parentFarmingConstants"
import { resolveParentFarmingSettings } from "../parentFarmingResolver"

const createSettings = (): Settings =>
    ({
        general: {
            scenario: "Trackblazer",
            enableStopBeforeFinals: true,
        },
        racing: {
            enableParentFarmingMode: false,
            parentFarmingGoalPresetKey: "",
            parentFarmingBundleKey: "",
            parentFarmingResolverRevision: 0,
            smartRaceSolverCharacterPreset: "Special Week",
            smartRaceSolverTargetEpithets: JSON.stringify(["Manual Target"]),
            smartRaceSolverForcedEpithets: "[]",
            smartRaceSolverWeights: JSON.stringify({
                raceValue: 1,
                epithetValue: 1,
                targetEpithetMultiplier: 3,
                minimumFanTarget: 0,
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
            statPrioritization: ["Guts", "Wit", "Power", "Stamina", "Speed"],
        },
    }) as Settings

describe("parentFarmingResolver", () => {
    it("applyParentFarmingPreset applies default goal preset when none is stored", () => {
        const result = applyParentFarmingPreset(createSettings())
        expect(result.racing.enableParentFarmingMode).toBe(true)
        expect(result.racing.parentFarmingGoalPresetKey).toBe(PARENT_FARMING_DEFAULT_GOAL_PRESET_KEY)
        expect(result.training.disableStatTargets).toBe(true)
        expect(result.training.enablePrioritizeSkillHints).toBe(true)

        const weights = JSON.parse(result.racing.smartRaceSolverWeights)
        expect(weights.minimumFanTarget).toBe(120000)
    })

    it("resolveParentFarmingSettings refreshes training from stored goal key", () => {
        const settings = createSettings()
        settings.racing.enableParentFarmingMode = true
        settings.racing.parentFarmingGoalPresetKey = "mile-sprint"
        settings.racing.parentFarmingGoalPresetLabel = "Mile / Sprint Parent"
        settings.training.disableStatTargets = false

        const result = resolveParentFarmingSettings(settings)
        expect(result.training.preferredDistanceOverride).toBe("Mile")
        expect(result.training.disableStatTargets).toBe(true)
        expect(result.racing.parentFarmingResolverRevision).toBe(PARENT_FARMING_RESOLVER_REVISION)
    })

    it("resolveParentFarmingSettings applies bundle character and clears manual locks", () => {
        const settings = createSettings()
        settings.racing.enableParentFarmingMode = true
        settings.racing.parentFarmingBundleKey = "grass-wonder-mile"
        settings.racing.smartRaceSolverManualLocks = JSON.stringify({ "12": "Some Race" })

        const result = resolveParentFarmingSettings(settings)
        expect(result.racing.smartRaceSolverCharacterPreset).toBe("Grass Wonder")
        expect(result.racing.smartRaceSolverManualLocks).toBe("{}")
        expect(result.racing.parentFarmingBundleKey).toBe("grass-wonder-mile")
        expect(result.training.preferredDistanceOverride).toBe("Mile")
    })
})
