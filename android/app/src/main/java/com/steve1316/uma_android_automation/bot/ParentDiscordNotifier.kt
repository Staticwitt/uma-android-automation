package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.DiscordUtils
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.bot.solver.SmartRaceSolverIntegration
import com.steve1316.uma_android_automation.types.GameDate
import com.steve1316.uma_android_automation.types.Trainee

/**
 * Discord notifications for parent farming runs: start message, periodic live status, and career-end summary.
 */
object ParentDiscordNotifier {
    private var lastLiveStatusTurn: Int = -1

    fun reset() {
        lastLiveStatusTurn = -1
    }

    fun isParentFarmingRun(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMode", false)

    fun isLiveStatusEnabled(): Boolean =
        DiscordUtils.enableDiscordNotifications &&
            isParentFarmingRun() &&
            SettingsHelper.getBooleanSetting("discord", "enableDiscordLiveStatus", true)

    fun liveStatusTurnInterval(): Int =
        SettingsHelper.getIntSetting("discord", "discordLiveStatusTurnInterval", 6).coerceAtLeast(1)

    /**
     * Sends a richer start notification when parent farming mode is active.
     */
    fun maybeSendParentRunStart(scenario: String, logViewerSuffix: String = "") {
        if (!DiscordUtils.enableDiscordNotifications || !isParentFarmingRun()) return

        val bundleLabel =
            runCatching { SettingsHelper.getStringSetting("racing", "parentFarmingBundleLabel") }
                .getOrElse { "" }
        val goalLabel =
            runCatching { SettingsHelper.getStringSetting("racing", "parentFarmingGoalPresetLabel") }
                .getOrElse { "" }
        val profileName =
            runCatching { SettingsHelper.getStringSetting("misc", "currentProfileName") }
                .getOrElse { "" }

        val lines = mutableListOf<String>()
        lines.add("**Parent farming run started**")
        lines.add(DiscordMessageFormatter.bullet("Scenario", scenario))
        if (profileName.isNotEmpty()) {
            lines.add(DiscordMessageFormatter.bullet("Profile", profileName))
        }
        if (bundleLabel.isNotEmpty()) {
            lines.add(DiscordMessageFormatter.bullet("Bundle", bundleLabel))
        }
        if (goalLabel.isNotEmpty()) {
            lines.add(DiscordMessageFormatter.bullet("Goal", goalLabel))
        }
        if (logViewerSuffix.isNotEmpty()) {
            lines.add(logViewerSuffix)
        }

        DiscordUtils.queue.add(lines.joinToString("\n"))
    }

    /**
     * Sends a throttled live status update after the in-game date advances.
     *
     * @param game Active game session.
     * @param trainee Current trainee snapshot.
     * @param date Current in-game date.
     * @param dateChanged Whether the turn/date changed this main-screen visit.
     */
    fun maybeSendLiveStatus(game: Game, trainee: Trainee, date: GameDate, dateChanged: Boolean) {
        if (!dateChanged || !isLiveStatusEnabled()) return
        if (date.day == lastLiveStatusTurn) return

        val interval = liveStatusTurnInterval()
        val shouldSend =
            date.day == 1 ||
                date.bIsFinaleSeason ||
                date.day % interval == 0
        if (!shouldSend) return

        lastLiveStatusTurn = date.day
        val includeEpithetDetail = date.bIsFinaleSeason || date.day % (interval * 2) == 0
        DiscordUtils.queue.add(buildLiveStatusMessage(game, trainee, date, includeEpithetDetail))
    }

    private fun buildLiveStatusMessage(
        game: Game,
        trainee: Trainee,
        date: GameDate,
        includeEpithetDetail: Boolean,
    ): String {
        val raceStats = SmartRaceSolverIntegration.snapshotRaceStats()
        val elapsedMs = System.currentTimeMillis() - game.runStartTimeMillis
        val runtime = if (game.runStartTimeMillis > 0L && elapsedMs >= 0) {
            MessageLog.formatElapsedTime(0, elapsedMs)
        } else {
            "—"
        }

        val bundleLabel =
            runCatching { SettingsHelper.getStringSetting("racing", "parentFarmingBundleLabel") }
                .getOrElse { "" }
        val goalLabel =
            runCatching { SettingsHelper.getStringSetting("racing", "parentFarmingGoalPresetLabel") }
                .getOrElse { "" }

        val lines = mutableListOf<String>()
        lines.add("**Parent farming — live update**")
        lines.add(DiscordMessageFormatter.bullet("Turn", "${date.day} · $date"))
        if (trainee.name.isNotEmpty()) {
            lines.add(DiscordMessageFormatter.bullet("Trainee", trainee.name))
        }
        if (bundleLabel.isNotEmpty() || goalLabel.isNotEmpty()) {
            val preset = listOf(bundleLabel, goalLabel).filter { it.isNotEmpty() }.joinToString(" · ")
            lines.add(DiscordMessageFormatter.bullet("Preset", preset))
        }
        lines.add(
            DiscordMessageFormatter.bullet(
                "Fans",
                "${trainee.fans} (${trainee.fanCountClass.name.replace('_', ' ')})",
            ),
        )
        lines.add(DiscordMessageFormatter.bullet("Races", "${raceStats.wins}W / ${raceStats.losses}L"))
        lines.add(DiscordMessageFormatter.bullet("Runtime", runtime))

        if (includeEpithetDetail) {
            val snapshot = SmartRaceSolverIntegration.snapshotParentRunEpithets(game.scenario)
            if (snapshot != null) {
                val targetTotal = snapshot.completedTargets.size + snapshot.incompleteTargets.size
                if (targetTotal > 0) {
                    lines.add(
                        DiscordMessageFormatter.bullet(
                            "Goals",
                            "${snapshot.completedTargets.size}/$targetTotal targets complete",
                        ),
                    )
                }
                if (snapshot.completedTargets.isNotEmpty()) {
                    lines.add(DiscordMessageFormatter.plainBullet("Done: ${snapshot.completedTargets.joinToString(", ")}"))
                }
                if (snapshot.incompleteTargets.isNotEmpty()) {
                    val shown = snapshot.incompleteTargets.take(4)
                    val suffix = if (snapshot.incompleteTargets.size > shown.size) "…" else ""
                    lines.add(DiscordMessageFormatter.plainBullet("Remaining: ${shown.joinToString(", ")}$suffix"))
                }
            }
        }

        return lines.joinToString("\n")
    }
}
