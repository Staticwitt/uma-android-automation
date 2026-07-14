// src/lib/training/scoring/__tests__/helpers.test.ts
import { getCurrentStatCap, getFinaleStatBonus } from "../scoring"
import { DEFAULT_TRAINING_SCORING_CONSTANTS, DateYear, StatName, TrainingConfig } from "../types"

function makeConfig(overrides: Partial<TrainingConfig> = {}): TrainingConfig {
    return {
        currentStats: {},
        statPrioritization: [],
        summerTrainingStatPriority: [],
        statTargets: {},
        currentDate: { year: DateYear.CLASSIC, day: 1, bIsPreDebut: false, isSummer: false },
        scenario: "URA",
        enableRainbowTrainingBonus: true,
        blacklist: [],
        disableTrainingOnMaxedStat: false,
        trainingOptions: [],
        skillHintsPerLocation: {},
        enablePrioritizeSkillHints: false,
        enableTrainingLevelWeighting: false,
        disableStatTargets: false,
        enablePrioritizeNearMaxFriendship: true,
        enableBondEfficiencyCapping: false,
        statsTrainedOverBuffer: new Set(),
        scoring: DEFAULT_TRAINING_SCORING_CONSTANTS,
        ...overrides,
    }
}

describe("getFinaleStatBonus", () => {
    test("returns 45 for early-career days (day=1, all 3 finale races remain)", () => {
        // remainingRaces = (75 - max(1, 72)) = 3; bonus = 3 * 15 = 45
        expect(getFinaleStatBonus(1)).toBe(45)
    })

    test("returns 45 at day 72 (3 races still ahead)", () => {
        // remainingRaces = (75 - max(72, 72)) = 3; bonus = 45
        expect(getFinaleStatBonus(72)).toBe(45)
    })

    test("returns 30 at day 73 (2 races remain)", () => {
        // remainingRaces = (75 - max(73, 72)) = 2; bonus = 2 * 15 = 30
        expect(getFinaleStatBonus(73)).toBe(30)
    })

    test("returns 15 at day 74 (1 race remains)", () => {
        // remainingRaces = (75 - 74) = 1; bonus = 15
        expect(getFinaleStatBonus(74)).toBe(15)
    })

    test("returns 0 at day 75 (no races left)", () => {
        expect(getFinaleStatBonus(75)).toBe(0)
    })

    test("returns 0 past day 75 (coerced at >=0)", () => {
        expect(getFinaleStatBonus(80)).toBe(0)
    })
})

describe("getCurrentStatCap", () => {
    test("URA Finale: all stats cap at 1400", () => {
        const config = makeConfig({ scenario: "URA Finale" })
        for (const stat of [StatName.SPEED, StatName.STAMINA, StatName.POWER, StatName.GUTS, StatName.WIT]) {
            expect(getCurrentStatCap(stat, config)).toBe(1400)
        }
    })

    test("URA prefix match: scenario 'URA' also returns 1400", () => {
        expect(getCurrentStatCap(StatName.SPEED, makeConfig({ scenario: "URA" }))).toBe(1400)
    })

    test("Unity Cup: non-Wit stats cap at 1300", () => {
        const config = makeConfig({ scenario: "Unity Cup" })
        for (const stat of [StatName.SPEED, StatName.STAMINA, StatName.POWER, StatName.GUTS]) {
            expect(getCurrentStatCap(stat, config)).toBe(1300)
        }
    })

    test("Unity Cup: Wit caps at 1800", () => {
        expect(getCurrentStatCap(StatName.WIT, makeConfig({ scenario: "Unity Cup" }))).toBe(1800)
    })

    test("Trackblazer: Stamina caps at 1900", () => {
        expect(getCurrentStatCap(StatName.STAMINA, makeConfig({ scenario: "Trackblazer" }))).toBe(1900)
    })

    test("Trackblazer: Wit caps at 1500", () => {
        expect(getCurrentStatCap(StatName.WIT, makeConfig({ scenario: "Trackblazer" }))).toBe(1500)
    })

    test("Trackblazer: Speed, Power, Guts cap at 1200", () => {
        const config = makeConfig({ scenario: "Trackblazer" })
        for (const stat of [StatName.SPEED, StatName.POWER, StatName.GUTS]) {
            expect(getCurrentStatCap(stat, config)).toBe(1200)
        }
    })

    test("Grand Live: Speed caps at 1600", () => {
        expect(getCurrentStatCap(StatName.SPEED, makeConfig({ scenario: "Grand Live" }))).toBe(1600)
    })

    test("Grand Live: Stamina, Power, Guts, Wit cap at 1200", () => {
        const config = makeConfig({ scenario: "Grand Live" })
        for (const stat of [StatName.STAMINA, StatName.POWER, StatName.GUTS, StatName.WIT]) {
            expect(getCurrentStatCap(stat, config)).toBe(1200)
        }
    })

    test("unknown scenario falls back to 1200 for all stats", () => {
        const config = makeConfig({ scenario: "Unknown" })
        for (const stat of [StatName.SPEED, StatName.STAMINA, StatName.POWER, StatName.GUTS, StatName.WIT]) {
            expect(getCurrentStatCap(stat, config)).toBe(1200)
        }
    })
})
