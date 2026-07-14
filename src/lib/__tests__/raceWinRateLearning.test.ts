import { learnWinRates, lookupWinRate, type RaceOutcome } from "../raceWinRateLearning"

const outcome = (grade: string, distance: string, won: boolean, times = 1): RaceOutcome[] => Array.from({ length: times }, () => ({ grade, distance, won }))

describe("learnWinRates", () => {
    it("returns the prior for a bucket with no data", () => {
        const model = learnWinRates([], { prior: 0.85 })
        expect(model.buckets).toEqual([])
        expect(lookupWinRate(model, "G1", "Sprint")).toBe(0.85)
    })

    it("shrinks a small sample toward the prior instead of trusting it outright", () => {
        // One win in one race: raw 1.0, but with priorStrength 5 the posterior is (1 + 0.85*5)/(1+5) = 0.875.
        const model = learnWinRates(outcome("G1", "Sprint", true, 1), { prior: 0.85, priorStrength: 5 })
        const b = model.buckets[0]
        expect(b.observedRate).toBe(1)
        expect(b.blendedRate).toBeCloseTo(0.875, 5)
        expect(b.reportable).toBe(false)
    })

    it("converges toward the observed rate as samples grow", () => {
        // 40 races, 20 wins => observed 0.5. Posterior (20 + 0.85*5)/(40+5) = 24.25/45 ≈ 0.539.
        const model = learnWinRates([...outcome("G1", "Sprint", true, 20), ...outcome("G1", "Sprint", false, 20)], { prior: 0.85, priorStrength: 5 })
        const b = model.buckets[0]
        expect(b.observedRate).toBe(0.5)
        expect(b.blendedRate).toBeCloseTo(0.5389, 3)
        expect(b.reportable).toBe(true)
    })

    it("keeps separate buckets per grade and distance", () => {
        const model = learnWinRates([...outcome("G1", "Sprint", true, 10), ...outcome("G1", "Mile", false, 10), ...outcome("G3", "Sprint", true, 10)])
        expect(model.buckets).toHaveLength(3)
        expect(lookupWinRate(model, "G1", "Sprint")).toBeGreaterThan(lookupWinRate(model, "G1", "Mile"))
    })

    it("normalizes grade and distance casing", () => {
        const model = learnWinRates([...outcome("g1", "sprint", true, 5), ...outcome("G1", "SPRINT", false, 5)])
        expect(model.buckets).toHaveLength(1)
        expect(model.buckets[0].samples).toBe(10)
        expect(lookupWinRate(model, "G1", "Sprint")).toBe(model.buckets[0].blendedRate)
    })

    it("ignores entries with a blank grade or distance", () => {
        const model = learnWinRates([...outcome("", "Sprint", true, 3), ...outcome("G1", "", false, 3), ...outcome("G1", "Sprint", true, 3)])
        expect(model.buckets).toHaveLength(1)
        expect(model.buckets[0].samples).toBe(3)
    })

    it("marks a bucket reportable only past the sample threshold", () => {
        const model = learnWinRates([...outcome("G1", "Sprint", true, 3), ...outcome("G2", "Mile", true, 4)], { minSamplesToReport: 4 })
        const sprint = model.buckets.find((b) => b.distance === "Sprint")!
        const mile = model.buckets.find((b) => b.distance === "Mile")!
        expect(sprint.reportable).toBe(false)
        expect(mile.reportable).toBe(true)
    })

    it("sorts buckets by sample count so the best-evidenced rates lead", () => {
        const model = learnWinRates([...outcome("G3", "Mile", true, 2), ...outcome("G1", "Sprint", true, 12)])
        expect(model.buckets[0].distance).toBe("Sprint")
        expect(model.buckets[0].samples).toBe(12)
    })

    it("clamps a degenerate prior and never emits a rate outside [0,1]", () => {
        const model = learnWinRates([...outcome("G1", "Sprint", true, 3)], { prior: 5 })
        expect(model.prior).toBe(1)
        for (const b of model.buckets) {
            expect(b.blendedRate).toBeGreaterThanOrEqual(0)
            expect(b.blendedRate).toBeLessThanOrEqual(1)
        }
    })

    it("with zero prior strength reports the raw observed rate", () => {
        const model = learnWinRates([...outcome("G1", "Sprint", true, 3), ...outcome("G1", "Sprint", false, 1)], { priorStrength: 0 })
        expect(model.buckets[0].blendedRate).toBeCloseTo(0.75, 5)
    })
})
