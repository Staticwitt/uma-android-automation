package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.DiscordUtils
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper

/**
 * Detects when a forced epithet route becomes unreachable and optionally stops multi-run sessions.
 */
object ParentFarmingForcedEpithetGuard {
    private const val TAG = "[PF_FORCED_FAIL]"

    @Volatile private var triggeredEpithet: String? = null

    fun reset() {
        triggeredEpithet = null
    }

    fun isEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMode", false) &&
            SettingsHelper.getBooleanSetting("racing", "enableParentFarmingStopOnForcedEpithetFail", false)

    fun triggeredEpithetName(): String? = triggeredEpithet

    fun wasTriggered(): Boolean = triggeredEpithet != null

    /** Call when newly dead epithets are detected after a race loss. */
    fun onDeadEpithets(deadEpithets: Set<String>, forcedEpithets: Set<String>) {
        if (!isEnabled() || deadEpithets.isEmpty() || forcedEpithets.isEmpty()) return
        val deadForced = deadEpithets.intersect(forcedEpithets)
        if (deadForced.isEmpty()) return
        val epithet = deadForced.sorted().first()
        if (triggeredEpithet != null) return
        triggeredEpithet = epithet
        MessageLog.w(TAG, "Forced epithet \"$epithet\" is no longer reachable. Multi-run will stop after this career.")
        if (DiscordUtils.enableDiscordNotifications) {
            AppDiscordNotifications.sendError("Parent farming: forced epithet \"$epithet\" is no longer reachable.")
        }
    }

    /** True when fail-fast is on and any forced epithet was not completed this career. */
    fun shouldStopMultiRunAfterCareer(forcedEpithets: List<String>, completedEpithets: Set<String>): Boolean {
        if (wasTriggered()) return true
        if (!isEnabled() || forcedEpithets.isEmpty()) return false
        return forcedEpithets.any { it !in completedEpithets }
    }
}
