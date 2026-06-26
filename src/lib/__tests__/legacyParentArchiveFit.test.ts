import type { ParentRunArchiveEntry } from "../parentRunArchive"
import {
    collectSparkTexts,
    findBestLegacyParentForCharacter,
    rankLegacyParentsForCharacter,
    scoreLegacyParentFitForCharacter,
} from "../legacyParentArchiveFit"

let nextId = 0

const buildRun = (overrides: Partial<ParentRunArchiveEntry> = {}): ParentRunArchiveEntry => ({
    id: `run-${nextId++}`,
    completedAtMs: Date.now(),
    scenario: "URA",
    profileName: "Default",
    bundleLabel: "",
    goalPresetLabel: "",
    characterPreset: "Special Week",
    traineeName: "Special Week",
    sparkStrategy: "Default",
    targetEpithets: [],
    forcedEpithets: [],
    completedTargetEpithets: [],
    incompleteTargetEpithets: [],
    extraCompletedEpithets: [],
    sparkPicks: [],
    fanWeight: 1,
    minimumFanTarget: 0,
    raceWins: 5,
    raceLosses: 1,
    elapsedMs: 600000,
    trainingBias: "",
    fans: 100000,
    fanClass: "",
    skillPoints: 100,
    stats: { speed: 1000, stamina: 900, power: 800, guts: 700, wit: 600 },
    ...overrides,
})

describe("scoreLegacyParentFitForCharacter", () => {
    it("returns null for an unknown target character", () => {
        expect(scoreLegacyParentFitForCharacter(buildRun(), "Not A Horse")).toBeNull()
    })

    it("scores a parent reinforcing the target's strong aptitudes higher than one that doesn't", () => {
        // Grass Wonder: Sprint G, Mile A, Medium B, Long A, Turf A, Dirt G.
        const reinforcing = buildRun({
            distanceAptitudes: { MILE: "S", LONG: "A" },
            surfaceAptitudes: { TURF: "S" },
        })
        const misaligned = buildRun({
            distanceAptitudes: { SPRINT: "S" },
            surfaceAptitudes: { DIRT: "S" },
        })

        const reinforcingResult = scoreLegacyParentFitForCharacter(reinforcing, "Grass Wonder")!
        const misalignedResult = scoreLegacyParentFitForCharacter(misaligned, "Grass Wonder")!

        expect(reinforcingResult.fitBreakdown.aptitudeScore).toBeGreaterThan(misalignedResult.fitBreakdown.aptitudeScore)
    })

    it("flags runs with no recorded aptitude data instead of penalizing them", () => {
        const result = scoreLegacyParentFitForCharacter(buildRun(), "Grass Wonder")!
        expect(result.reasons).toContain("No aptitude data recorded for this run")
        expect(result.fitBreakdown.aptitudeScore).toBe(25)
    })

    it("surfaces matched spark keywords relevant to the target's build", () => {
        const run = buildRun({ harvestFactors: ["Turf Lover", "Mile Specialist"] })
        const result = scoreLegacyParentFitForCharacter(run, "Grass Wonder")!
        expect(result.matchedSparkKeywords).toEqual(expect.arrayContaining(["turf", "mile"]))
        expect(result.reasons.some((r) => r.startsWith("Sparks match this build"))).toBe(true)
    })
})

describe("collectSparkTexts", () => {
    it("prefers harvestFactors over raw spark-pick option text", () => {
        const run = buildRun({
            harvestFactors: ["Uma Stan (Gold)"],
            sparkPicks: [{ pickIndex: 0, strategy: "Default", optionTexts: ["Some raw OCR text"] }],
        })
        expect(collectSparkTexts(run)).toEqual(["Uma Stan (Gold)"])
    })

    it("falls back to the picked spark-pick option text when no harvest factors exist", () => {
        const run = buildRun({
            sparkPicks: [{ pickIndex: 1, strategy: "Default", optionTexts: ["Option A", "Option B"] }],
        })
        expect(collectSparkTexts(run)).toEqual(["Option B"])
    })
})

describe("rankLegacyParentsForCharacter / findBestLegacyParentForCharacter", () => {
    it("ranks runs best-fit first and agrees with findBestLegacyParentForCharacter", () => {
        const strong = buildRun({ distanceAptitudes: { MILE: "S", LONG: "S" }, surfaceAptitudes: { TURF: "S" }, fans: 500000 })
        const weak = buildRun({ distanceAptitudes: { SPRINT: "S" }, surfaceAptitudes: { DIRT: "S" }, fans: 1000 })

        const ranked = rankLegacyParentsForCharacter([weak, strong], "Grass Wonder")
        expect(ranked[0].run).toBe(strong)
        expect(ranked[1].run).toBe(weak)

        const best = findBestLegacyParentForCharacter([weak, strong], "Grass Wonder")
        expect(best?.run).toBe(strong)
    })

    it("returns an empty list and null best for an unknown character", () => {
        expect(rankLegacyParentsForCharacter([buildRun()], "Not A Horse")).toEqual([])
        expect(findBestLegacyParentForCharacter([buildRun()], "Not A Horse")).toBeNull()
    })
})
