package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.types.GameDate

/**
 * Scenario-specific parent-farming tuning for URA Finale and Unity Cup.
 */
object ParentFarmingScenarioHooks {
    private const val TAG = "[PF_SCENARIO]"

    fun isParentRun(): Boolean = SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMode", false)

    fun onTurnStart(campaign: Campaign, date: GameDate) {
        if (!isParentRun()) return
        when (campaign.game.scenario) {
            "URA Finale" -> onUraTurnStart(campaign, date)
            "Unity Cup" -> onUnityTurnStart(campaign, date)
        }
    }

    private fun onUraTurnStart(campaign: Campaign, date: GameDate) {
        if (date.day <= 12) return
        val preset = SettingsHelper.getStringSetting("racing", "parentFarmingGoalPresetKey")
        if (preset == "ura-finals" && !SettingsHelper.getBooleanSetting("racing", "enableForceRacing", false)) {
            MessageLog.v(TAG, "URA parent route: solver gate active (finals champion track).")
        }
    }

    private fun onUnityTurnStart(campaign: Campaign, date: GameDate) {
        val preset = SettingsHelper.getStringSetting("racing", "parentFarmingGoalPresetKey")
        if (preset == "unity-aoharu" && SettingsHelper.getBooleanSetting("training", "enablePrioritizeSkillHints", false)) {
            MessageLog.v(TAG, "Unity parent route: skill-hint training bias active.")
        }
    }

    fun parentFanFloor(): Int {
        if (!isParentRun()) return 0
        return when (SettingsHelper.getStringSetting("racing", "parentFarmingGoalPresetKey")) {
            "ura-finals" -> 150_000
            "unity-aoharu" -> 80_000
            else -> 0
        }
    }
}
