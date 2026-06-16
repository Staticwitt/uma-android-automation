jest.mock("react-native", () => ({
    NativeModules: {
        StartModule: {
            getParentRunArchive: jest.fn(async () => "[]"),
            clearParentRunArchive: jest.fn(async () => undefined),
        },
    },
}))

import { parseParentRunArchive, formatQualityTrendLine, formatParentRunExportEntry } from "../parentRunArchive"
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

describe("parentRunArchive extensions", () => {
    it("parseParentRunArchive reads session and inheritance fields", () => {
        const json = JSON.stringify([sampleEntry({})])
        const parsed = parseParentRunArchive(json)
        expect(parsed[0]?.sessionId).toBe("session-a")
        expect(parsed[0]?.isSessionBest).toBe(true)
        expect(parsed[0]?.inheritanceSummary).toContain("Sp 1000")
    })

    it("formatQualityTrendLine renders grade sequence", () => {
        const runs = [
            sampleEntry({ id: "1", qualityScore: 85, qualityGrade: "A" }),
            sampleEntry({ id: "2", qualityScore: 72, qualityGrade: "B" }),
        ]
        expect(formatQualityTrendLine(runs)).toBe("A → B")
    })

    it("formatParentRunExportEntry includes quality and inheritance", () => {
        const text = formatParentRunExportEntry(sampleEntry({}))
        expect(text).toContain("Special Week")
        expect(text).toContain("A · 85/100")
        expect(text).toContain("inheritance")
    })
})
