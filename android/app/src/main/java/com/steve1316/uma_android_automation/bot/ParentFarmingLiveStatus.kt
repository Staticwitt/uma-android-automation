package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.bot.solver.SmartRaceSolverIntegration
import com.steve1316.uma_android_automation.types.GameDate
import com.steve1316.uma_android_automation.types.Trainee

/**
 * Throttled parent-farming progress lines in the in-app message log (complements Discord live status).
 */
object ParentFarmingLiveStatus {
    private const val TAG = "[PF_LIVE]"

    @Volatile private var lastLoggedTurn: Int = -1

    fun reset() {
        lastLoggedTurn = -1
    }

    fun isEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMode", false) &&
            SettingsHelper.getBooleanSetting("racing", "enableParentFarmingLiveMessageLog", true)

    fun maybeLog(game: Game, trainee: Trainee, date: GameDate, dateChanged: Boolean) {
        if (!dateChanged || !isEnabled()) return
        if (date.day == lastLoggedTurn) return

        val interval = ParentDiscordNotifier.liveStatusTurnInterval()
        val shouldLog =
            date.day == 1 ||
                date.bIsFinaleSeason ||
                date.day % interval == 0
        if (!shouldLog) return

        lastLoggedTurn = date.day

        val raceStats = SmartRaceSolverIntegration.snapshotRaceStats()
        val qualityInput = ParentRunSummary.inputFromSettings(trainee, game.scenario, elapsedMs = null, epithetTurn = date.day)
        val projected = ParentRunQuality.estimateLive(qualityInput)
        val snapshot = SmartRaceSolverIntegration.snapshotParentRunEpithets(game.scenario, date.day)
        val goalLine =
            snapshot?.let { snap ->
                val total = snap.completedTargets.size + snap.incompleteTargets.size
                if (total > 0) " · goals ${snap.completedTargets.size}/$total" else ""
            } ?: ""

        val queueLabel = ParentFarmingGoalQueue.activeLabel().let { if (it.isNotEmpty()) " · $it" else "" }
        val multiRunLine =
            if (ParentFarmingRunLoop.isEnabled()) {
                val completed = ParentFarmingRunLoop.sessionRunsCompleted()
                val target = ParentFarmingRunLoop.targetRunCount()
                if (target > 0) " · run ${completed + 1}/$target" else " · run ${completed + 1}"
            } else {
                ""
            }

        MessageLog.i(
            TAG,
            "Turn ${date.day} · ${trainee.fans} fans · ${raceStats.wins}W/${raceStats.losses}L · projected ${projected.grade} (${projected.score})$goalLine$multiRunLine$queueLabel",
        )
    }
}
