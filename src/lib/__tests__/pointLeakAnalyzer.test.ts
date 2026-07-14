import { analyzePointLeaks, type TurnDecisionRecord } from "../pointLeakAnalyzer"

const rec = (turn: number, chosenValue: number, bestAvailableValue: number, over: Partial<TurnDecisionRecord> = {}): TurnDecisionRecord => ({
    turn,
    chosenAction: "Train Speed",
    chosenValue,
    bestAvailableValue,
    ...over,
})

describe("analyzePointLeaks", () => {
    it("returns an empty report for a run with no leaks", () => {
        const report = analyzePointLeaks([rec(1, 100, 100), rec(2, 80, 80)])
        expect(report.totalLeak).toBe(0)
        expect(report.topLeaks).toEqual([])
        expect(report.dominantCategory).toBeNull()
    })

    it("sums the gap between chosen and best on leaking turns", () => {
        const report = analyzePointLeaks([rec(1, 90, 100), rec(2, 100, 100), rec(3, 70, 100)])
        expect(report.totalLeak).toBe(40) // 10 + 0 + 30
        expect(report.topLeaks[0].turn).toBe(3)
        expect(report.topLeaks[0].delta).toBe(30)
    })

    it("ignores leaks below the noise threshold", () => {
        const report = analyzePointLeaks([rec(1, 99.5, 100), rec(2, 50, 100)], { minLeak: 1 })
        expect(report.topLeaks).toHaveLength(1)
        expect(report.topLeaks[0].turn).toBe(2)
    })

    it("rolls up leaks by category and names the dominant one", () => {
        const report = analyzePointLeaks([
            rec(1, 60, 100, { category: "rested-through-rainbow" }),
            rec(2, 90, 100, { category: "trained-capped-stat" }),
            rec(3, 70, 100, { category: "rested-through-rainbow" }),
        ])
        // rested-through-rainbow: 40 + 30 = 70; trained-capped-stat: 10.
        expect(report.dominantCategory).toBe("rested-through-rainbow")
        const rainbow = report.byCategory.find((c) => c.category === "rested-through-rainbow")!
        expect(rainbow.totalDelta).toBe(70)
        expect(rainbow.turns).toBe(2)
    })

    it("buckets untagged leaks as uncategorized", () => {
        const report = analyzePointLeaks([rec(1, 50, 100)])
        expect(report.byCategory[0].category).toBe("uncategorized")
    })

    it("keeps only the worst topN turns, largest first", () => {
        const records = [rec(1, 95, 100), rec(2, 60, 100), rec(3, 80, 100), rec(4, 50, 100)]
        const report = analyzePointLeaks(records, { topN: 2 })
        expect(report.topLeaks.map((l) => l.turn)).toEqual([4, 2]) // deltas 50, 40
        // totalLeak still counts all leaking turns, not just the topN.
        expect(report.totalLeak).toBe(5 + 40 + 20 + 50)
    })

    it("carries the better alternative label through", () => {
        const report = analyzePointLeaks([rec(1, 70, 100, { chosenAction: "Rest", bestAction: "Train Power" })])
        expect(report.topLeaks[0].chosenAction).toBe("Rest")
        expect(report.topLeaks[0].bestAction).toBe("Train Power")
    })

    it("does not create negative leaks when chosen exceeds best (dirty log)", () => {
        const report = analyzePointLeaks([rec(1, 120, 100)])
        expect(report.totalLeak).toBe(0)
        expect(report.topLeaks).toEqual([])
    })
})
