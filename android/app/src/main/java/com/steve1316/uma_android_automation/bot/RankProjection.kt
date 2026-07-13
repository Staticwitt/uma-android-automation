package com.steve1316.uma_android_automation.bot

import com.steve1316.uma_scoring.scoreToRankLabel

/**
 * A projected final rank, extrapolated from the per-turn Estimated Rank score trajectory.
 *
 * @property currentTurn The latest observed turn.
 * @property currentScore The latest observed Estimated Rank total score.
 * @property currentGrade The grade for [currentScore].
 * @property projectedScore The extrapolated total score at career end (floored at [currentScore] — rating only climbs).
 * @property projectedGrade The grade for [projectedScore].
 * @property scorePerTurn The fitted score gained per turn (least-squares slope).
 */
data class RankProjectionResult(
    val currentTurn: Int,
    val currentScore: Int,
    val currentGrade: String,
    val projectedScore: Int,
    val projectedGrade: String,
    val scorePerTurn: Double,
)

/**
 * Accumulates the per-turn Estimated Rank score (`estimateRank(...).totalScore`) during a run and extrapolates the final rank at
 * career end, so the run can show mid-career what grade it is on track for. The extrapolation is a least-squares fit floored at
 * the current score (rating only ever climbs). The pure fit helpers take explicit points so they are unit-testable; the object
 * holds the live run's observations and is reset at run start.
 */
object RankProjection {
    /** The career turn the projection extrapolates to (the finale). */
    const val DEFAULT_FINALE_TURN = 73

    private val observations = mutableListOf<Pair<Int, Int>>() // (turn, score), one per turn

    /** Clears the accumulated observations. Call at run start. */
    fun reset() = observations.clear()

    /** Records a turn's Estimated Rank score, replacing any prior observation for the same turn. */
    fun record(turn: Int, score: Int) {
        observations.removeAll { it.first == turn }
        observations.add(turn to score)
    }

    fun hasData(): Boolean = observations.isNotEmpty()

    /** Projects the final rank at [totalTurns] from the live observations, or null when none have been recorded. */
    fun project(totalTurns: Int): RankProjectionResult? = projectFrom(observations, totalTurns)

    /**
     * Least-squares slope of score over turn. Returns 0 with fewer than two points or when the turns do not vary.
     *
     * @param points (turn, score) observations.
     * @return Score gained per turn.
     */
    fun slope(points: List<Pair<Int, Int>>): Double {
        if (points.size < 2) return 0.0
        val n = points.size
        val meanT = points.sumOf { it.first }.toDouble() / n
        val meanS = points.sumOf { it.second }.toDouble() / n
        var cov = 0.0
        var varT = 0.0
        for ((t, s) in points) {
            cov += (t - meanT) * (s - meanS)
            varT += (t - meanT) * (t - meanT)
        }
        return if (varT == 0.0) 0.0 else cov / varT
    }

    /**
     * Pure projection over an explicit observation list.
     *
     * @param points (turn, score) observations (need at least one).
     * @param totalTurns The final career turn to project to.
     * @return The projection, or null when [points] is empty.
     */
    fun projectFrom(points: List<Pair<Int, Int>>, totalTurns: Int): RankProjectionResult? {
        if (points.isEmpty()) return null
        val current = points.maxByOrNull { it.first }!!
        val m = slope(points)
        val turnsLeft = maxOf(0, totalTurns - current.first)
        val projectedScore = maxOf(current.second, Math.round(current.second + m * turnsLeft).toInt())
        return RankProjectionResult(
            currentTurn = current.first,
            currentScore = current.second,
            currentGrade = scoreToRankLabel(current.second),
            projectedScore = projectedScore,
            projectedGrade = scoreToRankLabel(projectedScore),
            scorePerTurn = m,
        )
    }
}
