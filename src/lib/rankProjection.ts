/**
 * Final-rank projection.
 *
 * The bot reads an Estimated Rank ("C (3831)") each turn. This extrapolates the rating trajectory to the end of the career so
 * the run can show, mid-career, roughly what final grade it is on track for — and whether it will clear a target grade (e.g. the
 * grade needed to place well in a Champions Meeting). Rating only ever climbs, so the projection is floored at the current rating.
 *
 * Pure and dependency-free. The rating->grade mapping is supplied by the caller (the game's real RANK_MINS/RANK_LABELS table)
 * rather than duplicated here, so the projection stays a small, unit-testable numeric core.
 */

/** A per-turn rating observation. */
export interface RankObservation {
    turn: number
    rating: number
}

/** A grade band: the minimum rating required to reach `grade`. Sorted ascending by `minRating` by the consumer helpers. */
export interface GradeThreshold {
    grade: string
    minRating: number
}

export interface RankProjection {
    currentTurn: number
    currentRating: number
    currentGrade: string
    /** Projected rating at the end of the career (floored at the current rating). */
    projectedRating: number
    projectedGrade: string
    /** Fitted rating gained per turn (least-squares slope over the observations; 0 with fewer than two). */
    ratingPerTurn: number
}

/**
 * Resolves the grade for a rating: the highest grade whose minimum rating the value meets.
 *
 * @param rating The rating to classify.
 * @param thresholds Grade bands (any order; sorted internally).
 * @returns The grade label, or the lowest band's grade when the rating is below every threshold.
 */
export function gradeForRating(rating: number, thresholds: GradeThreshold[]): string {
    if (thresholds.length === 0) return ""
    const sorted = [...thresholds].sort((a, b) => a.minRating - b.minRating)
    let grade = sorted[0].grade
    for (const t of sorted) {
        if (rating >= t.minRating) grade = t.grade
        else break
    }
    return grade
}

/** Least-squares slope of rating over turn. Returns 0 when there are fewer than two points or the turns don't vary. */
function ratingSlope(obs: RankObservation[]): number {
    if (obs.length < 2) return 0
    const n = obs.length
    const meanT = obs.reduce((s, o) => s + o.turn, 0) / n
    const meanR = obs.reduce((s, o) => s + o.rating, 0) / n
    let cov = 0
    let varT = 0
    for (const o of obs) {
        cov += (o.turn - meanT) * (o.rating - meanR)
        varT += (o.turn - meanT) ** 2
    }
    return varT === 0 ? 0 : cov / varT
}

/**
 * Projects the final rank at the end of the career from the rating trajectory so far.
 *
 * @param observations Per-turn rating observations (at least one; more improve the slope estimate).
 * @param currentTurn The trainee's current turn.
 * @param totalTurns The final career turn to project to (e.g. 73 for a standard career).
 * @param thresholds The rating->grade table.
 * @returns The projection, or null when there are no observations.
 */
export function projectFinalRank(observations: RankObservation[], currentTurn: number, totalTurns: number, thresholds: GradeThreshold[]): RankProjection | null {
    if (observations.length === 0) return null

    // Current = the latest observation at or before the current turn (fall back to the last observation).
    const atOrBefore = observations.filter((o) => o.turn <= currentTurn)
    const current = (atOrBefore.length > 0 ? atOrBefore : observations).reduce((latest, o) => (o.turn >= latest.turn ? o : latest))

    const slope = ratingSlope(observations)
    const turnsLeft = Math.max(0, totalTurns - current.turn)
    const projectedRating = Math.max(current.rating, Math.round(current.rating + slope * turnsLeft))

    return {
        currentTurn,
        currentRating: current.rating,
        currentGrade: gradeForRating(current.rating, thresholds),
        projectedRating,
        projectedGrade: gradeForRating(projectedRating, thresholds),
        ratingPerTurn: slope,
    }
}

/**
 * Whether the projected final rank clears a target grade.
 *
 * @param projection A projection from [projectFinalRank].
 * @param targetGrade The grade to clear (must exist in `thresholds`).
 * @param thresholds The rating->grade table.
 * @returns True when the projected rating meets the target grade's minimum.
 */
export function isOnTrackForGrade(projection: RankProjection, targetGrade: string, thresholds: GradeThreshold[]): boolean {
    const target = thresholds.find((t) => t.grade === targetGrade)
    if (!target) return false
    return projection.projectedRating >= target.minRating
}
