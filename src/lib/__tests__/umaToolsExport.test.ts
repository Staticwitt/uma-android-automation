import type { ParentRunArchiveEntry } from "../parentRunArchive"
import {
    buildUmaToolsHorseState,
    exportHorseJsonForUmaTools,
    exportRunForUmaTools,
    exportRunForUmaToolsCsv,
} from "../umaToolsExport"

const sampleEntry = (overrides: Partial<ParentRunArchiveEntry> = {}): ParentRunArchiveEntry => ({
    id: "run-1",
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
    stats: { speed: 1100, stamina: 900, power: 800, guts: 700, wit: 600 },
    distanceAptitudes: { SPRINT: "F", MILE: "C", MEDIUM: "A", LONG: "C" },
    surfaceAptitudes: { TURF: "A", DIRT: "G" },
    styleAptitudes: { FRONT_RUNNER: "F", PACE_CHASER: "A", LATE_SURGER: "B", END_CLOSER: "G" },
    qualityScore: 85,
    qualityGrade: "A",
    ...overrides,
})

describe("umaToolsExport", () => {
    it("buildUmaToolsHorseState maps stats and aptitudes for Umalator", () => {
        const horse = buildUmaToolsHorseState(sampleEntry())
        expect(horse.name).toBe("Special Week")
        expect(horse.speed).toBe(1100)
        expect(horse.wisdom).toBe(600)
        expect(horse.strategy).toBe("Senkou")
        expect(horse.distanceAptitude).toBe("A")
        expect(horse.surfaceAptitude).toBe("A")
        expect(horse.aptitudes).toEqual(["F", "C", "A", "C", "F", "A", "B", "G", "A", "G"])
    })

    it("falls back to character preset aptitudes when archive aptitudes are missing", () => {
        const horse = buildUmaToolsHorseState(sampleEntry({ distanceAptitudes: undefined, surfaceAptitudes: undefined }))
        expect(horse.aptitudes[2]).toBe("A")
        expect(horse.aptitudes[8]).toBe("A")
    })

    it("exportRunForUmaTools wraps horse with metadata", () => {
        const json = exportRunForUmaTools(sampleEntry())
        const parsed = JSON.parse(json) as { source: string; horse: { speed: number } }
        expect(parsed.source).toBe("uma-android-automation")
        expect(parsed.horse.speed).toBe(1100)
    })

    it("exportHorseJsonForUmaTools returns horse-only JSON", () => {
        const parsed = JSON.parse(exportHorseJsonForUmaTools(sampleEntry())) as { speed: number; skills: string[] }
        expect(parsed.speed).toBe(1100)
        expect(parsed.skills).toEqual([])
    })

    it("exportRunForUmaToolsCsv matches umalator-ocr column order", () => {
        const csv = exportRunForUmaToolsCsv(sampleEntry())
        const [header, row] = csv.split("\n")
        expect(header).toBe("Name,Epithet,Speed,Stamina,Power,Guts,Wit,Skills,surfaceAptitude,distanceAptitude,strategyAptitude,strategy")
        expect(row).toContain("Special Week,,")
        expect(row).toContain(",Senkou")
    })
})
