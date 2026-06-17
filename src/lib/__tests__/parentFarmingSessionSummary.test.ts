import type { ParentRunArchiveEntry } from "../parentRunArchive"
import { formatParentFarmingSessionSummary, latestSessionId } from "../parentFarmingSessionSummary"

jest.mock("../parentRunArchive", () => ({
    findBestRunInSession: (runs: ParentRunArchiveEntry[]) => runs[runs.length - 1] ?? null,
}))

const baseRun = (overrides: Partial<ParentRunArchiveEntry> = {}): ParentRunArchiveEntry =>
    ({
        id: "run-1",
        completedAtMs: 1000,
        scenario: "Trackblazer",
        profileName: "",
        bundleLabel: "",
        goalPresetLabel: "G1 Fans",
        characterPreset: "Special Week",
        traineeName: "Special Week",
        sparkStrategy: "StatAndAptitude",
        targetEpithets: ["Globe-Trotter"],
        forcedEpithets: [],
        completedTargetEpithets: ["Globe-Trotter"],
        incompleteTargetEpithets: [],
        extraCompletedEpithets: [],
        sparkPicks: [],
        fanWeight: 1,
        minimumFanTarget: 120000,
        raceWins: 18,
        raceLosses: 2,
        elapsedMs: 3600000,
        trainingBias: "",
        fans: 180000,
        fanClass: "GOLD",
        skillPoints: 500,
        stats: { speed: 900, stamina: 800, power: 700, guts: 400, wit: 500 },
        sessionId: "session-a",
        sessionRunIndex: 1,
        qualityScore: 85,
        qualityGrade: "A",
        ...overrides,
    }) as ParentRunArchiveEntry

describe("parentFarmingSessionSummary", () => {
    it("returns empty text when no runs match the session", () => {
        expect(formatParentFarmingSessionSummary([], "missing")).toBe("")
    })

    it("builds a clipboard-friendly session summary", () => {
        const runs = [
            baseRun({ id: "run-1", sessionRunIndex: 1, fans: 150000, qualityScore: 75, qualityGrade: "B" }),
            baseRun({ id: "run-2", sessionRunIndex: 2, fans: 190000, qualityScore: 88, qualityGrade: "A", completedAtMs: 2000 }),
        ]
        const text = formatParentFarmingSessionSummary(runs, "session-a")
        expect(text).toContain("Parent Farming Session Summary")
        expect(text).toContain("Runs: 2")
        expect(text).toContain("All runs:")
        expect(text).toContain("#1")
        expect(text).toContain("#2")
    })

    it("finds the latest session id from saved runs", () => {
        const runs = [
            baseRun({ id: "run-1", sessionId: "older", completedAtMs: 1000 }),
            baseRun({ id: "run-2", sessionId: "newer", completedAtMs: 3000 }),
        ]
        expect(latestSessionId(runs)).toBe("newer")
    })
})
