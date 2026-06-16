import {
    findBestRunForCharacter,
    formatEpithetDelta,
    gradeFromScore,
    scoreParentRun,
} from "../parentQuality"
import type { ParentRunArchiveEntry } from "../parentRunArchive"

const baseEntry = (overrides: Partial<ParentRunArchiveEntry> = {}): ParentRunArchiveEntry => ({
    id: "run-1",
    completedAtMs: 1000,
    scenario: "Trackblazer",
    profileName: "",
    bundleLabel: "",
    goalPresetLabel: "G1 Fans",
    characterPreset: "Special Week",
    traineeName: "Special Week",
    sparkStrategy: "StatAndAptitude",
    targetEpithets: ["Globe-Trotter", "Fan Favorite"],
    forcedEpithets: ["Globe-Trotter"],
    completedTargetEpithets: ["Globe-Trotter"],
    incompleteTargetEpithets: ["Fan Favorite"],
    extraCompletedEpithets: ["Speed Star"],
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
    ...overrides,
})

describe("parentQuality", () => {
    it("grades high scores as S or A", () => {
        expect(gradeFromScore(92)).toBe("S")
        expect(gradeFromScore(81)).toBe("A")
    })

    it("weights epithets, fans, and forced routes", () => {
        const result = scoreParentRun(baseEntry())
        expect(result.score).toBeGreaterThan(50)
        expect(result.score).toBeLessThanOrEqual(100)
        expect(result.breakdown.epithetScore).toBeGreaterThan(0)
        expect(result.breakdown.forcedScore).toBe(20)
    })

    it("finds best run for character", () => {
        const runs = [
            baseEntry({ id: "a", fans: 100000, completedTargetEpithets: [] }),
            baseEntry({ id: "b", fans: 250000, completedTargetEpithets: ["Globe-Trotter", "Fan Favorite"], incompleteTargetEpithets: [] }),
        ]
        expect(findBestRunForCharacter(runs, "Special Week")?.id).toBe("b")
    })

    it("formats epithet delta between runs", () => {
        const previous = baseEntry({ completedTargetEpithets: ["Globe-Trotter"] })
        const current = baseEntry({ completedTargetEpithets: ["Globe-Trotter", "Fan Favorite"] })
        expect(formatEpithetDelta(current, previous)).toContain("Fan Favorite")
    })
})
