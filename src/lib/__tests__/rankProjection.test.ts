import { projectFinalRank, gradeForRating, isOnTrackForGrade } from "../rankProjection"
import type { GradeThreshold, RankObservation } from "../rankProjection"

/** A small illustrative rank table (the real caller supplies the game's full RANK_MINS/RANK_LABELS). */
const grades: GradeThreshold[] = [
    { grade: "E", minRating: 2000 },
    { grade: "D", minRating: 3000 },
    { grade: "C", minRating: 4000 },
    { grade: "B", minRating: 5500 },
    { grade: "A", minRating: 7000 },
    { grade: "S", minRating: 9000 },
]

describe("gradeForRating", () => {
    test("returns the highest grade whose minimum is met", () => {
        expect(gradeForRating(4500, grades)).toBe("C")
        expect(gradeForRating(7000, grades)).toBe("A")
        expect(gradeForRating(9999, grades)).toBe("S")
    })

    test("returns the lowest band below every threshold", () => {
        expect(gradeForRating(0, grades)).toBe("E")
    })
})

describe("projectFinalRank", () => {
    test("extrapolates a steady climb to the final turn and up a grade", () => {
        // ~150 rating/turn; from 3831 at turn 55 to turn 73 -> +18*150 ≈ +2700 -> ~6500 -> grade B.
        const obs: RankObservation[] = [
            { turn: 45, rating: 2300 },
            { turn: 50, rating: 3050 },
            { turn: 55, rating: 3831 },
        ]
        const proj = projectFinalRank(obs, 55, 73, grades)!
        expect(proj.currentGrade).toBe("D")
        expect(proj.ratingPerTurn).toBeGreaterThan(140)
        expect(proj.projectedRating).toBeGreaterThan(6000)
        expect(proj.projectedGrade).toBe("B")
    })

    test("never projects below the current rating", () => {
        // A declining/noisy slope must not drag the projection under what's already banked.
        const obs: RankObservation[] = [
            { turn: 40, rating: 5000 },
            { turn: 50, rating: 5200 },
            { turn: 60, rating: 5100 },
        ]
        const proj = projectFinalRank(obs, 60, 73, grades)!
        expect(proj.projectedRating).toBeGreaterThanOrEqual(proj.currentRating)
    })

    test("a single observation yields a flat projection (no slope)", () => {
        const proj = projectFinalRank([{ turn: 60, rating: 5000 }], 60, 73, grades)!
        expect(proj.ratingPerTurn).toBe(0)
        expect(proj.projectedRating).toBe(5000)
        expect(proj.projectedGrade).toBe("C")
    })

    test("uses the latest observation at or before the current turn as current", () => {
        const obs: RankObservation[] = [
            { turn: 50, rating: 4000 },
            { turn: 55, rating: 4500 },
            { turn: 60, rating: 5000 },
        ]
        const proj = projectFinalRank(obs, 55, 73, grades)!
        expect(proj.currentRating).toBe(4500)
    })

    test("returns null with no observations", () => {
        expect(projectFinalRank([], 60, 73, grades)).toBeNull()
    })

    test("already at the final turn projects the current rating unchanged", () => {
        const obs: RankObservation[] = [
            { turn: 71, rating: 6800 },
            { turn: 73, rating: 7100 },
        ]
        const proj = projectFinalRank(obs, 73, 73, grades)!
        expect(proj.projectedRating).toBe(7100)
        expect(proj.projectedGrade).toBe("A")
    })
})

describe("isOnTrackForGrade", () => {
    test("true when the projection clears the target grade minimum", () => {
        const proj = projectFinalRank(
            [
                { turn: 45, rating: 2300 },
                { turn: 55, rating: 3900 },
            ],
            55,
            73,
            grades,
        )!
        expect(isOnTrackForGrade(proj, "B", grades)).toBe(true)
        expect(isOnTrackForGrade(proj, "S", grades)).toBe(false)
    })

    test("false for an unknown target grade", () => {
        const proj = projectFinalRank([{ turn: 60, rating: 5000 }], 60, 73, grades)!
        expect(isOnTrackForGrade(proj, "ZZ", grades)).toBe(false)
    })
})
