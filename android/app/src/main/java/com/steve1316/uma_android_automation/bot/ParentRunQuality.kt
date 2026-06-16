package com.steve1316.uma_android_automation.bot

import org.json.JSONObject

/** Letter grade and numeric score for comparing parent-farming runs. */
object ParentRunQuality {
    private const val DEFAULT_FAN_BENCHMARK = 120_000

    data class Breakdown(
        val epithetScore: Double,
        val fanScore: Double,
        val forcedScore: Double,
        val raceScore: Double,
        val bonusScore: Double,
        val total: Int,
    )

    data class Result(
        val score: Int,
        val grade: String,
        val breakdown: Breakdown,
    )

    fun gradeFromScore(score: Int): String =
        when {
            score >= 90 -> "S"
            score >= 80 -> "A"
            score >= 70 -> "B"
            score >= 60 -> "C"
            else -> "D"
        }

    /** Composite 0–100 score: epithets (40), fans (25), forced routes (20), race WR (10), extras (5). */
    fun score(input: ParentRunSummaryInput): Result {
        val targetCount = input.targetEpithets.size.coerceAtLeast(1)
        val epithetScore = (input.completedTargetEpithets.size.toDouble() / targetCount) * 40.0

        val fanFloor = if (input.minimumFanTarget > 0) input.minimumFanTarget else DEFAULT_FAN_BENCHMARK
        val fanScore = (input.trainee.fans.toDouble() / fanFloor).coerceAtMost(1.0) * 25.0

        val completed = buildSet {
            addAll(input.completedTargetEpithets)
            addAll(input.extraCompletedEpithets)
        }
        val forcedScore =
            if (input.forcedEpithets.isEmpty()) {
                20.0
            } else {
                val hit = input.forcedEpithets.count { completed.contains(it) }
                (hit.toDouble() / input.forcedEpithets.size) * 20.0
            }

        val totalRaces = input.raceStats.wins + input.raceStats.losses
        val raceScore =
            if (totalRaces > 0) {
                (input.raceStats.wins.toDouble() / totalRaces) * 10.0
            } else {
                5.0
            }

        val bonusScore = input.extraCompletedEpithets.size.coerceAtMost(5).toDouble()

        val rawTotal = epithetScore + fanScore + forcedScore + raceScore + bonusScore
        val score = rawTotal.toInt().coerceIn(0, 100)
        val breakdown =
            Breakdown(
                epithetScore = round1(epithetScore),
                fanScore = round1(fanScore),
                forcedScore = round1(forcedScore),
                raceScore = round1(raceScore),
                bonusScore = round1(bonusScore),
                total = score,
            )
        return Result(score = score, grade = gradeFromScore(score), breakdown = breakdown)
    }

    fun breakdownToJson(breakdown: Breakdown): JSONObject =
        JSONObject()
            .put("epithetScore", breakdown.epithetScore)
            .put("fanScore", breakdown.fanScore)
            .put("forcedScore", breakdown.forcedScore)
            .put("raceScore", breakdown.raceScore)
            .put("bonusScore", breakdown.bonusScore)
            .put("total", breakdown.total)

    private fun round1(value: Double): Double = kotlin.math.round(value * 10.0) / 10.0
}
