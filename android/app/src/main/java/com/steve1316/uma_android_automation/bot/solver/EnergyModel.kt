package com.steve1316.uma_android_automation.bot.solver

import com.steve1316.uma_android_automation.types.Mood

/**
 * Simplified Trackblazer energy transitions for schedule planning. Values mirror in-game
 * ballpark costs (race ~20%, training ~25%, rest +40%) used by [Trackblazer] runtime guards.
 */
object EnergyModel {
    const val MAX_ENERGY: Int = 100
    const val RACE_COST: Int = 20
    const val TRAIN_COST: Int = 25
    const val REST_GAIN: Int = 40
    const val LOW_ENERGY_THRESHOLD: Int = 30
    const val CRITICAL_ENERGY: Int = 10

    /** Energy after a race, floored at 0. */
    fun afterRace(energy: Int): Int = (energy - RACE_COST).coerceAtLeast(0)

    /** Energy after generic training, floored at 0. */
    fun afterTrain(energy: Int): Int = (energy - TRAIN_COST).coerceAtLeast(0)

    /** Energy after resting, capped at [MAX_ENERGY]. */
    fun afterRest(energy: Int): Int = (energy + REST_GAIN).coerceAtMost(MAX_ENERGY)

    /**
     * Returns true when the trainee should prefer rest over train on the next non-race turn.
     * Mirrors the low-energy guard in Trackblazer (≤10% with 3+ consecutive races) in a softer
     * form for planning: rest when energy cannot afford another train without dropping critical.
     */
    fun shouldPreferRest(energy: Int, consecutiveRaces: Int): Boolean {
        if (energy <= CRITICAL_ENERGY && consecutiveRaces >= 3) return true
        if (energy < LOW_ENERGY_THRESHOLD) return true
        return energy - TRAIN_COST <= CRITICAL_ENERGY
    }

    /** Small mood bonus applied to train/rest scoring when mood is high. */
    fun moodTrainBonus(mood: Mood): Double =
        when (mood) {
            Mood.GREAT -> 0.5
            Mood.GOOD -> 0.25
            Mood.NORMAL -> 0.0
            Mood.BAD -> -0.25
            Mood.AWFUL -> -0.5
        }

    /** Rest is more valuable when mood is poor (matches runtime rest-for-mood behaviour). */
    fun moodRestBonus(mood: Mood): Double =
        when (mood) {
            Mood.AWFUL, Mood.BAD -> 0.5
            Mood.NORMAL -> 0.0
            Mood.GOOD, Mood.GREAT -> -0.1
        }
}
