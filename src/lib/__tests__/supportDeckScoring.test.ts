import {
    scoreSupportCardForGoal,
    rankSupportsForGoal,
    scoreOwnedSupportDeck,
    raceBonusScore,
    clampLimitBreak,
    limitBreakScoreMultiplier,
    MAX_LIMIT_BREAK,
} from "../supportDeckScoring"

describe("supportDeckScoring", () => {
    it("scoreSupportCardForGoal prefers wit cards on skill-hints route", () => {
        const witScore = scoreSupportCardForGoal("Agnes Tachyon", "skill-hints")
        const speedScore = scoreSupportCardForGoal("Maruzensky", "skill-hints")
        expect(witScore).toBeGreaterThan(speedScore)
    })

    it("scoreSupportCardForGoal prefers speed cards on mile-sprint route", () => {
        const speedScore = scoreSupportCardForGoal("Silence Suzuka", "mile-sprint")
        const staminaScore = scoreSupportCardForGoal("Super Creek", "mile-sprint")
        expect(speedScore).toBeGreaterThan(staminaScore)
    })

    it("rankSupportsForGoal excludes trainee and sorts by score", () => {
        const ranked = rankSupportsForGoal(
            ["Grass Wonder", "Silence Suzuka", "Maruzensky"],
            "mile-sprint",
            ["Grass Wonder"],
        )
        expect(ranked).not.toContain("Grass Wonder")
        expect(ranked[0]).toBe("Silence Suzuka")
    })

    it("scoreOwnedSupportDeck rewards type targets and metadata", () => {
        const sprintDeck = scoreOwnedSupportDeck(
            ["Silence Suzuka", "Maruzensky", "King Halo", "Seiun Sky"],
            "mile-sprint",
        )
        const staminaDeck = scoreOwnedSupportDeck(
            ["Super Creek", "Mejiro McQueen", "Biwa Hayahide", "Symboli Rudolf"],
            "mile-sprint",
        )
        expect(sprintDeck).toBeGreaterThan(staminaDeck)
    })

    it("scoreSupportCardForGoal prefers SSR scraped stats over R cards on same route", () => {
        const ssrScore = scoreSupportCardForGoal("Kitasan Black", "mile-sprint")
        const rScore = scoreSupportCardForGoal("Maruzensky", "mile-sprint")
        expect(ssrScore).toBeGreaterThan(rScore)
    })

    it("scoreSupportCardForGoal weights hint cards higher on skill-hints route", () => {
        const hintScore = scoreSupportCardForGoal("Gold Ship", "skill-hints")
        const speedScore = scoreSupportCardForGoal("Maruzensky", "skill-hints")
        expect(hintScore).toBeGreaterThan(speedScore)
    })

    it("raceBonusScore reads the scraped in-kit race bonus stat", () => {
        expect(raceBonusScore("Super Creek")).toBe(10)
        expect(raceBonusScore("Maruzensky")).toBe(5)
        expect(raceBonusScore("Silence Suzuka")).toBe(0)
    })

    it("rankSupportsForGoal sorts by goal fit by default, ignoring race bonus", () => {
        const ranked = rankSupportsForGoal(["Silence Suzuka", "Maruzensky"], "mile-sprint")
        expect(ranked[0]).toBe("Silence Suzuka")
    })

    it("rankSupportsForGoal with 'raceBonus' sort mode ranks by in-kit race bonus first", () => {
        const ranked = rankSupportsForGoal(["Silence Suzuka", "Maruzensky"], "mile-sprint", [], [], "raceBonus")
        expect(ranked[0]).toBe("Maruzensky")
    })

    it("clampLimitBreak clamps to 0-4 and rounds", () => {
        expect(clampLimitBreak(-1)).toBe(0)
        expect(clampLimitBreak(5)).toBe(MAX_LIMIT_BREAK)
        expect(clampLimitBreak(2.6)).toBe(3)
    })

    it("limitBreakScoreMultiplier increases monotonically toward MLB", () => {
        const multipliers = [0, 1, 2, 3, 4].map(limitBreakScoreMultiplier)
        for (let i = 1; i < multipliers.length; i++) {
            expect(multipliers[i]).toBeGreaterThan(multipliers[i - 1])
        }
        expect(limitBreakScoreMultiplier(MAX_LIMIT_BREAK)).toBe(1)
    })

    it("scoreSupportCardForGoal scales down for lower limit break levels", () => {
        const mlbScore = scoreSupportCardForGoal("Kitasan Black", "mile-sprint", 0, MAX_LIMIT_BREAK)
        const lb0Score = scoreSupportCardForGoal("Kitasan Black", "mile-sprint", 0, 0)
        expect(lb0Score).toBeLessThan(mlbScore)
    })

    it("scoreOwnedSupportDeck applies a per-card limit break resolver", () => {
        const cards = ["Kitasan Black", "Maruzensky", "King Halo", "Seiun Sky"]
        const mlbDeck = scoreOwnedSupportDeck(cards, "mile-sprint")
        const lowBreakDeck = scoreOwnedSupportDeck(cards, "mile-sprint", [], () => 0)
        expect(lowBreakDeck).toBeLessThan(mlbDeck)
    })
})
