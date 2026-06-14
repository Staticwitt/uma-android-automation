import { mergeSkillPlanConfig, normalizeSkillPlans, parseSkillIdCsv, defaultSkillPlans } from "../skillPlanSettings"

describe("skillPlanSettings", () => {
    it("mergeSkillPlanConfig fills missing required fields from defaults", () => {
        const merged = mergeSkillPlanConfig("preFinals", { enabled: true, plan: "100,200" })
        expect(merged.enabled).toBe(true)
        expect(merged.plan).toBe("100,200")
        expect(merged.strategy).toBe(defaultSkillPlans.preFinals.strategy)
        expect(merged.enableBuyNegativeSkills).toBe(false)
        expect(merged.blacklist).toBe("")
    })

    it("normalizeSkillPlans merges every registered plan key", () => {
        const normalized = normalizeSkillPlans({
            preFinals: { enabled: true, plan: "42" },
        })
        expect(normalized.preFinals.enabled).toBe(true)
        expect(normalized.preFinals.plan).toBe("42")
        expect(normalized.preFinals.strategy).toBe(defaultSkillPlans.preFinals.strategy)
        expect(normalized.careerComplete.enabled).toBe(false)
    })

    it("parseSkillIdCsv ignores empty and invalid tokens", () => {
        expect(parseSkillIdCsv("100,200")).toEqual([100, 200])
        expect(parseSkillIdCsv("100,,200,")).toEqual([100, 200])
        expect(parseSkillIdCsv("")).toEqual([])
        expect(parseSkillIdCsv(undefined)).toEqual([])
    })
})
