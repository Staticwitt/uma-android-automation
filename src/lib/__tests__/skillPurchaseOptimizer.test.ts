import { optimizeSkillPurchases, skillRelevance } from "../skillPurchaseOptimizer"
import type { SkillCandidate, SkillContext } from "../skillPurchaseOptimizer"

const sprintPace: SkillContext = { distance: "Sprint", style: "Pace" }

const skill = (over: Partial<SkillCandidate> & Pick<SkillCandidate, "id" | "name">): SkillCandidate => ({
    spCost: 100,
    baseValue: 50,
    ...over,
})

describe("skillRelevance", () => {
    test("off-distance skills are heavily discounted", () => {
        const longSkill = skill({ id: "l", name: "Long only", distanceTags: ["Long"] })
        expect(skillRelevance(longSkill, sprintPace)).toBeLessThan(0.2)
    })

    test("off-style skills are partially discounted", () => {
        const frontSkill = skill({ id: "f", name: "Front only", styleTags: ["Front"] })
        expect(skillRelevance(frontSkill, sprintPace)).toBeCloseTo(0.3)
    })

    test("untagged and recovery skills are fully relevant", () => {
        expect(skillRelevance(skill({ id: "u", name: "Universal" }), sprintPace)).toBe(1)
        expect(skillRelevance(skill({ id: "r", name: "Recover", kind: "recovery", distanceTags: ["Long"] }), sprintPace)).toBe(1)
    })
})

describe("optimizeSkillPurchases", () => {
    test("prefers relevant skills over off-distance ones within budget", () => {
        const candidates = [
            skill({ id: "sprint1", name: "Sprint Straight", distanceTags: ["Sprint"], spCost: 100, baseValue: 50 }),
            skill({ id: "long1", name: "Long Runner", distanceTags: ["Long"], spCost: 100, baseValue: 50 }),
        ]
        const res = optimizeSkillPurchases(candidates, 100, sprintPace)
        expect(res.purchased.map((s) => s.id)).toEqual(["sprint1"])
    })

    test("respects the SP budget", () => {
        const candidates = [
            skill({ id: "a", name: "A", spCost: 120, baseValue: 60 }),
            skill({ id: "b", name: "B", spCost: 120, baseValue: 55 }),
            skill({ id: "c", name: "C", spCost: 120, baseValue: 50 }),
        ]
        const res = optimizeSkillPurchases(candidates, 250, sprintPace)
        expect(res.totalCost).toBeLessThanOrEqual(250)
        expect(res.purchased).toHaveLength(2) // only two 120-cost skills fit in 250
        expect(res.purchased.map((s) => s.id).sort()).toEqual(["a", "b"]) // the two highest-value
    })

    test("buys a gold skill only together with its base, and only when the budget covers both", () => {
        const base = skill({ id: "base", name: "Base", spCost: 100, baseValue: 40 })
        const gold = skill({ id: "gold", name: "Gold", spCost: 150, baseValue: 90, requiresId: "base", kind: "gold" })
        const candidates = [base, gold]

        // Budget covers only the base -> just the base.
        const small = optimizeSkillPurchases(candidates, 120, sprintPace)
        expect(small.purchased.map((s) => s.id)).toEqual(["base"])

        // Budget covers both -> base then gold, base first.
        const big = optimizeSkillPurchases(candidates, 300, sprintPace)
        expect(big.purchased.map((s) => s.id)).toEqual(["base", "gold"])
    })

    test("never buys a gold whose base is unavailable", () => {
        const gold = skill({ id: "gold", name: "Orphan gold", spCost: 150, baseValue: 200, requiresId: "missing", kind: "gold" })
        const res = optimizeSkillPurchases([gold], 1000, sprintPace)
        expect(res.purchased).toEqual([])
    })

    test("excludes negative skills unless explicitly allowed", () => {
        const neg = skill({ id: "neg", name: "Negative", kind: "negative", baseValue: 30, spCost: 50 })
        expect(optimizeSkillPurchases([neg], 1000, sprintPace).purchased).toEqual([])
        expect(optimizeSkillPurchases([neg], 1000, { ...sprintPace, allowNegative: true }).purchased.map((s) => s.id)).toEqual(["neg"])
    })

    test("maximizes total value, choosing a gold chain over two mediocre skills when it's worth more", () => {
        const base = skill({ id: "base", name: "Base", spCost: 100, baseValue: 40 })
        const gold = skill({ id: "gold", name: "Gold", spCost: 100, baseValue: 120, requiresId: "base", kind: "gold" })
        const filler1 = skill({ id: "f1", name: "Filler1", spCost: 100, baseValue: 45 })
        const filler2 = skill({ id: "f2", name: "Filler2", spCost: 100, baseValue: 45 })
        // Budget 200: base+gold (value 160) beats filler1+filler2 (value 90).
        const res = optimizeSkillPurchases([base, gold, filler1, filler2], 200, sprintPace)
        expect(res.purchased.map((s) => s.id)).toEqual(["base", "gold"])
        expect(res.totalValue).toBeCloseTo(160)
    })

    test("returns leftover SP", () => {
        const res = optimizeSkillPurchases([skill({ id: "a", name: "A", spCost: 100, baseValue: 50 })], 350, sprintPace)
        expect(res.remainingSp).toBe(250)
    })
})
