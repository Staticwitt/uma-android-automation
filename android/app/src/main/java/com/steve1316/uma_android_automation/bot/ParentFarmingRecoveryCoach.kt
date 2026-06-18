package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.DiscordUtils
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.bot.solver.SmartRaceSolverIntegration

/**
 * Surfaces actionable guidance when forced/target epithets go dead mid-run.
 */
object ParentFarmingRecoveryCoach {
    private const val TAG = "[PF_RECOVERY]"

    @Volatile private var lastAdvisedSignature = ""

    fun reset() {
        lastAdvisedSignature = ""
    }

    fun isEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMode", false) &&
            SettingsHelper.getBooleanSetting("racing", "enableParentFarmingRecoveryCoach", true)

    fun maybeAdvise(deadEpithets: Set<String>, forcedEpithets: List<String>) {
        if (!isEnabled() || deadEpithets.isEmpty()) return
        val signature = deadEpithets.sorted().joinToString("|")
        if (signature == lastAdvisedSignature) return
        lastAdvisedSignature = signature

        val forcedDead = forcedEpithets.filter { it in deadEpithets }
        val lines = mutableListOf<String>()
        lines.add("Dead epithets: ${deadEpithets.joinToString(" · ")}")
        if (forcedDead.isNotEmpty()) {
            lines.add("Forced route lost: ${forcedDead.joinToString(" · ")}")
            if (SettingsHelper.getBooleanSetting("racing", "enableParentFarmingAdaptiveMultiRun", false)) {
                lines.add("Adaptive multi-run will downgrade forced epithets on the next career.")
            } else {
                lines.add("Consider enabling adaptive multi-run or moving forced epithets to targets only.")
            }
            if (SettingsHelper.getBooleanSetting("racing", "enableParentFarmingStopOnForcedEpithetFail", false)) {
                lines.add("Stop-on-forced-fail is on — multi-run may end after this career.")
            }
        } else {
            lines.add("Target epithets only — solver will replan around dead routes.")
        }
        if (SettingsHelper.getBooleanSetting("racing", "enableParentFarmingGoalQueue", false)) {
            lines.add("Goal queue will rotate setup on the next career if multi-run continues.")
        }

        val message = lines.joinToString("\n")
        MessageLog.w(TAG, message)

        if (DiscordUtils.enableDiscordNotifications && SettingsHelper.getBooleanSetting("discord", "enableDiscordLiveStatus", true)) {
            AppDiscordNotifications.sendInfo(
                title = "Parent farming recovery coach",
                description = message,
            )
        }
    }

    fun pollFromSolver() {
        if (!isEnabled()) return
        val dead = SmartRaceSolverIntegration.deadEpithetsSnapshot()
        val forced = SupportCardSelection.readStringList(
            SettingsHelper.getStringSetting("racing", "smartRaceSolverForcedEpithets", "[]"),
        )
        maybeAdvise(dead, forced)
    }
}
