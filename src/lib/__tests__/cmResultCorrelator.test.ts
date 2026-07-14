import { analyzeCmResults, type CmResultRecord } from "../cmResultCorrelator"
import type { StatKey } from "../careerAutoTune"

const stats = (over: Partial<Record<StatKey, number>> = {}): Record<StatKey, number> => ({
    speed: 1200,
    stamina: 400,
    power: 1200,
    guts: 600,
    wit: 1000,
    ...over,
})

const rec = (i: number, roundsWon: number, roundsPlayed: number, over: Partial<Record<StatKey, number>> = {}, cmId = "cm16_leo_2"): CmResultRecord => ({
    completedAtMs: 1_000 + i * 1_000,
    cmId,
    stats: stats(over),
    roundsWon,
    roundsPlayed,
})

describe("analyzeCmResults", () => {
    it("returns nothing below the minimum record count", () => {
        expect(analyzeCmResults([rec(0, 2, 3), rec(1, 1, 3)])).toEqual([])
    })

    it("reports the overall bracket round win rate", () => {
        const records = [rec(0, 3, 3), rec(1, 0, 3), rec(2, 3, 3), rec(3, 0, 3), rec(4, 3, 3)]
        const winRate = analyzeCmResults(records).find((i) => i.id === "cm-win-rate")
        expect(winRate).toBeDefined()
        // 9 of 15 rounds won => 0.6.
        expect(winRate!.metric).toBeCloseTo(0.6, 3)
    })

    it("flags the stat that correlates with winning rounds", () => {
        // Speed rises in lockstep with rounds won; other stats flat.
        const records = [rec(0, 0, 3, { speed: 900 }), rec(1, 1, 3, { speed: 1050 }), rec(2, 2, 3, { speed: 1200 }), rec(3, 3, 3, { speed: 1350 }), rec(4, 3, 3, { speed: 1450 })]
        const driver = analyzeCmResults(records).find((i) => i.id === "cm-stat-driver")
        expect(driver).toBeDefined()
        expect(driver!.title).toContain("Speed")
        expect(driver!.metric).toBeGreaterThan(0.8)
    })

    it("does not flag a stat driver when no stat separates wins from losses", () => {
        // Identical stats everywhere; results are random noise -> no correlation.
        const records = [rec(0, 3, 3), rec(1, 0, 3), rec(2, 2, 3), rec(3, 1, 3), rec(4, 3, 3), rec(5, 0, 3)]
        const driver = analyzeCmResults(records).find((i) => i.id === "cm-stat-driver")
        expect(driver).toBeUndefined()
    })

    it("reports how much more of the driving stat winning entries carried", () => {
        const records = [
            rec(0, 3, 3, { speed: 1400 }),
            rec(1, 3, 3, { speed: 1380 }),
            rec(2, 0, 3, { speed: 1100 }),
            rec(3, 0, 3, { speed: 1120 }),
            rec(4, 3, 3, { speed: 1420 }),
        ]
        const margin = analyzeCmResults(records).find((i) => i.id === "cm-win-margin")
        expect(margin).toBeDefined()
        expect(margin!.title).toContain("Speed")
        expect(margin!.metric).toBeGreaterThan(20)
    })

    it("scopes analysis to a single CM id when requested", () => {
        const leo = [rec(0, 3, 3, { speed: 1400 }, "cm16_leo_2"), rec(1, 3, 3, {}, "cm16_leo_2"), rec(2, 3, 3, {}, "cm16_leo_2")]
        const other = [rec(3, 0, 3, {}, "cm09_capricorn"), rec(4, 0, 3, {}, "cm09_capricorn"), rec(5, 0, 3, {}, "cm09_capricorn")]
        const scoped = analyzeCmResults([...leo, ...other], { cmId: "cm16_leo_2", minRecords: 3 })
        const winRate = scoped.find((i) => i.id === "cm-win-rate")
        expect(winRate!.metric).toBe(1) // Leo entries only, all won.
    })

    it("ignores records with a non-positive or impossible round count", () => {
        const records = [rec(0, 3, 0), rec(1, 5, 3), rec(2, 3, 3), rec(3, 2, 3), rec(4, 1, 3), rec(5, 3, 3)]
        const winRate = analyzeCmResults(records, { minRecords: 4 }).find((i) => i.id === "cm-win-rate")
        // Only the 4 valid records (indices 2..5) count: (3+2+1+3)/(3*4) = 9/12 = 0.75.
        expect(winRate!.metric).toBeCloseTo(0.75, 3)
    })
})
