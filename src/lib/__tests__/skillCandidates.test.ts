import { mapSkillsToCandidates, suggestSkillPlan } from "../skillCandidates"
import type { SkillDbEntry } from "../skillCandidates"
import type { SkillContext } from "../skillPurchaseOptimizer"

const ctx: SkillContext = { distance: "Sprint", style: "Pace" }

/** A base skill and its gold upgrade, plus a standalone and a debuff — mirrors the skills.json shape. */
const db: SkillDbEntry[] = [
    { id: 201412, name_en: "1,500,000 CC", cost: 120, eval_pt: 150, rarity: 1, upgrade: 201411, downgrade: null },
    { id: 201411, name_en: "15,000,000 CC", cost: 130, eval_pt: 334, rarity: 2, upgrade: null, downgrade: 201412 },
    { id: 100381, name_en: "#LookatCurren", cost: 200, eval_pt: 180, rarity: 1, upgrade: null, downgrade: null },
    { id: 999999, name_en: "Corner Acceleration ×", cost: 0, eval_pt: -262, rarity: 1, upgrade: null, downgrade: null },
]

describe("mapSkillsToCandidates", () => {
    test("maps cost, value, and kind", () => {
        const cands = mapSkillsToCandidates(db)
        const standalone = cands.find((c) => c.id === "100381")!
        expect(standalone.spCost).toBe(200)
        expect(standalone.baseValue).toBe(180)
        expect(standalone.kind).toBe("normal")
    })

    test("a gold upgrade requires its base and carries only incremental value", () => {
        const cands = mapSkillsToCandidates(db)
        const gold = cands.find((c) => c.id === "201411")!
        expect(gold.requiresId).toBe("201412")
        expect(gold.kind).toBe("gold")
        // Incremental over the base: 334 - 150 = 184, so base(150)+gold(184)=334 = the gold's own eval.
        expect(gold.baseValue).toBe(184)
        const base = cands.find((c) => c.id === "201412")!
        expect(base.requiresId).toBeUndefined()
    })

    test("negative-eval skills are tagged negative", () => {
        const cands = mapSkillsToCandidates(db)
        expect(cands.find((c) => c.id === "999999")!.kind).toBe("negative")
    })

    test("parses distance_type and running_style out of the activation condition", () => {
        const tagged: SkillDbEntry[] = [
            {
                id: 1,
                name_en: "Mile Only",
                cost: 100,
                eval_pt: 200,
                rarity: 1,
                upgrade: null,
                downgrade: null,
                condition: "distance_type==2&phase==1&change_order_onetime<0",
            },
            {
                id: 2,
                name_en: "Late Surger Only",
                cost: 100,
                eval_pt: 200,
                rarity: 1,
                upgrade: null,
                downgrade: null,
                condition: "running_style==3&up_slope_random==1",
            },
            { id: 3, name_en: "No condition", cost: 100, eval_pt: 200, rarity: 1, upgrade: null, downgrade: null, condition: "always" },
        ]
        const cands = mapSkillsToCandidates(tagged)
        expect(cands.find((c) => c.id === "1")!.distanceTags).toEqual(["Mile"])
        expect(cands.find((c) => c.id === "1")!.styleTags).toBeUndefined()
        expect(cands.find((c) => c.id === "2")!.styleTags).toEqual(["Late"])
        expect(cands.find((c) => c.id === "2")!.distanceTags).toBeUndefined()
        expect(cands.find((c) => c.id === "3")!.distanceTags).toBeUndefined()
        expect(cands.find((c) => c.id === "3")!.styleTags).toBeUndefined()
    })
})

describe("suggestSkillPlan", () => {
    test("returns an optimized, budget-respecting skill-id list excluding debuffs", () => {
        const { skillIds, result } = suggestSkillPlan(db, 300, ctx)
        expect(result.totalCost).toBeLessThanOrEqual(300)
        expect(skillIds).not.toContain("999999") // never buys the debuff
        // Base+gold chain (120+130=250, value 334) beats the standalone (200, value 180); base precedes gold.
        expect(skillIds).toEqual(["201412", "201411"])
    })

    test("with only enough SP for the standalone, picks the single best affordable skill", () => {
        const { skillIds } = suggestSkillPlan(db, 200, ctx)
        expect(skillIds).toEqual(["100381"])
    })

    test("deprioritizes a skill restricted to an off-distance/off-style condition in favor of a universal skill", () => {
        // ctx is { distance: "Sprint", style: "Pace" }. The Mile-only skill has a higher raw eval_pt than the universal one,
        // but its game condition restricts it to Mile races, so the relevance-weighted value should make it lose out.
        const restricted: SkillDbEntry[] = [
            {
                id: 10,
                name_en: "Mile Specialist",
                cost: 150,
                eval_pt: 300,
                rarity: 1,
                upgrade: null,
                downgrade: null,
                condition: "distance_type==2&phase==1",
            },
            { id: 20, name_en: "Universal", cost: 150, eval_pt: 200, rarity: 1, upgrade: null, downgrade: null, condition: "always" },
        ]
        const { skillIds } = suggestSkillPlan(restricted, 150, ctx)
        expect(skillIds).toEqual(["20"])
    })
})
