jest.mock("react-native", () => ({
    NativeModules: {
        StartModule: {
            getParentRunArchive: jest.fn(async () => "[]"),
            clearParentRunArchive: jest.fn(async () => undefined),
        },
    },
}))

import { buildLineage, formatLineageGenerationLabel, listSessionIds } from "../parentFarmingLineage"
import type { ParentRunArchiveEntry } from "../parentRunArchive"

const sampleEntry = (overrides: Partial<ParentRunArchiveEntry>): ParentRunArchiveEntry => ({
    id: "1",
    completedAtMs: 1,
    scenario: "Trackblazer",
    profileName: "",
    bundleLabel: "",
    goalPresetLabel: "G1",
    characterPreset: "Special Week",
    traineeName: "Special Week",
    sparkStrategy: "StatAndAptitude",
    targetEpithets: ["G1 Hunter"],
    forcedEpithets: [],
    completedTargetEpithets: ["G1 Hunter"],
    incompleteTargetEpithets: [],
    extraCompletedEpithets: [],
    sparkPicks: [],
    fanWeight: 0,
    minimumFanTarget: 120000,
    raceWins: 10,
    raceLosses: 1,
    elapsedMs: 60000,
    trainingBias: "",
    fans: 130000,
    fanClass: "CLASS_1",
    skillPoints: 900,
    stats: { speed: 1000, stamina: 900, power: 800, guts: 700, wit: 600 },
    qualityScore: 85,
    qualityGrade: "A",
    sessionId: "session-a",
    sessionRunIndex: 1,
    isSessionBest: true,
    inheritanceSummary: "Sp 1000 · Sta 900",
    ...overrides,
})

describe("parentFarmingLineage", () => {
    const runs: ParentRunArchiveEntry[] = [
        sampleEntry({ id: "1", sessionId: "session-a", sessionRunIndex: 1, traineeName: "Grass Wonder", completedAtMs: 100 }),
        sampleEntry({ id: "2", sessionId: "session-a", sessionRunIndex: 2, traineeName: "Oguri Cap", completedAtMs: 200 }),
        sampleEntry({ id: "3", sessionId: "session-b", sessionRunIndex: 1, traineeName: "Special Week", completedAtMs: 300 }),
    ]

    it("listSessionIds returns distinct sessions, most recent first", () => {
        expect(listSessionIds(runs)).toEqual(["session-b", "session-a"])
    })

    it("listSessionIds ignores runs without a sessionId", () => {
        const withUnsessioned = [...runs, sampleEntry({ id: "4", sessionId: undefined })]
        expect(listSessionIds(withUnsessioned)).toEqual(["session-b", "session-a"])
    })

    it("buildLineage orders a session's runs by generation index", () => {
        const lineage = buildLineage(runs, "session-a")
        expect(lineage.map((run) => run.id)).toEqual(["1", "2"])
        expect(lineage.map((run) => run.traineeName)).toEqual(["Grass Wonder", "Oguri Cap"])
    })

    it("buildLineage excludes runs from other sessions", () => {
        const lineage = buildLineage(runs, "session-b")
        expect(lineage.map((run) => run.id)).toEqual(["3"])
    })

    it("formatLineageGenerationLabel includes generation index and trainee", () => {
        expect(formatLineageGenerationLabel(sampleEntry({ sessionRunIndex: 2, traineeName: "Oguri Cap" }), 0)).toBe("Gen 2 — Oguri Cap")
    })
})
