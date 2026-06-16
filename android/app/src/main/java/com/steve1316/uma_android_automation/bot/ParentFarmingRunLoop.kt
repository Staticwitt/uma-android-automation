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
import java.util.UUID

/**
 * Extended multi-run session state: quality targets, keep-best tracking, borrow rotation, and session metadata.
 */
object ParentFarmingRunLoop {
    private const val TAG = "[PF_MULTI_RUN]"

    @Volatile private var sessionId: String = ""
    @Volatile private var sessionRunsCompleted = 0
    @Volatile private var sessionBestQualityScore = 0
    @Volatile private var sessionBestQualityGrade = ""
    @Volatile private var sessionBestRunIndex = 0
    @Volatile private var borrowRotationOffset = 0

    fun resetSession() {
        sessionId = UUID.randomUUID().toString()
        sessionRunsCompleted = 0
        sessionBestQualityScore = 0
        sessionBestQualityGrade = ""
        sessionBestRunIndex = 0
        borrowRotationOffset = 0
        ParentFarmingForcedEpithetGuard.reset()
    }

    fun sessionId(): String = sessionId

    fun sessionRunIndexForArchive(): Int = sessionRunsCompleted + 1

    fun borrowRotationOffset(): Int = borrowRotationOffset

    fun sessionBestRunIndex(): Int = sessionBestRunIndex

    fun isEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMode", false) &&
            SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMultiRun", false)

    fun targetRunCount(): Int = SettingsHelper.getIntSetting("racing", "parentFarmingMultiRunCount", 1).coerceAtLeast(0)

    fun sessionRunsCompleted(): Int = sessionRunsCompleted

    fun sessionBestQualityScore(): Int = sessionBestQualityScore

    fun sessionBestQualitySummary(): String =
        if (sessionBestQualityScore > 0) {
            "${sessionBestQualityGrade} · $sessionBestQualityScore/100 (run $sessionBestRunIndex)"
        } else {
            ""
        }

    fun shouldContinueAfterRun(): Boolean {
        if (!isEnabled()) return false
        val target = targetRunCount()
        if (target <= 0) return true
        return sessionRunsCompleted < target
    }

    private fun qualityTargetEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableParentFarmingStopOnQualityTarget", false)

    private fun qualityTargetScore(): Int =
        SettingsHelper.getIntSetting("racing", "parentFarmingQualityTargetScore", 80).coerceIn(1, 100)

    private fun keepBestRunEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableParentFarmingKeepBestRun", true)

    private fun borrowRotationEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableParentFarmingBorrowRotation", false)

    fun tryContinueAfterCareerEnd(campaign: Campaign, game: Game, summaryInput: ParentRunSummaryInput? = null): Boolean {
        if (!isEnabled()) return false

        sessionRunsCompleted++
        val target = targetRunCount()
        val quality = summaryInput?.let { ParentRunQuality.score(it) }
        if (quality != null) {
            updateSessionBest(quality)
            MessageLog.i(
                TAG,
                "Parent run $sessionRunsCompleted quality: ${quality.grade} (${quality.score}/100).${sessionBestQualitySummary().let { if (it.isNotEmpty()) " Session best: $it." else "" }}",
            )
            if (qualityTargetEnabled() && quality.score >= qualityTargetScore()) {
                MessageLog.i(TAG, "Quality target ${qualityTargetScore()} reached; stopping multi-run.")
                finalizeSession(game)
                return false
            }
        }

        if (summaryInput != null && shouldStopForForcedEpithetFailure(summaryInput)) {
            MessageLog.w(TAG, "Forced epithet fail-fast: stopping multi-run after run $sessionRunsCompleted.")
            finalizeSession(game)
            return false
        }

        MessageLog.i(
            TAG,
            "Parent run $sessionRunsCompleted finished${if (target > 0) " (target $target)" else " (until stopped)"}.",
        )

        if (!shouldContinueAfterRun()) {
            finalizeSession(game)
            MessageLog.i(TAG, "Multi-run target reached; stopping bot.")
            return false
        }

        flushRunEndDiscord(game)

        if (!navigateBackToCareerSelection(campaign, game)) {
            MessageLog.w(TAG, "Could not return to career selection; stopping multi-run loop.")
            finalizeSession(game)
            return false
        }

        resetCampaignForNextRun(campaign, game)
        MessageLog.i(TAG, "Ready for parent run ${sessionRunsCompleted + 1}.")
        if (DiscordUtils.enableDiscordNotifications && ParentDiscordNotifier.isParentFarmingRun()) {
            ParentDiscordNotifier.maybeSendParentRunStart(game.scenario)
        }
        return true
    }

    private fun shouldStopForForcedEpithetFailure(input: ParentRunSummaryInput): Boolean {
        val completed = (input.completedTargetEpithets + input.extraCompletedEpithets).toSet()
        return ParentFarmingForcedEpithetGuard.shouldStopMultiRunAfterCareer(input.forcedEpithets, completed)
    }

    private fun finalizeSession(game: Game) {
        if (keepBestRunEnabled() && sessionBestQualityScore > 0) {
            MessageLog.i(TAG, "Multi-run complete. Best session run: ${sessionBestQualitySummary()}.")
            ParentRunArchive.markSessionBest(game.myContext, sessionId, sessionBestRunIndex)
        }
        maybeSendSessionCompleteDiscord(game)
    }

    private fun maybeSendSessionCompleteDiscord(game: Game) {
        if (!DiscordUtils.enableDiscordNotifications || !keepBestRunEnabled()) return
        if (sessionBestQualityScore <= 0) return
        ParentDiscordNotifier.sendMultiRunSessionComplete(
            sessionRunsCompleted = sessionRunsCompleted,
            sessionTarget = targetRunCount(),
            bestSummary = sessionBestQualitySummary(),
        )
    }

    private fun updateSessionBest(quality: ParentRunQuality.Result) {
        if (quality.score > sessionBestQualityScore) {
            sessionBestQualityScore = quality.score
            sessionBestQualityGrade = quality.grade
            sessionBestRunIndex = sessionRunsCompleted
        }
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

        if (borrowRotationEnabled()) {
            borrowRotationOffset++
        }

        SupportCardBorrower.resetForNewRun()
        LegacyParentSelector.resetForNewRun()
        OwnedSupportDeckEquipper.resetForNewRun()
        SmartRaceSolverIntegration.reset()
        ParentDiscordNotifier.reset()
        ParentFarmingForcedEpithetGuard.reset()

        campaign.date = GameDate(day = 1)
        campaign.resetForNextParentRun()
    }
}
