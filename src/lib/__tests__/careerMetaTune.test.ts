import { analyzeCareerRuns, type MetaRunInput } from "../careerMetaTune"
import type { StatKey } from "../careerAutoTune"

const baseStats = (over: Partial<Record<StatKey, number>> = {}): Record<StatKey, number> => ({
    speed: 1000,
    stamina: 400,
    power: 800,
    guts: 500,
    wit: 700,
    ...over,
})

const run = (i: number, rating: number, stats: Partial<Record<StatKey, number>> = {}, raceRecords: MetaRunInput["raceRecords"] = []): MetaRunInput => ({
    completedAtMs: 1_000 + i * 1_000,
    scenario: "Unity Cup",
    careerRating: rating,
    careerRank: "B",
    stats: baseStats(stats),
    raceRecords,
})

describe("analyzeCareerRuns", () => {
    it("returns nothing when there are too few runs", () => {
        expect(analyzeCareerRuns([run(0, 5000), run(1, 5200)])).toEqual([])
    })

    it("flags a stat that correlates with higher rating as the driver", () => {
        // Speed rises in lockstep with rating; other stats are flat.
        const runs = [run(0, 4000, { speed: 900 }), run(1, 4500, { speed: 1000 }), run(2, 5000, { speed: 1100 }), run(3, 5500, { speed: 1200 }), run(4, 6000, { speed: 1300 })]
        const driver = analyzeCareerRuns(runs).find((i) => i.id === "stat-driver")
        expect(driver).toBeDefined()
        expect(driver?.stat).toBe("speed")
        expect(driver?.metric).toBeGreaterThan(0.9)
    })

    it("flags a high but non-predictive stat as over-invested", () => {
        // Wit is always the highest stat but rating is uncorrelated with it (rating tracks speed instead).
        const runs = [
            run(0, 4000, { speed: 900, wit: 1400 }),
            run(1, 4500, { speed: 1000, wit: 1400 }),
            run(2, 5000, { speed: 1100, wit: 1400 }),
            run(3, 5500, { speed: 1200, wit: 1400 }),
            run(4, 6000, { speed: 1300, wit: 1400 }),
        ]
        const over = analyzeCareerRuns(runs).find((i) => i.id === "stat-over-invested")
        expect(over).toBeDefined()
        expect(over?.stat).toBe("wit")
    })

    it("identifies what the best runs carry more of", () => {
        // Top runs (higher rating) have markedly more power.
        const runs = [
            run(0, 4000, { power: 600 }),
            run(1, 4200, { power: 620 }),
            run(2, 4400, { power: 640 }),
            run(3, 5800, { power: 900 }),
            run(4, 6000, { power: 950 }),
            run(5, 6200, { power: 1000 }),
        ]
        const archetype = analyzeCareerRuns(runs).find((i) => i.id === "best-run-archetype")
        expect(archetype).toBeDefined()
        expect(archetype?.stat).toBe("power")
        expect(archetype?.metric).toBeGreaterThanOrEqual(80)
    })

    it("flags a race lost in at least half of its appearances", () => {
        const withRace = (i: number, won: boolean): MetaRunInput => run(i, 5000, {}, [{ name: "Osaka Hai", won }])
        const runs = [withRace(0, false), withRace(1, false), withRace(2, true), withRace(3, false)]
        const hotspot = analyzeCareerRuns(runs).find((i) => i.id === "race-loss-hotspot")
        expect(hotspot).toBeDefined()
        expect(hotspot?.title).toContain("Osaka Hai")
        expect(hotspot?.metric).toBeCloseTo(0.75)
    })

    it("does not flag a race that appears too few times", () => {
        const runs = [run(0, 5000, {}, [{ name: "Rare Race", won: false }]), run(1, 5000, {}, [{ name: "Rare Race", won: false }]), run(2, 5000), run(3, 5000)]
        expect(analyzeCareerRuns(runs).some((i) => i.id === "race-loss-hotspot")).toBe(false)
    })

    it("flags inconsistent results", () => {
        const runs = [run(0, 3000), run(1, 7000), run(2, 3500), run(3, 6800)]
        const consistency = analyzeCareerRuns(runs).find((i) => i.id === "consistency")
        expect(consistency).toBeDefined()
        expect(consistency?.metric).toBeGreaterThanOrEqual(0.15)
    })

    it("reports an upward rating trend", () => {
        const runs = [run(0, 4000), run(1, 4500), run(2, 5000), run(3, 5500), run(4, 6000)]
        const trend = analyzeCareerRuns(runs).find((i) => i.id === "rating-trend")
        expect(trend).toBeDefined()
        expect(trend?.title).toContain("up")
        expect(trend?.metric).toBeGreaterThan(0)
    })

    it("scopes analysis to a single scenario when asked", () => {
        const uraRuns: MetaRunInput[] = [0, 1, 2, 3, 4].map((i) => ({ ...run(i, 4000 + i * 400, { speed: 900 + i * 100 }), scenario: "URA Finale" }))
        const mixed = [...uraRuns, run(5, 100, { speed: 100 }), run(6, 100, { speed: 100 })]
        const scoped = analyzeCareerRuns(mixed, { scenario: "URA Finale" })
        // The two low Unity Cup runs must not pollute the URA driver signal.
        const driver = scoped.find((i) => i.id === "stat-driver")
        expect(driver?.stat).toBe("speed")
    })

    it("orders insights high severity first", () => {
        const runs = [
            run(0, 4000, { power: 600 }),
            run(1, 4200, { power: 620 }),
            run(2, 4400, { power: 640 }),
            run(3, 5800, { power: 900 }),
            run(4, 6000, { power: 950 }),
            run(5, 6200, { power: 1000 }),
        ]
        const result = analyzeCareerRuns(runs)
        const severities = result.map((i) => i.severity)
        const order = { high: 0, medium: 1, low: 2 }
        for (let i = 1; i < severities.length; i++) expect(order[severities[i]]).toBeGreaterThanOrEqual(order[severities[i - 1]])
    })
})
