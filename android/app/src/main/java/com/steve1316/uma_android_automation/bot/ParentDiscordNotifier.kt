package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.DiscordUtils
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.bot.solver.SmartRaceSolverIntegration
import com.steve1316.uma_android_automation.types.GameDate
import com.steve1316.uma_android_automation.types.Mood
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

        val fields = mutableListOf<DiscordEmbedField>()
        fields.add(DiscordEmbedField("Scenario", scenario, inline = true))
        if (profileName.isNotEmpty()) {
            fields.add(DiscordEmbedField("Profile", profileName, inline = true))
        }
        if (bundleLabel.isNotEmpty()) {
            fields.add(DiscordEmbedField("Bundle", bundleLabel, inline = false))
        }
        if (goalLabel.isNotEmpty()) {
            fields.add(DiscordEmbedField("Goal", goalLabel, inline = false))
        }
        if (logViewerSuffix.isNotEmpty()) {
            fields.add(DiscordEmbedField("Log viewer", logViewerSuffix, inline = false))
        }

        AppDiscordNotifications.sendEmbed(
            DiscordEmbedSpec(
                title = "Parent farming started",
                description = bundleLabel.ifEmpty { goalLabel.ifEmpty { scenario } },
                colorRgb = DiscordEmbedColors.YELLOW,
                fields = fields,
                footer = MessageLog.getSystemTimeString(),
            ),
        )
    }

    /**
     * Sends a throttled live status update after the in-game date advances.
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
        AppDiscordNotifications.sendEmbed(buildLiveStatusEmbed(game, trainee, date, includeEpithetDetail))
    }

    private fun buildLiveStatusEmbed(
        game: Game,
        trainee: Trainee,
        date: GameDate,
        includeEpithetDetail: Boolean,
    ): DiscordEmbedSpec {
        val raceStats = SmartRaceSolverIntegration.snapshotRaceStats()
        val elapsedMs = System.currentTimeMillis() - game.runStartTimeMillis
        val runtime =
            if (game.runStartTimeMillis > 0L && elapsedMs >= 0) {
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

        val fields = mutableListOf<DiscordEmbedField>()
        fields.add(DiscordEmbedField("Turn", "${date.day} · $date", inline = false))
        if (trainee.name.isNotEmpty()) {
            fields.add(DiscordEmbedField("Trainee", trainee.name, inline = true))
        }
        if (bundleLabel.isNotEmpty() || goalLabel.isNotEmpty()) {
            val preset = listOf(bundleLabel, goalLabel).filter { it.isNotEmpty() }.joinToString(" · ")
            fields.add(DiscordEmbedField("Preset", preset, inline = false))
        }
        fields.add(
            DiscordEmbedField(
                "Fans",
                "${trainee.fans} (${trainee.fanCountClass.name.replace('_', ' ')})",
                inline = true,
            ),
        )
        fields.add(DiscordEmbedField("Energy", "${trainee.energy}%", inline = true))
        fields.add(DiscordEmbedField("Mood", formatMood(trainee.mood), inline = true))
        fields.add(DiscordEmbedField("Races", "${raceStats.wins}W / ${raceStats.losses}L", inline = true))
        fields.add(DiscordEmbedField("Runtime", runtime, inline = true))
        RankProjection.project(RankProjection.DEFAULT_FINALE_TURN)?.let { p ->
            fields.add(DiscordEmbedField("Projected rank", "${p.projectedGrade} (${p.projectedScore}) · now ${p.currentGrade}", inline = true))
        }

        val qualityInput = ParentRunSummary.inputFromSettings(trainee, game.scenario, elapsedMs = null, epithetTurn = date.day)
        val projectedQuality = ParentRunQuality.estimateLive(qualityInput)
        fields.add(
            DiscordEmbedField(
                "Projected quality",
                ParentRunQuality.formatLabel(projectedQuality),
                inline = true,
            ),
        )

        if (ParentFarmingRunLoop.isEnabled()) {
            val completed = ParentFarmingRunLoop.sessionRunsCompleted()
            val target = ParentFarmingRunLoop.targetRunCount()
            val isGenerationFarm = ParentFarmingGenerationFarm.isEnabled()
            val unit = if (isGenerationFarm) "Gen" else "Run"
            val sessionLine = if (target > 0) "$unit ${completed + 1}/$target" else "$unit ${completed + 1} (unlimited)"
            val best = ParentFarmingRunLoop.sessionBestQualitySummary()
            fields.add(
                DiscordEmbedField(
                    if (isGenerationFarm) "Generation" else "Multi-run",
                    if (best.isNotEmpty()) "$sessionLine · best $best" else sessionLine,
                    inline = false,
                ),
            )
        }

        if (includeEpithetDetail) {
            val snapshot = SmartRaceSolverIntegration.snapshotParentRunEpithets(game.scenario, date.day)
            if (snapshot != null) {
                val targetTotal = snapshot.completedTargets.size + snapshot.incompleteTargets.size
                if (targetTotal > 0) {
                    fields.add(
                        DiscordEmbedField(
                            "Goals",
                            "${snapshot.completedTargets.size}/$targetTotal targets complete",
                            inline = true,
                        ),
                    )
                }
                if (snapshot.completedTargets.isNotEmpty()) {
                    fields.add(DiscordEmbedField("Done", snapshot.completedTargets.joinToString(", "), inline = false))
                }
                if (snapshot.incompleteTargets.isNotEmpty()) {
                    val shown = snapshot.incompleteTargets.take(4)
                    val suffix = if (snapshot.incompleteTargets.size > shown.size) "…" else ""
                    fields.add(DiscordEmbedField("Remaining", shown.joinToString(", ") + suffix, inline = false))
                }
            }
        }

        return DiscordEmbedSpec(
            title = "Parent farming · live update",
            description = trainee.name.ifEmpty { null },
            colorRgb = DiscordEmbedColors.BLURPLE,
            fields = fields,
            footer = MessageLog.getSystemTimeString(),
        )
    }

    internal fun formatMood(mood: Mood): String =
        mood.name.lowercase().replaceFirstChar { char -> char.uppercaseChar() }

    fun sendMultiRunSessionComplete(sessionRunsCompleted: Int, sessionTarget: Int, bestSummary: String) {
        if (!DiscordUtils.enableDiscordNotifications) return
        val targetLabel = if (sessionTarget > 0) "$sessionRunsCompleted/$sessionTarget careers" else "$sessionRunsCompleted careers"
        AppDiscordNotifications.sendEmbed(
            DiscordEmbedSpec(
                title = "Parent farming session complete",
                description = "Best run: $bestSummary",
                colorRgb = DiscordEmbedColors.GREEN,
                fields =
                    listOf(
                        DiscordEmbedField("Session", targetLabel, inline = true),
                        DiscordEmbedField("Best quality", bestSummary, inline = true),
                    ),
                footer = MessageLog.getSystemTimeString(),
            ),
        )
    }

    fun sendQualityTargetReached(score: Int, grade: String, runIndex: Int) {
        if (!DiscordUtils.enableDiscordNotifications || !isParentFarmingRun()) return
        AppDiscordNotifications.sendEmbed(
            DiscordEmbedSpec(
                title = "Parent quality target reached",
                description = "$grade · $score/100 after run $runIndex",
                colorRgb = DiscordEmbedColors.GREEN,
                footer = MessageLog.getSystemTimeString(),
            ),
        )
    }

    /** Sent when generation-farm auto-navigation could not reach career selection and the multi-run loop stopped. */
    fun sendNavigationFailed(trainee: String, scenario: String, runIndex: Int) {
        if (!DiscordUtils.enableDiscordNotifications || !isParentFarmingRun()) return
        AppDiscordNotifications.sendEmbed(
            DiscordEmbedSpec(
                title = "Parent farming: auto-navigation failed",
                description = "Could not reach career selection for generation ${runIndex + 1}. Manual intervention needed.",
                colorRgb = DiscordEmbedColors.RED,
                fields =
                    listOf(
                        DiscordEmbedField("Trainee", trainee.ifEmpty { "—" }, inline = true),
                        DiscordEmbedField("Scenario", scenario.ifEmpty { "—" }, inline = true),
                    ),
                footer = MessageLog.getSystemTimeString(),
            ),
        )
    }

    /** Sent when auto-navigation gave up on the intended trainee and fell back to the previous generation's trainee. */
    fun sendNavigationFallbackUsed(intendedTrainee: String, fallbackTrainee: String, runIndex: Int) {
        if (!DiscordUtils.enableDiscordNotifications || !isParentFarmingRun()) return
        AppDiscordNotifications.sendEmbed(
            DiscordEmbedSpec(
                title = "Parent farming: trainee fallback used",
                description = "Generation ${runIndex + 1} continued with the previous trainee instead of the planned one.",
                colorRgb = DiscordEmbedColors.YELLOW,
                fields =
                    listOf(
                        DiscordEmbedField("Planned", intendedTrainee.ifEmpty { "—" }, inline = true),
                        DiscordEmbedField("Used instead", fallbackTrainee.ifEmpty { "—" }, inline = true),
                    ),
                footer = MessageLog.getSystemTimeString(),
            ),
        )
    }
}
