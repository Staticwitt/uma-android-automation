package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper

/**
 * Relaxes forced epithet routes between multi-run attempts when adaptive multi-run is enabled.
 */
object ParentFarmingAdaptiveMultiRun {
    private const val TAG = "[PF_ADAPTIVE]"

    private val downgradedForced = linkedSetOf<String>()

    @Volatile private var minWinRateGuardRelaxation: Double = 0.0

    @Volatile private var minimumFanTargetRelaxation: Int = 0

    fun reset() {
        downgradedForced.clear()
        minWinRateGuardRelaxation = 0.0
        minimumFanTargetRelaxation = 0
    }

    fun isEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMode", false) &&
            SettingsHelper.getBooleanSetting("racing", "enableParentFarmingAdaptiveMultiRun", true) &&
            SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMultiRun", false)

    fun effectiveForcedEpithets(forced: Set<String>): Set<String> = forced - downgradedForced

    fun extraTargetEpithets(): Set<String> = downgradedForced.toSet()

    /** Downgrade forced epithets that failed on the previous career. */
    fun noteForcedFailures(failedForced: Collection<String>) {
        if (failedForced.isEmpty()) return
        for (name in failedForced) {
            if (downgradedForced.add(name)) {
                MessageLog.w(TAG, "Adaptive multi-run: downgraded forced epithet \"$name\" to target-only for next run.")
            }
        }
    }

    fun onDeadForcedEpithet(epithet: String) {
        if (!isEnabled()) return
        noteForcedFailures(listOf(epithet))
    }

    fun noteCareerEnd(forcedEpithets: List<String>, completedEpithets: Set<String>) {
        if (!isEnabled() || forcedEpithets.isEmpty()) return
        val missed = forcedEpithets.filter { it !in completedEpithets }
        noteForcedFailures(missed)
    }

    private fun poorRunQualityThreshold(): Int = SettingsHelper.getIntSetting("racing", "parentFarmingAdaptivePoorRunThreshold", 70)

    private fun winRateGuardRelaxationSetting(): Double =
        SettingsHelper.getDoubleSetting("racing", "parentFarmingAdaptiveWinRateGuardRelaxation", 0.05)

    private fun fanTargetRelaxationSetting(): Int =
        SettingsHelper.getIntSetting("racing", "parentFarmingAdaptiveFanFloorRelaxation", 10_000)

    /** After a poor run, relax win-rate guard and fan floor for the next career. */
    fun notePoorRunQuality(score: Int) {
        val threshold = poorRunQualityThreshold()
        if (!isEnabled() || score >= threshold) return
        minWinRateGuardRelaxation = winRateGuardRelaxationSetting()
        minimumFanTargetRelaxation = fanTargetRelaxationSetting()
        MessageLog.i(
            TAG,
            "Adaptive multi-run: relaxing min win-rate guard by $minWinRateGuardRelaxation and fan floor by " +
                "$minimumFanTargetRelaxation after score $score (below threshold $threshold).",
        )
    }

    fun applyWeightAdjustments(minWinRateGuard: Double, minimumFanTarget: Int): Pair<Double, Int> {
        val adjustedGuard = (minWinRateGuard - minWinRateGuardRelaxation).coerceAtLeast(0.0)
        val adjustedFanFloor = (minimumFanTarget - minimumFanTargetRelaxation).coerceAtLeast(0)
        return adjustedGuard to adjustedFanFloor
    }
}
