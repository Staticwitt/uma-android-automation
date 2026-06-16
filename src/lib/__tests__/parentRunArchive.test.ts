jest.mock("react-native", () => ({
    NativeModules: {
        StartModule: {
            getParentRunArchive: jest.fn(async () => "[]"),
            clearParentRunArchive: jest.fn(async () => undefined),
        },
    },
}))

import {
    findPreviousRunForCharacter,
    formatFansDelta,
    parseParentRunArchive,
    type ParentRunArchiveEntry,
} from "../parentRunArchive"

const sampleRun = (id: string, character: string, fans: number, completedAtMs: number): ParentRunArchiveEntry => ({
    id,
    completedAtMs,
    scenario: "Trackblazer",
    profileName: "",
    bundleLabel: "",
    goalPresetLabel: "",
    characterPreset: character,
    traineeName: character,
    sparkStrategy: "StatAndAptitude",
    targetEpithets: [],
    forcedEpithets: [],
    completedTargetEpithets: [],
    incompleteTargetEpithets: [],
    extraCompletedEpithets: [],
    sparkPicks: [],
    fanWeight: 1,
    minimumFanTarget: 0,
    raceWins: 10,
    raceLosses: 1,
    elapsedMs: 3600000,
    trainingBias: "",
    fans,
    fanClass: "GOLD",
    skillPoints: 400,
    stats: { speed: 900, stamina: 800, power: 700, guts: 400, wit: 500 },
})

describe("parseParentRunArchive", () => {
    it("parses valid archive json", () => {
        const json = JSON.stringify([
            {
                id: "run-1",
                completedAtMs: 1000,
                scenario: "Trackblazer",
                characterPreset: "Grass Wonder",
                traineeName: "Grass Wonder",
                fans: 120000,
                stats: { speed: 1, stamina: 2, power: 3, guts: 4, wit: 5 },
            },
        ])
        const runs = parseParentRunArchive(json)
        expect(runs.length).toBe(1)
        expect(runs[0].characterPreset).toBe("Grass Wonder")
        expect(runs[0].fans).toBe(120000)
    })
})

describe("findPreviousRunForCharacter", () => {
    it("finds older run with same character preset", () => {
        const runs = [
            sampleRun("new", "Special Week", 200000, 3000),
            sampleRun("old", "Grass Wonder", 100000, 2000),
            sampleRun("older", "Special Week", 150000, 1000),
        ]
        const previous = findPreviousRunForCharacter(runs, runs[0])
        expect(previous?.id).toBe("older")
    })
})

describe("formatFansDelta", () => {
    it("formats positive and negative deltas", () => {
        expect(formatFansDelta(200000, 150000)).toContain("+50,000")
        expect(formatFansDelta(100000, 150000)).toContain("-50,000")
    })
})
