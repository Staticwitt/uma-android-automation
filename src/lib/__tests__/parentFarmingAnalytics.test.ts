import { buildParentFarmingAnalytics } from "../parentFarmingAnalytics"
import type { ParentRunArchiveEntry } from "../parentRunArchive"

const sampleRun = (overrides: Partial<ParentRunArchiveEntry>): ParentRunArchiveEntry => ({
    id: overrides.id ?? "1",
    completedAtMs: overrides.completedAtMs ?? 1,
    scenario: overrides.scenario ?? "Trackblazer",
    profileName: overrides.profileName ?? "Default",
    bundleLabel: "",
    goalPresetLabel: "G1",
    characterPreset: overrides.characterPreset ?? "Oguri Cap",
    traineeName: overrides.traineeName ?? "Oguri Cap",
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
    trainingBias: "Auto",
    fans: 150000,
    fanClass: "CLASS_1",
    skillPoints: 500,
    stats: { speed: 1000, stamina: 900, power: 800, guts: 700, wit: 600 },
    qualityScore: overrides.qualityScore ?? 85,
    qualityGrade: overrides.qualityGrade ?? "A",
    ...overrides,
})

describe("parentFarmingAnalytics", () => {
    it("groups runs by profile and character", () => {
        const summary = buildParentFarmingAnalytics([
            sampleRun({ id: "a", profileName: "Farm", qualityScore: 90, qualityGrade: "S" }),
            sampleRun({ id: "b", profileName: "Farm", qualityScore: 70, qualityGrade: "B", traineeName: "Special Week" }),
            sampleRun({ id: "c", profileName: "Alt", qualityScore: 60, qualityGrade: "C" }),
        ])
        expect(summary.totalRuns).toBe(3)
        expect(summary.profiles).toHaveLength(2)
        expect(summary.characters.length).toBeGreaterThanOrEqual(2)
        expect(summary.profiles[0].profileName).toBeTruthy()
    })

    it("groups runs by goal queue slot and ranks by average quality", () => {
        const summary = buildParentFarmingAnalytics([
            sampleRun({ id: "a", goalPresetLabel: "Slot 1", qualityScore: 90, qualityGrade: "S" }),
            sampleRun({ id: "b", goalPresetLabel: "Slot 1", qualityScore: 80, qualityGrade: "A" }),
            sampleRun({ id: "c", goalPresetLabel: "Slot 2", qualityScore: 50, qualityGrade: "D" }),
        ])
        expect(summary.goalPresets).toHaveLength(2)
        expect(summary.goalPresets[0].goalPresetKey).toBe("Slot 1")
        expect(summary.goalPresets[0].avgQuality).toBe(85)
        expect(summary.goalPresets[0].runCount).toBe(2)
        expect(summary.goalPresets[1].goalPresetKey).toBe("Slot 2")
    })

    it("omits the goal-preset breakdown when no run used the goal queue", () => {
        const summary = buildParentFarmingAnalytics([sampleRun({ id: "a", goalPresetLabel: "" })])
        expect(summary.goalPresets).toHaveLength(0)
    })
})
