import type { Settings } from "../../context/BotStateContext"
import { applyParentFarmingScenarioSync, resolveParentFarmingScenario } from "../parentFarmingScenarioSync"
import { breedingPlanToGoalQueue, defaultBreedingPlan, parseParentFarmingBreedingPlan, parseTargetFactorSkillsInput, serializeParentFarmingBreedingPlan } from "../parentFarmingBreedingPlan"
import { buildParentFarmingRecommendations } from "../parentFarmingRecommendations"

const baseSettings = (): Settings =>
    ({
        general: { scenario: "Trackblazer" },
        racing: {
            enableParentFarmingMode: true,
            parentFarmingGoalPresetKey: "ura-finals",
            enableParentFarmingAutoScenario: true,
            enableParentFarmingBreedingPlan: false,
            parentFarmingBreedingPlan: "[]",
        },
    }) as Settings

describe("parentFarmingScenarioSync", () => {
    it("maps URA goal preset to URA Finale scenario", () => {
        expect(resolveParentFarmingScenario(baseSettings())).toBe("URA Finale")
        const next = applyParentFarmingScenarioSync(baseSettings())
        expect(next.general.scenario).toBe("URA Finale")
    })
})

describe("parentFarmingBreedingPlan", () => {
    it("serializes generations to goal queue items", () => {
        const plan = defaultBreedingPlan()
        const queue = breedingPlanToGoalQueue(plan)
        expect(queue).toHaveLength(2)
        expect(queue[0]?.type).toBe("preset")
    })

    it("round-trips JSON", () => {
        const plan = defaultBreedingPlan()
        const json = serializeParentFarmingBreedingPlan(plan)
        expect(parseParentFarmingBreedingPlan(json).generations).toHaveLength(2)
    })

    it("parses comma-separated factor skill input on commit", () => {
        expect(parseTargetFactorSkillsInput("Stamina, Power, Mile")).toEqual(["Stamina", "Power", "Mile"])
        expect(parseTargetFactorSkillsInput("Corner Recovery ○")).toEqual(["Corner Recovery ○"])
        expect(parseTargetFactorSkillsInput("Stamina, ")).toEqual(["Stamina"])
    })
})

describe("parentFarmingRecommendations", () => {
    it("suggests more data when archive is empty", () => {
        const recs = buildParentFarmingRecommendations([], baseSettings())
        expect(recs[0]?.id).toBe("need-more-runs")
    })
})

describe("prepareSettingsForBotStart breeding plan", () => {
    it("breeding plan maps to two queue items for multi-run", () => {
        const queue = breedingPlanToGoalQueue(parseParentFarmingBreedingPlan(serializeParentFarmingBreedingPlan(defaultBreedingPlan())))
        expect(queue).toHaveLength(2)
        expect(queue[0]?.type).toBe("preset")
        expect(queue[1]?.type).toBe("preset")
    })
})
