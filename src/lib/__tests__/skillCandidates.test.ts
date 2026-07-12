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
})
