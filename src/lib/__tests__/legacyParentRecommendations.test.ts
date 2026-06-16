import { recommendLegacyParents, findLegacyParentPreset } from "../legacyParentRecommendations"

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
})
