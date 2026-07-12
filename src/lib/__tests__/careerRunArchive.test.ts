jest.mock("react-native", () => ({
    NativeModules: {
        StartModule: {
            getCareerRunArchive: jest.fn(async () => "[]"),
            clearCareerRunArchive: jest.fn(async () => undefined),
        },
    },
}))

import { parseCareerRunArchive, toCareerRunRecord, resolveDistance, buildAutoTuneInput } from "../careerRunArchive"
import type { AutoTuneSettingsSlice, CareerRunArchiveEntry } from "../careerRunArchive"

const rawEntry = () => ({
    id: "run-1",
    completedAtMs: 1234,
    scenario: "Unity Cup",
    traineeName: "Nishino Flower",
    careerRank: "B",
    careerRating: 7631,
    raceWins: 12,
    raceLosses: 3,
    raceRecords: [{ name: "Sprinters Stakes", classYear: "Classic", turnNumber: 42, won: true }],
    elapsedMs: 5000,
    fans: 206452,
    fanClass: "GRADE1",
    skillPoints: 900,
    stats: { speed: 839, stamina: 747, power: 930, guts: 590, wit: 840 },
    distanceAptitudes: { SPRINT: "A", MILE: "A", MEDIUM: "D", LONG: "F" },
    surfaceAptitudes: { TURF: "S", DIRT: "F" },
    styleAptitudes: { FRONT: "F", PACE: "A", LATE: "A", END: "G" },
})

describe("parseCareerRunArchive", () => {
    test("parses a well-formed archive array", () => {
        const entries = parseCareerRunArchive(JSON.stringify([rawEntry()]))
        expect(entries).toHaveLength(1)
        expect(entries[0].stats.power).toBe(930)
        expect(entries[0].raceRecords[0].won).toBe(true)
        expect(entries[0].distanceAptitudes.SPRINT).toBe("A")
    })

    test("drops entries without an id and tolerates malformed JSON", () => {
        expect(parseCareerRunArchive(JSON.stringify([{ scenario: "x" }]))).toEqual([])
        expect(parseCareerRunArchive("not json")).toEqual([])
        expect(parseCareerRunArchive("")).toEqual([])
    })

    test("coerces missing numeric/string fields to safe defaults", () => {
        const entries = parseCareerRunArchive(JSON.stringify([{ id: "x" }]))
        expect(entries[0].stats).toEqual({ speed: 0, stamina: 0, power: 0, guts: 0, wit: 0 })
        expect(entries[0].raceRecords).toEqual([])
        expect(entries[0].elapsedMs).toBe(-1)
    })
})

describe("toCareerRunRecord", () => {
    test("narrows to the analyzer subset", () => {
        const entry = parseCareerRunArchive(JSON.stringify([rawEntry()]))[0]
        const record = toCareerRunRecord(entry)
        expect(record).toEqual({
            id: "run-1",
            scenario: "Unity Cup",
            traineeName: "Nishino Flower",
            careerRank: "B",
            raceWins: 12,
            raceLosses: 3,
            raceRecords: entry.raceRecords,
            skillPoints: 900,
            stats: entry.stats,
        })
    })
})

describe("resolveDistance", () => {
    test("honors an explicit override", () => {
        expect(resolveDistance("Medium", { SPRINT: "A" })).toBe("Medium")
    })

    test("picks the best aptitude when Auto", () => {
        expect(resolveDistance("Auto", { SPRINT: "A", MILE: "B", MEDIUM: "D", LONG: "F" })).toBe("Sprint")
        expect(resolveDistance("Auto", { SPRINT: "C", MILE: "S", MEDIUM: "D" })).toBe("Mile")
    })

    test("defaults to Sprint when there is nothing to go on", () => {
        expect(resolveDistance("Auto", {})).toBe("Sprint")
    })
})

describe("buildAutoTuneInput", () => {
    const slice: AutoTuneSettingsSlice = {
        statPrioritization: ["Speed", "Power", "Wit", "Guts", "Stamina"],
        preferredDistanceOverride: "Sprint",
        trainingStatTarget: {
            trainingSprintStatTarget_speedStatTarget: 1200,
            trainingSprintStatTarget_staminaStatTarget: 400,
            trainingSprintStatTarget_powerStatTarget: 900,
            trainingSprintStatTarget_gutsStatTarget: 600,
            trainingSprintStatTarget_witStatTarget: 850,
        },
        maximumFailureChance: 18,
    }

    test("assembles the analyzer input from settings + a run", () => {
        const entry = parseCareerRunArchive(JSON.stringify([rawEntry()]))[0]
        const input = buildAutoTuneInput(slice, entry)
        expect(input.preferredDistance).toBe("Sprint")
        expect(input.targets).toEqual({ speed: 1200, stamina: 400, power: 900, guts: 600, wit: 850 })
        expect(input.maximumFailureChance).toBe(18)
        expect(input.statPrioritization).toEqual(["Speed", "Power", "Wit", "Guts", "Stamina"])
    })

    test("resolves the distance from the run's aptitudes when the override is Auto", () => {
        const entry: CareerRunArchiveEntry = { ...parseCareerRunArchive(JSON.stringify([rawEntry()]))[0], distanceAptitudes: { MILE: "S", SPRINT: "B" } }
        const input = buildAutoTuneInput({ ...slice, preferredDistanceOverride: "Auto" }, entry)
        expect(input.preferredDistance).toBe("Mile")
    })
})
