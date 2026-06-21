import { growthAdjustedBaseStat, RACE_STAT_SPLIT_BY_DISTANCE_TYPE, STAT_KEYS } from "../constants"

describe("RACE_STAT_SPLIT_BY_DISTANCE_TYPE", () => {
    it("sums to 1.0 for every distance type", () => {
        for (const split of Object.values(RACE_STAT_SPLIT_BY_DISTANCE_TYPE)) {
            const sum = STAT_KEYS.reduce((acc, stat) => acc + split[stat], 0)
            expect(sum).toBeCloseTo(1.0, 9)
        }
    })
})

describe("growthAdjustedBaseStat", () => {
    it("returns the unadjusted base reward when distanceType is missing", () => {
        expect(growthAdjustedBaseStat("G1", undefined, { Speed: 10, Stamina: 0, Power: 0, Guts: 0, Wit: 0 })).toBe(10)
    })

    it("returns the unadjusted base reward when growthBonus is missing", () => {
        expect(growthAdjustedBaseStat("G1", "Sprint", undefined)).toBe(10)
    })

    it("returns the unadjusted base reward for an unknown grade", () => {
        expect(growthAdjustedBaseStat("MAIDEN", "Sprint", { Speed: 10, Stamina: 0, Power: 0, Guts: 0, Wit: 0 })).toBe(0)
    })

    it("boosts only the stats carrying a non-zero growth bonus", () => {
        const noBonus = growthAdjustedBaseStat("G1", "Sprint", { Speed: 0, Stamina: 0, Power: 0, Guts: 0, Wit: 0 })
        const withBonus = growthAdjustedBaseStat("G1", "Sprint", { Speed: 10, Stamina: 0, Power: 10, Guts: 0, Wit: 0 })
        expect(withBonus).toBeGreaterThan(noBonus)
        // Sprint split: Speed 0.35 + Power 0.30 of base 10 = 6.5 unboosted; +10% on both stats adds 0.65.
        expect(withBonus - noBonus).toBeCloseTo(0.65, 9)
    })
})
