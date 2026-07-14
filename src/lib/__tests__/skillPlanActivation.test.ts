import { resolvePlanActivation, summarizePlanActivation, type PlanSkillMeta } from "../skillPlanActivation"

// Real conditions from skills.json.
const BUDDING_BLOSSOM = "phase>=2&is_finalcorner_laterhalf==1&order>=3&order_rate<=40@phase>=2&is_finalcorner==1&corner==0&order>=3&order_rate<=40"
const skills: PlanSkillMeta[] = [
    { id: 100511, name: "Budding Blossom", condition: BUDDING_BLOSSOM },
    { id: 200432, name: "Focus", condition: "" },
    { id: 999, name: "End Only", condition: "running_style==4&all_corner_random==1" },
]

describe("summarizePlanActivation", () => {
    it("counts verdicts for a Pace sprinter", () => {
        const summary = summarizePlanActivation(skills, "Pace", "Sprint")
        // Focus (unconditional) -> Likely; Budding Blossom -> PositionDependent; End Only -> StyleMismatch (needs End).
        expect(summary.counts.Likely).toBe(1)
        expect(summary.counts.PositionDependent).toBe(1)
        expect(summary.counts.StyleMismatch).toBe(1)
        expect(summary.counts.Dead).toBe(0)
    })

    it("flags the accel skill as a style mismatch for a Front runner", () => {
        const summary = summarizePlanActivation(skills, "Front", "Sprint")
        const bb = summary.activations.find((a) => a.name === "Budding Blossom")!
        expect(bb.verdict).toBe("StyleMismatch")
    })
})

describe("resolvePlanActivation", () => {
    it("returns null for a non-concrete style (inherit/any)", () => {
        expect(resolvePlanActivation([100511], "inherit", "sprint")).toBeNull()
        expect(resolvePlanActivation([100511], "no_preference", "sprint")).toBeNull()
    })

    it("returns null for a non-concrete distance", () => {
        expect(resolvePlanActivation([100511], "pace_chaser", "inherit")).toBeNull()
    })

    it("returns null when no plan id resolves to a known skill", () => {
        expect(resolvePlanActivation([-1], "pace_chaser", "sprint")).toBeNull()
    })

    it("resolves real skill ids against the bundled data for a Pace sprinter", () => {
        // 100511 Budding Blossom (PositionDependent for Pace) + 100101 Shooting for Victory! (also PositionDependent).
        const summary = resolvePlanActivation([100511, 100101], "pace_chaser", "sprint")
        expect(summary).not.toBeNull()
        expect(summary!.runningStyle).toBe("Pace")
        expect(summary!.distanceType).toBe("Sprint")
        expect(summary!.activations.length).toBe(2)
        // Both Final-Corner accels are position-dependent (they can fire), not dead, for a Pace sprinter.
        expect(summary!.counts.Dead).toBe(0)
        expect(summary!.counts.PositionDependent).toBeGreaterThanOrEqual(1)
    })

    it("marks the Final-Corner accels as style mismatches for a Front runner", () => {
        const summary = resolvePlanActivation([100511, 100101], "front_runner", "sprint")
        expect(summary!.counts.StyleMismatch).toBe(2)
    })
})
