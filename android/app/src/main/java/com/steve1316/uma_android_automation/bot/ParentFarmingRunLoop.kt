package com.steve1316.uma_android_automation.bot

import android.content.Context
import com.steve1316.automation_library.utils.DiscordUtils
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.bot.solver.SmartRaceSolverIntegration
import com.steve1316.uma_android_automation.components.ButtonBack
import com.steve1316.uma_android_automation.components.ButtonClose
import com.steve1316.uma_android_automation.components.ButtonCompleteCareer
import com.steve1316.uma_android_automation.components.ButtonToHome
import com.steve1316.uma_android_automation.types.GameDate
import com.steve1316.uma_android_automation.utils.LogStreamServer
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
    @Volatile private var sessionFingerprint = ""

    fun resetSession(context: Context? = null) {
        val fingerprint = ParentFarmingSessionState.currentFingerprint()
        val saved = context?.takeIf { ParentFarmingSessionState.isEnabled() }?.let { ParentFarmingSessionState.load(it) }
        val resuming = saved != null && saved.fingerprint.isNotEmpty() && saved.fingerprint == fingerprint && saved.runsCompleted > 0

        if (resuming) {
            sessionId = saved!!.sessionId
            sessionRunsCompleted = saved.runsCompleted
            sessionBestQualityScore = saved.bestQualityScore
            sessionBestQualityGrade = saved.bestQualityGrade
            sessionBestRunIndex = saved.bestRunIndex
            borrowRotationOffset = saved.borrowRotationOffset
            MessageLog.i(TAG, "Resuming parent farming session $sessionId at run ${sessionRunsCompleted + 1}.")
        } else {
            sessionId = UUID.randomUUID().toString()
            sessionRunsCompleted = 0
            sessionBestQualityScore = 0
            sessionBestQualityGrade = ""
            sessionBestRunIndex = 0
            borrowRotationOffset = 0
        }
        sessionFingerprint = fingerprint

        ParentFarmingForcedEpithetGuard.reset()
        ParentFarmingAdaptiveMultiRun.reset()
        ParentFarmingGoalQueue.resetSession()
        if (resuming && sessionRunsCompleted > 0) {
            ParentFarmingGoalQueue.applyForRunIndex(sessionRunsCompleted)
        }
        ParentFarmingGenerationFarm.resetSession()
        ParentFarmingRecoveryCoach.reset()

        if (context != null) persistSessionState(context)
    }

    private fun persistSessionState(context: Context) {
        ParentFarmingSessionState.save(
            context,
            ParentFarmingSessionState.Saved(
                fingerprint = sessionFingerprint,
                sessionId = sessionId,
                runsCompleted = sessionRunsCompleted,
                bestQualityScore = sessionBestQualityScore,
                bestQualityGrade = sessionBestQualityGrade,
                bestRunIndex = sessionBestRunIndex,
                borrowRotationOffset = borrowRotationOffset,
            ),
        )
        LogStreamServer.broadcastParentFarmingUpdate()
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
                MessageLog.i(TAG, "Quality target grade ${ParentRunQuality.gradeFromScore(qualityTargetScore())} reached; stopping multi-run.")
                ParentDiscordNotifier.sendQualityTargetReached(quality.score, quality.grade, sessionRunsCompleted)
                finalizeSession(game)
                return false
            }
            if (quality.score < 70) {
                ParentFarmingAdaptiveMultiRun.notePoorRunQuality(quality.score)
            }
        }

        if (summaryInput != null) {
            val completed = (summaryInput.completedTargetEpithets + summaryInput.extraCompletedEpithets).toSet()
            ParentFarmingAdaptiveMultiRun.noteCareerEnd(summaryInput.forcedEpithets, completed)
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
            if (ParentFarmingGenerationFarm.hasFailed()) {
                val pendingPatch = ParentFarmingGoalQueue.peekPatchForRunIndex(sessionRunsCompleted)
                ParentDiscordNotifier.sendNavigationFailed(
                    trainee = pendingPatch?.characterPreset ?: "",
                    scenario = pendingPatch?.scenario ?: "",
                    runIndex = sessionRunsCompleted,
                )
            }
            finalizeSession(game, clearResumeState = false)
            return false
        }

        resetCampaignForNextRun(campaign, game)
        persistSessionState(game.myContext)
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

    /**
     * @param clearResumeState False when the session stopped due to a recoverable navigation failure —
     * the resume checkpoint from the last successful transition should survive so a retry after the user
     * fixes the issue (e.g. a stale bundle key) picks up at the same generation instead of from gen 1.
     */
    private fun finalizeSession(game: Game, clearResumeState: Boolean = true) {
        if (keepBestRunEnabled() && sessionBestQualityScore > 0) {
            MessageLog.i(TAG, "Multi-run complete. Best session run: ${sessionBestQualitySummary()}.")
            ParentRunArchive.markSessionBest(game.myContext, sessionId, sessionBestRunIndex)
        }
        if (clearResumeState) ParentFarmingSessionState.clear(game.myContext)
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

    private fun fallbackTrainingEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableParentFarmingNavFallbackTrainee", false)

    private fun navigateBackToCareerSelection(campaign: Campaign, game: Game): Boolean {
        if (ButtonCompleteCareer.check(game.imageUtils)) {
            ButtonCompleteCareer.click(game.imageUtils)
            game.wait(1.0)
            campaign.tryHandleAllDialogs(timeoutMs = 5_000)
        }

        ParentFarmingGoalQueue.setCharacterOverride(null)

        val nextPatch = ParentFarmingGoalQueue.peekPatchForRunIndex(sessionRunsCompleted)
        val autoSelect = ParentFarmingGenerationFarm.isEnabled() && nextPatch?.characterPreset?.isNotEmpty() == true
        val intendedTrainee = nextPatch?.characterPreset ?: ""
        val targetScenario =
            nextPatch?.scenario?.ifEmpty { SettingsHelper.getStringSetting("general", "scenario", "Trackblazer") } ?: ""
        val previousTrainee =
            if (sessionRunsCompleted > 0) {
                ParentFarmingGoalQueue.peekPatchForRunIndex(sessionRunsCompleted - 1)?.characterPreset ?: ""
            } else {
                ""
            }
        val fallbackAllowed = autoSelect && fallbackTrainingEnabled() && previousTrainee.isNotEmpty() && previousTrainee != intendedTrainee
        if (autoSelect) {
            ParentFarmingGenerationFarm.resetNavigation()
            MessageLog.i(TAG, "Generation farm: auto-navigating to next career (trainee=$intendedTrainee, scenario=$targetScenario).")
        }

        var activeCharacter = intendedTrainee
        var usedFallback = false

        val deadline = System.currentTimeMillis() + if (autoSelect) 180_000 else 90_000
        while (System.currentTimeMillis() < deadline) {
            campaign.tryHandleAllDialogs(timeoutMs = 2_000)
            if (CareerSelectionAutomation.isOnCareerSelectionScreen(game)) {
                game.wait(1.0)
                if (usedFallback) {
                    ParentDiscordNotifier.sendNavigationFallbackUsed(intendedTrainee, activeCharacter, sessionRunsCompleted)
                }
                return true
            }
            if (autoSelect) {
                if (!usedFallback && fallbackAllowed && ParentFarmingGenerationFarm.hasFailed()) {
                    MessageLog.w(
                        TAG,
                        "Auto-navigation failed for \"$activeCharacter\"; falling back to previous trainee \"$previousTrainee\".",
                    )
                    ParentFarmingGenerationFarm.resetNavigation()
                    ParentFarmingGoalQueue.setCharacterOverride(previousTrainee)
                    activeCharacter = previousTrainee
                    usedFallback = true
                }
                if (ParentFarmingGenerationFarm.tryAdvanceNavigation(game, campaign, activeCharacter, targetScenario)) {
                    continue
                }
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

        LegacyParentSelector.resetForNewRun()
        SmartRaceSolverIntegration.reset()
        ParentDiscordNotifier.reset()
        ParentFarmingLiveStatus.reset()
        ParentFarmingForcedEpithetGuard.reset()
        ParentFarmingAdaptiveMultiRun.reset()
        ParentFarmingGenerationFarm.resetSession()
        ParentFarmingRecoveryCoach.reset()
        ParentFarmingGoalQueue.applyForRunIndex(sessionRunsCompleted)

        campaign.date = GameDate(day = 1)
        campaign.resetForNextParentRun()
    }
}
