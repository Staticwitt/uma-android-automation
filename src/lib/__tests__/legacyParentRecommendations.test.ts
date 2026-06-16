import {
    recommendLegacyParents,
    findLegacyParentPreset,
    excludeTraineeFromLegacyParentPair,
} from "../legacyParentRecommendations"

describe("legacyParentRecommendations", () => {
    it("findLegacyParentPreset returns preset pair", () => {
        expect(findLegacyParentPreset("skill-hints")).toEqual(["Kitasan Black", "Agnes Tachyon"])
    })

    it("recommendLegacyParents uses goal preset pair", () => {
        const rec = recommendLegacyParents("classic-crown", "StatAndAptitude")
        expect(rec.parentOne).toBe("Symboli Rudolf")
        expect(rec.parentTwo).toBe("Mejiro McQueen")
        expect(rec.rationale).toContain("stat")
    })

    it("excludeTraineeFromLegacyParentPair removes trainee and backfills", () => {
        const [first, second] = excludeTraineeFromLegacyParentPair(
            ["Silence Suzuka", "Grass Wonder"],
            "Grass Wonder",
        )
        expect(first).toBe("Silence Suzuka")
        expect(second).not.toBe("Grass Wonder")
        expect(second.length).toBeGreaterThan(0)
    })

    it("recommendLegacyParents excludes trainee from mile-sprint preset", () => {
        const rec = recommendLegacyParents("mile-sprint", "StatAndAptitude", "Grass Wonder")
        expect(rec.parentOne).toBe("Silence Suzuka")
        expect(rec.parentTwo).not.toBe("Grass Wonder")
        expect(rec.parentTwo.length).toBeGreaterThan(0)
    })
})
