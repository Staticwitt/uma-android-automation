package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper

/**
 * Generation-farm gate for multi-generation breeding plans.
 * Goal-queue patches advance settings between multi-run careers; the user must reach career
 * selection manually (or return there after each career ends). No team-home navigation.
 */
object ParentFarmingGenerationFarm {
    private const val TAG = "[PF_GEN_FARM]"
    private const val WARN_EVERY_ITERATIONS = 30

    @Volatile private var iteration = 0
    @Volatile private var lastWarnIteration = 0

    fun resetSession() {
        iteration = 0
        lastWarnIteration = 0
    }

    fun isEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMode", false) &&
            SettingsHelper.getBooleanSetting("racing", "enableParentFarmingBreedingPlan", false)

    /**
     * Logs a throttled reminder when generation farm is active but the screen is not career selection.
     * Does not navigate or block other automation.
     */
    fun tryGate(game: Game, campaign: Campaign) {
        if (!isEnabled()) return
        if (campaign.checkMainScreen()) return
        if (CareerSelectionAutomation.isOnCareerSelectionScreen(game)) {
            iteration = 0
            return
        }

        iteration++
        if (iteration - lastWarnIteration < WARN_EVERY_ITERATIONS) return
        lastWarnIteration = iteration
        val runLabel = ParentFarmingGoalQueue.activeLabel().let { if (it.isNotEmpty()) " ($it)" else "" }
        MessageLog.w(
            TAG,
            "Generation farm: start on career selection$runLabel — pick trainee and scenario manually, " +
                "then equip/borrow/parent automation runs. Goal queue advances between careers.",
        )
    }
}
