package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper

/**
 * Relaxes forced epithet routes between multi-run attempts when adaptive multi-run is enabled.
 */
object ParentFarmingAdaptiveMultiRun {
    private const val TAG = "[PF_ADAPTIVE]"

    private val downgradedForced = linkedSetOf<String>()

    fun reset() {
        downgradedForced.clear()
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
}
