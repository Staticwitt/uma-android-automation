package com.steve1316.uma_android_automation.bot.solver

import com.steve1316.uma_android_automation.types.Aptitude
import com.steve1316.uma_android_automation.types.RaceGrade

/**
 * Heuristic win-probability estimates from aptitudes and race grade. Used to scale expected
 * race/epithet value and to gate risky picks at runtime when [Weights.minWinRateGuard] is set.
 */
object RaceWinModel {
    /** Base win rate from the weaker of distance/surface aptitude (ordinal G=0 .. S=7). */
    private val APT_WIN_RATE: DoubleArray =
        doubleArrayOf(
            0.35, // G
            0.42, // F
            0.50, // E
            0.58, // D
            0.68, // C
            0.78, // B
            0.88, // A
            0.94, // S
        )

    /** Grade difficulty multiplier applied to the aptitude base rate. */
    private fun gradeFactor(grade: RaceGrade): Double =
        when (grade) {
            RaceGrade.G1 -> 0.88
            RaceGrade.G2, RaceGrade.G3 -> 0.93
            RaceGrade.OP, RaceGrade.PRE_OP -> 0.97
            RaceGrade.MAIDEN, RaceGrade.DEBUT -> 0.95
            RaceGrade.FINALE, RaceGrade.EX -> 0.85
        }

    /**
     * Estimated P(win) for [race] given [aptitudes]. Returns a value in (0, 1].
     *
     * @param race Race to evaluate.
     * @param aptitudes Trainee aptitudes at solve time.
     * @return Win probability clamped to [0.05, 0.99].
     */
    fun winProbability(race: RaceCandidate, aptitudes: Aptitudes): Double {
        val dist = aptitudes.forDistance(race.distanceType).ordinal.coerceIn(0, APT_WIN_RATE.lastIndex)
        val surf = aptitudes.forSurface(race.terrain).ordinal.coerceIn(0, APT_WIN_RATE.lastIndex)
        val weaker = minOf(dist, surf)
        val base = APT_WIN_RATE[weaker]
        val prob = base * gradeFactor(race.grade)
        return prob.coerceIn(0.05, 0.99)
    }

    /**
     * Effective win rate for scoring: blends [RaceWinModel.winProbability] with the user's
     * [Weights.assumedRaceWinRate] pessimism dial (1.0 = trust aptitude estimate fully).
     */
    fun effectiveWinRate(race: RaceCandidate, aptitudes: Aptitudes, weights: Weights): Double {
        val estimate = winProbability(race, aptitudes)
        val dial = weights.assumedRaceWinRate.coerceIn(0.0, 1.0)
        return (estimate * dial).coerceIn(0.0, 1.0)
    }

    /** Hard guard used by runtime racing and eligibility filtering. */
    fun passesWinRateGuard(race: RaceCandidate, aptitudes: Aptitudes, weights: Weights): Boolean {
        val floor = weights.minWinRateGuard.coerceIn(0.0, 1.0)
        if (floor <= 0.0) return true
        return winProbability(race, aptitudes) >= floor
    }
}
