import type { Settings } from "../../context/BotStateContext"
import { detectParentFarmingDrift, formatParentFarmingTrainingBias, hasParentFarmingTrainingDrift } from "../parentFarmingDrift"
import { prepareSettingsForBotStart } from "../prepareSettingsForBotStart"

const baseSettings = (): Settings =>
    ({
        general: { scenario: "Trackblazer", enableStopBeforeFinals: true },
        skills: { enableSkillPointCheck: true },
        racing: {
            enableParentFarmingMode: true,
            enableSmartRaceSolver: true,
            enableFarmingFans: true,
            parentFarmingGoalPresetKey: "g1-fans",
            parentFarmingGoalPresetLabel: "G1 / Fan Parent",
            parentFarmingBundleKey: "",
            smartRaceSolverCharacterPreset: "Special Week",
            smartRaceSolverTargetEpithets: "[]",
            smartRaceSolverForcedEpithets: "[]",
            smartRaceSolverWeights: "{}",
        },
        training: {
            maximumFailureChance: 15,
            preferredDistanceOverride: "Auto",
            enablePrioritizeSkillHints: true,
            disableStatTargets: true,
            statPrioritization: ["Speed", "Stamina", "Power", "Wit", "Guts"],
            eventChoiceStatPriority: ["Speed", "Stamina", "Power", "Wit", "Guts"],
            summerTrainingStatPriority: ["Speed", "Stamina", "Power", "Wit", "Guts"],
        },
    }) as Settings

describe("parentFarmingDrift", () => {
    it("formats training bias for banners", () => {
        const line = formatParentFarmingTrainingBias(baseSettings().training)
        expect(line).toContain("Auto distance")
        expect(line).toContain("Speed-first")
        expect(line).toContain("skill hints on")
    })

    it("detects preset keys while mode is off", () => {
        const settings = baseSettings()
        settings.racing.enableParentFarmingMode = false
        const warnings = detectParentFarmingDrift(settings)
        expect(warnings.some((w) => w.includes("mode is off"))).toBe(true)
    })

    it("detects training drift from active preset", () => {
        const settings = baseSettings()
        settings.training.preferredDistanceOverride = "Long"
        expect(hasParentFarmingTrainingDrift(settings)).toBe(true)
    })
})

describe("prepareSettingsForBotStart", () => {
    it("re-resolves parent farming training before bot start", () => {
        const settings = baseSettings()
        settings.training.disableStatTargets = false
        const prepared = prepareSettingsForBotStart(settings)
        expect(prepared.training.disableStatTargets).toBe(true)
    })
})
