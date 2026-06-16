import { scoreSupportCardForGoal, rankSupportsForGoal, scoreOwnedSupportDeck } from "../supportDeckScoring"

describe("supportDeckScoring", () => {
    it("scoreSupportCardForGoal prefers wit cards on skill-hints route", () => {
        const witScore = scoreSupportCardForGoal("Matikanefukukitaru", "skill-hints")
        const speedScore = scoreSupportCardForGoal("Silence Suzuka", "skill-hints")
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
})
