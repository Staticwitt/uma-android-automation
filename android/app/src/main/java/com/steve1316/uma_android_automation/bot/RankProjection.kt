package com.steve1316.uma_android_automation.bot

import com.steve1316.uma_scoring.scoreToRankLabel
import kotlin.math.pow

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

    /**
     * Recency half-life, in turns, for the weighted slope. A run's score trajectory is convex - it climbs slowly in Junior/early-Classic, then steeply in Senior as bonds max and
     * rainbows/spirit bursts land - so a flat least-squares fit anchored by the slow early turns badly under-projects mid-run. Weighting each observation by `2^(-turnsAgo/HALF_LIFE)`
     * makes the slope track the recent (steeper) trend, so the projection reflects where the run is actually heading. Points this many turns before the latest count half as much.
     */
    private const val RECENCY_HALF_LIFE_TURNS = 12.0

    private val observations = mutableListOf<Pair<Int, Int>>() // (turn, score), one per turn

    /** Clears the accumulated observations. Call at run start. */
    fun reset() = observations.clear()

    /** Records a turn's Estimated Rank score, replacing any prior observation for the same turn. */
    fun record(turn: Int, score: Int) {
        observations.removeAll { it.first == turn }
        observations.add(turn to score)
    }

    fun hasData(): Boolean = observations.isNotEmpty()

    /** Number of per-turn observations accumulated this run. Used to gate decisions (e.g. auto-abandon) that must not fire on a too-short trajectory, such as right after the bot is started mid-career. */
    fun observationCount(): Int = observations.size

    /** Projects the final rank at [totalTurns] from the live observations, or null when none have been recorded. */
    fun project(totalTurns: Int): RankProjectionResult? = projectFrom(observations, totalTurns)

    /**
     * Recency-weighted least-squares slope of score over turn, weighting each observation by `2^(-turnsAgo / RECENCY_HALF_LIFE_TURNS)` so recent turns dominate the fit and the
     * projection follows the run's accelerating trajectory instead of being dragged down by slow early turns. Reduces to the ordinary slope for a perfectly linear series (any
     * weighting of collinear points recovers the exact slope). Returns 0 with fewer than two points or when the turns do not vary.
     *
     * @param points (turn, score) observations.
     * @return Score gained per turn.
     */
    fun slope(points: List<Pair<Int, Int>>): Double {
        if (points.size < 2) return 0.0
        val latestTurn = points.maxOf { it.first }
        val weights = points.map { 2.0.pow(-(latestTurn - it.first).toDouble() / RECENCY_HALF_LIFE_TURNS) }
        val weightSum = weights.sum()
        var meanT = 0.0
        var meanS = 0.0
        for (i in points.indices) {
            meanT += weights[i] * points[i].first
            meanS += weights[i] * points[i].second
        }
        meanT /= weightSum
        meanS /= weightSum
        var cov = 0.0
        var varT = 0.0
        for (i in points.indices) {
            val dt = points[i].first - meanT
            cov += weights[i] * dt * (points[i].second - meanS)
            varT += weights[i] * dt * dt
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
