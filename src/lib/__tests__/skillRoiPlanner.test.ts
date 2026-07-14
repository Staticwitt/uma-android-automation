import { planSkillPurchases, type SkillCandidate } from "../skillRoiPlanner"

const skill = (name: string, cost: number, evalPoints: number, verdict?: SkillCandidate["verdict"]): SkillCandidate => ({ name, cost, evalPoints, verdict })

describe("planSkillPurchases", () => {
    it("ranks by rank-points-per-skill-point, best ROI first", () => {
        const candidates = [skill("Expensive", 200, 300), skill("Efficient", 100, 250), skill("Cheap Filler", 50, 40)]
        const { ranked } = planSkillPurchases(candidates, 0)
        // ROI: Efficient 2.5, Expensive 1.5, Cheap Filler 0.8.
        expect(ranked.map((r) => r.name)).toEqual(["Efficient", "Expensive", "Cheap Filler"])
    })

    it("greedily fills the budget by ROI", () => {
        const candidates = [skill("A", 100, 250), skill("B", 100, 150), skill("C", 100, 120)]
        const { picks, totalCost } = planSkillPurchases(candidates, 200)
        expect(picks.map((p) => p.name)).toEqual(["A", "B"])
        expect(totalCost).toBe(200)
    })

    it("discounts a skill that can't fire and drops it from the buy list", () => {
        const candidates = [skill("Reliable", 100, 200, "Likely"), skill("Dead Accel", 100, 400, "Dead")]
        const { ranked, picks } = planSkillPurchases(candidates, 1000)
        // Dead Accel has 400 raw but 0 effective, so Reliable ranks first and Dead Accel is never bought.
        expect(ranked[0].name).toBe("Reliable")
        expect(picks.map((p) => p.name)).toEqual(["Reliable"])
    })

    it("discounts a style-mismatched skill so a reliable one wins the slot", () => {
        const candidates = [skill("Budding Blossom (mismatch)", 200, 400, "StyleMismatch"), skill("Straightaway Adept", 200, 180, "Likely")]
        const { ranked } = planSkillPurchases(candidates, 0)
        // 400 * 0.25 = 100 effective (ROI 0.5) vs 180 (ROI 0.9) -> reliable one ranks higher.
        expect(ranked[0].name).toBe("Straightaway Adept")
    })

    it("still ranks with a zero budget but buys nothing", () => {
        const { ranked, picks, totalCost } = planSkillPurchases([skill("A", 100, 200)], 0)
        expect(ranked).toHaveLength(1)
        expect(picks).toEqual([])
        expect(totalCost).toBe(0)
    })

    it("skips a skill it can't afford but keeps filling with cheaper ones", () => {
        const candidates = [skill("Pricey", 300, 900), skill("Affordable", 90, 200)]
        // Pricey has higher ROI (3.0 vs 2.2) but does not fit 100; Affordable does.
        const { picks } = planSkillPurchases(candidates, 100)
        expect(picks.map((p) => p.name)).toEqual(["Affordable"])
    })

    it("honors activation-multiplier overrides", () => {
        const candidates = [skill("Positional", 100, 200, "PositionDependent")]
        const strict = planSkillPurchases(candidates, 0, { activationMultipliers: { PositionDependent: 0.5 } })
        expect(strict.ranked[0].effectiveEvalPoints).toBe(100)
        expect(strict.ranked[0].roi).toBe(1)
    })

    it("reports total effective value of the buy list", () => {
        const candidates = [skill("A", 100, 200, "Likely"), skill("B", 100, 100, "PositionDependent")]
        const { totalEffectiveEvalPoints } = planSkillPurchases(candidates, 200)
        // 200 * 1 + 100 * 0.9 = 290.
        expect(totalEffectiveEvalPoints).toBe(290)
    })
})
