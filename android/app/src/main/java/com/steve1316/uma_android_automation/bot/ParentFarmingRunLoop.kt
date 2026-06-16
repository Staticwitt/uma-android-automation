package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.DiscordUtils
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.bot.solver.SmartRaceSolverIntegration
import com.steve1316.uma_android_automation.components.ButtonBack
import com.steve1316.uma_android_automation.components.ButtonClose
import com.steve1316.uma_android_automation.components.ButtonCompleteCareer
import com.steve1316.uma_android_automation.components.ButtonToHome
import com.steve1316.uma_android_automation.types.GameDate

/**
 * Runs multiple parent-farming careers in one bot session: after each career end, navigates back
 * to career selection and resets per-run state.
 */
object ParentFarmingRunLoop {
    private const val TAG = "[PF_MULTI_RUN]"

    @Volatile private var sessionRunsCompleted = 0

    fun resetSession() {
        sessionRunsCompleted = 0
    }

    fun isEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMode", false) &&
            SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMultiRun", false)

    fun targetRunCount(): Int = SettingsHelper.getIntSetting("racing", "parentFarmingMultiRunCount", 1).coerceAtLeast(0)

    fun sessionRunsCompleted(): Int = sessionRunsCompleted

    fun shouldContinueAfterRun(): Boolean {
        if (!isEnabled()) return false
        val target = targetRunCount()
        if (target <= 0) return true
        return sessionRunsCompleted < target
    }

    /**
     * After a career ends, optionally navigates back to career selection and resets campaign state.
     *
     * @return True when the main loop should continue for another run.
     */
    fun tryContinueAfterCareerEnd(campaign: Campaign, game: Game): Boolean {
        if (!isEnabled()) return false

        sessionRunsCompleted++
        val target = targetRunCount()
        MessageLog.i(
            TAG,
            "Parent run $sessionRunsCompleted finished${if (target > 0) " (target $target)" else " (until stopped)"}.",
        )

        if (!shouldContinueAfterRun()) {
            MessageLog.i(TAG, "Multi-run target reached; stopping bot.")
            return false
        }

        flushRunEndDiscord(game)

        if (!navigateBackToCareerSelection(campaign, game)) {
            MessageLog.w(TAG, "Could not return to career selection; stopping multi-run loop.")
            return false
        }

        resetCampaignForNextRun(campaign, game)
        MessageLog.i(TAG, "Ready for parent run ${sessionRunsCompleted + 1}.")
        if (DiscordUtils.enableDiscordNotifications && ParentDiscordNotifier.isParentFarmingRun()) {
            ParentDiscordNotifier.maybeSendParentRunStart(game.scenario)
        }
        return true
    }

    private fun flushRunEndDiscord(game: Game) {
        if (!DiscordUtils.enableDiscordNotifications) return
        val embed = game.taskEndDiscordEmbed
        val markdown = game.taskEndDiscordMessage
        when {
            embed != null -> AppDiscordNotifications.sendEmbed(embed)
            markdown != null -> {
                for (chunk in ParentRunSummary.chunkForDiscord(markdown)) {
                    AppDiscordNotifications.sendPlain(chunk)
                }
            }
        }
        game.taskEndDiscordEmbed = null
        game.taskEndDiscordMessage = null
        DiscordEmbedService.flushBlocking()
    }

    private fun navigateBackToCareerSelection(campaign: Campaign, game: Game): Boolean {
        if (ButtonCompleteCareer.check(game.imageUtils)) {
            ButtonCompleteCareer.click(game.imageUtils)
            game.wait(1.0)
        }

        val deadline = System.currentTimeMillis() + 90_000
        while (System.currentTimeMillis() < deadline) {
            campaign.tryHandleAllDialogs(timeoutMs = 2_000)
            if (CareerSelectionAutomation.isOnCareerSelectionScreen(game)) {
                game.wait(1.0)
                return true
            }
            when {
                ButtonToHome.click(game.imageUtils) -> game.wait(1.0)
                ButtonClose.click(game.imageUtils) -> game.wait(0.8)
                ButtonBack.click(game.imageUtils) -> game.wait(0.8)
                else -> game.wait(0.5)
            }
        }
        return CareerSelectionAutomation.isOnCareerSelectionScreen(game)
    }

    private fun resetCampaignForNextRun(campaign: Campaign, game: Game) {
        game.runStartTimeMillis = System.currentTimeMillis()
        game.taskEndDiscordEmbed = null
        game.taskEndDiscordMessage = null

        SupportCardBorrower.resetForNewRun()
        LegacyParentSelector.resetForNewRun()
        OwnedSupportDeckEquipper.resetForNewRun()
        SmartRaceSolverIntegration.reset()
        ParentDiscordNotifier.reset()

        campaign.date = GameDate(day = 1)
        campaign.resetForNextParentRun()
    }
}
