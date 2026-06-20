package com.steve1316.uma_android_automation.bot

import com.steve1316.uma_android_automation.types.RunningStyle
import com.steve1316.uma_android_automation.types.StatName

/**
 * Always-on soft multiplicative bias on [Training]'s per-distance/per-phase stat targets, based on the
 * trainee's own aptitude-determined preferred [RunningStyle] (`Trainee.runningStyle`).
 *
 * Unlike [CareerPlanner] (a speculative, opt-in bias derived from deck composition), this reflects how the
 * stats actually matter in-race for each running style: Front Runners lean on Power to break away early,
 * Late Surgers/End Closers lean on Guts for their late spurt and Stamina to sustain it, and Pace Chaser leans
 * slightly on Wit for positioning. The bias is read directly from the trainee's own OCR'd aptitudes rather
 * than a user preference, so it is always applied (when stat targets aren't already disabled).
 */
object RunningStyleStatBias {
    /** Per-style multiplier overrides; stats absent from a style's map use the neutral default of 1.0. */
    private val multipliers: Map<RunningStyle, Map<StatName, Double>> =
        mapOf(
            RunningStyle.FRONT_RUNNER to mapOf(StatName.POWER to 1.15, StatName.WIT to 0.90),
            RunningStyle.PACE_CHASER to mapOf(StatName.WIT to 1.10),
            RunningStyle.LATE_SURGER to mapOf(StatName.GUTS to 1.15, StatName.POWER to 1.05, StatName.WIT to 0.95),
            RunningStyle.END_CLOSER to mapOf(StatName.GUTS to 1.20, StatName.STAMINA to 1.05, StatName.WIT to 0.90),
        )

    /**
     * Multiplies [baseTargets] by [runningStyle]'s bias for each stat.
     *
     * @param baseTargets Phase-scaled stat targets to bias, as returned by [Trainee.getPhaseStatTargets].
     * @param runningStyle The trainee's aptitude-determined preferred running style (`Trainee.runningStyle`).
     * @return Biased stat targets, same key set as [baseTargets].
     */
    fun applyRunningStyleBias(baseTargets: Map<StatName, Int>, runningStyle: RunningStyle): Map<StatName, Int> {
        val styleMultipliers = multipliers[runningStyle] ?: return baseTargets
        return baseTargets.mapValues { (statName, target) ->
            val multiplier = styleMultipliers[statName] ?: 1.0
            (target * multiplier).toInt().coerceAtLeast(1)
        }
    }
}
