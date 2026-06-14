package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.MainActivity
import com.steve1316.uma_android_automation.bot.solver.SmartRaceSolverIntegration
import com.steve1316.uma_android_automation.types.RunningStyle
import com.steve1316.uma_android_automation.types.TrackDistance
import com.steve1316.uma_android_automation.types.TrackSurface
import com.steve1316.uma_android_automation.types.Trainee
import org.json.JSONArray
import org.json.JSONObject

/** Race win/loss totals for the current bot run. */
data class RunRaceStats(val wins: Int, val losses: Int)

/** Inputs for building a parent-run summary without reading SQLite settings. */
data class ParentRunSummaryInput(
    val trainee: Trainee,
    val scenario: String,
    val profileName: String,
    val bundleLabel: String,
    val goalPresetLabel: String,
    val characterPreset: String,
    val sparkStrategy: String,
    val targetEpithets: List<String>,
    val completedTargetEpithets: List<String>,
    val incompleteTargetEpithets: List<String>,
    val extraCompletedEpithets: List<String>,
    val sparkPicks: List<SparkPickHistory.Record>,
    val fanWeight: Double,
    val minimumFanTarget: Int,
    val minimumRaceGapTurns: Int,
    val targetEpithetMultiplier: Double,
    val raceStats: RunRaceStats,
    val elapsedMs: Long?,
)

/**
 * Builds and logs end-of-career summaries for parent farming runs.
 *
 * When parent farming mode finishes a full career, the summary is written to the message log and
 * can be forwarded to Discord via [Game.taskEndDiscordMessage].
 */
object ParentRunSummary {
    private const val TAG: String = "[${MainActivity.loggerTag}]ParentRunSummary"
    private const val LOG_BANNER = "========== PARENT RUN SUMMARY =========="

    /**
     * Builds a summary from the trainee state, scenario, and current SQLite settings.
     *
     * @param trainee Final trainee snapshot at career end.
     * @param scenario Active campaign scenario name.
     * @param elapsedMs Wall-clock runtime in milliseconds, or null to omit runtime.
     */
    fun buildFromSettings(trainee: Trainee, scenario: String, elapsedMs: Long?): String {
        val weightsJson = SettingsHelper.getStringSetting("racing", "smartRaceSolverWeights")
        val weights = parseWeights(weightsJson)
        val profileName =
            runCatching { SettingsHelper.getStringSetting("misc", "currentProfileName") }
                .getOrElse { "" }
        val bundleLabel =
            runCatching { SettingsHelper.getStringSetting("racing", "parentFarmingBundleLabel") }
                .getOrElse { "" }
        val goalPresetLabel =
            runCatching { SettingsHelper.getStringSetting("racing", "parentFarmingGoalPresetLabel") }
                .getOrElse { "" }
        val epithetSnapshot = SmartRaceSolverIntegration.snapshotParentRunEpithets(scenario)
        return build(
            ParentRunSummaryInput(
                trainee = trainee,
                scenario = scenario,
                profileName = profileName,
                bundleLabel = bundleLabel,
                goalPresetLabel = goalPresetLabel,
                characterPreset = SettingsHelper.getStringSetting("racing", "smartRaceSolverCharacterPreset"),
                sparkStrategy = SettingsHelper.getStringSetting("racing", "sparkSelectionStrategy").ifEmpty { "Default" },
                targetEpithets = readStringList("smartRaceSolverTargetEpithets"),
                completedTargetEpithets = epithetSnapshot?.completedTargets ?: emptyList(),
                incompleteTargetEpithets = epithetSnapshot?.incompleteTargets ?: emptyList(),
                extraCompletedEpithets = epithetSnapshot?.extraCompleted ?: emptyList(),
                sparkPicks = SparkPickHistory.snapshot(),
                fanWeight = weights.fanWeight,
                minimumFanTarget = weights.minimumFanTarget,
                minimumRaceGapTurns = weights.minimumRaceGapTurns,
                targetEpithetMultiplier = weights.targetEpithetMultiplier,
                raceStats = SmartRaceSolverIntegration.snapshotRaceStats(),
                elapsedMs = elapsedMs,
            ),
        )
    }

    /**
     * @param input Fully populated summary inputs.
     * @return Multi-line plain-text summary.
     */
    fun build(input: ParentRunSummaryInput): String {
        val trainee = input.trainee
        val lines = mutableListOf<String>()
        lines.add("Parent Run Complete")
        if (input.elapsedMs != null && input.elapsedMs >= 0) {
            lines.add("Runtime: ${MessageLog.formatElapsedTime(0, input.elapsedMs)}")
        }
        lines.add("Scenario: ${input.scenario.ifEmpty { "(none)" }}")
        if (input.profileName.isNotEmpty()) {
            lines.add("Profile: $input.profileName")
        }
        if (trainee.name.isNotEmpty()) {
            lines.add("Trainee: ${trainee.name}")
        }
        if (input.bundleLabel.isNotEmpty()) {
            lines.add("Bundle: $input.bundleLabel")
        }
        if (input.goalPresetLabel.isNotEmpty()) {
            lines.add("Goal preset: $input.goalPresetLabel")
        }
        lines.add("Character preset: ${input.characterPreset.ifEmpty { "(none)" }}")
        lines.add("Spark strategy: ${input.sparkStrategy}")
        lines.add(
            "Solver: fanWeight=${formatDecimal(input.fanWeight)}, " +
                "fanFloor=${input.minimumFanTarget}, " +
                "targetEpithet×${formatDecimal(input.targetEpithetMultiplier)}, " +
                "minRaceGap=${input.minimumRaceGapTurns} turns",
        )
        lines.add(formatTargetEpithets(input.targetEpithets))
        lines.addAll(formatEpithetResults(input))
        lines.addAll(formatSparkPicks(input.sparkPicks))
        lines.add("Races: ${input.raceStats.wins} wins, ${input.raceStats.losses} losses")
        lines.add("Fans: ${trainee.fans} (${formatFanClass(trainee.fanCountClass.name)})")
        lines.add("Skill points: ${trainee.skillPoints}")
        lines.add("Stats: ${trainee.stats}")
        lines.add(formatSurfaceAptitudes(trainee))
        lines.add(formatDistanceAptitudes(trainee))
        lines.add(formatStyleAptitudes(trainee))
        if (trainee.currentPositiveStatuses.isNotEmpty()) {
            lines.add("Positive: ${trainee.currentPositiveStatuses.joinToString(", ")}")
        }
        if (trainee.currentNegativeStatuses.isNotEmpty()) {
            lines.add("Negative: ${trainee.currentNegativeStatuses.joinToString(", ")}")
        }
        return lines.joinToString("\n")
    }

    /** Writes the summary to the message log with a visible banner. */
    fun logSummary(summary: String) {
        MessageLog.i(TAG, LOG_BANNER)
        summary.lines().forEach { line ->
            if (line.isNotEmpty()) {
                MessageLog.i(TAG, line)
            }
        }
        MessageLog.i(TAG, "==========================================")
    }

    /**
     * Splits long summaries so each chunk fits Discord message limits.
     *
     * @param text Full summary text.
     * @param maxChunkSize Maximum characters per chunk.
     */
    fun chunkForDiscord(text: String, maxChunkSize: Int = 1800): List<String> {
        if (text.length <= maxChunkSize) {
            return listOf(text)
        }
        val chunks = mutableListOf<String>()
        var remaining = text
        while (remaining.isNotEmpty()) {
            if (remaining.length <= maxChunkSize) {
                chunks.add(remaining)
                break
            }
            val slice = remaining.substring(0, maxChunkSize)
            val breakAt = slice.lastIndexOf('\n').takeIf { it > maxChunkSize / 3 } ?: maxChunkSize
            chunks.add(remaining.substring(0, breakAt).trimEnd())
            remaining = remaining.substring(breakAt).trimStart()
        }
        return chunks
    }

    private data class ParsedWeights(
        val fanWeight: Double = 0.0,
        val minimumFanTarget: Int = 0,
        val minimumRaceGapTurns: Int = 0,
        val targetEpithetMultiplier: Double = 3.0,
    )

    private fun parseWeights(json: String): ParsedWeights {
        if (json.isEmpty()) return ParsedWeights()
        return runCatching {
            val obj = JSONObject(json)
            ParsedWeights(
                fanWeight = obj.optDouble("fanWeight", 0.0),
                minimumFanTarget = obj.optInt("minimumFanTarget", 0),
                minimumRaceGapTurns = obj.optInt("minimumRaceGapTurns", 0),
                targetEpithetMultiplier = obj.optDouble("targetEpithetMultiplier", 3.0),
            )
        }.getOrElse { ParsedWeights() }
    }

    private fun formatEpithetResults(input: ParentRunSummaryInput): List<String> {
        val lines = mutableListOf<String>()
        if (input.completedTargetEpithets.isNotEmpty()) {
            lines.add("Targets completed (${input.completedTargetEpithets.size}): ${input.completedTargetEpithets.joinToString(", ")}")
        } else {
            lines.add("Targets completed: (none)")
        }
        if (input.incompleteTargetEpithets.isNotEmpty()) {
            lines.add("Targets incomplete (${input.incompleteTargetEpithets.size}): ${input.incompleteTargetEpithets.joinToString(", ")}")
        }
        if (input.extraCompletedEpithets.isNotEmpty()) {
            val shown = input.extraCompletedEpithets.take(8)
            val suffix = if (input.extraCompletedEpithets.size > shown.size) "…" else ""
            lines.add("Other epithets completed (${input.extraCompletedEpithets.size}): ${shown.joinToString(", ")}$suffix")
        }
        return lines
    }

    private fun formatSparkPicks(picks: List<SparkPickHistory.Record>): List<String> {
        if (picks.isEmpty()) return emptyList()
        val lines = mutableListOf("Inheritance sparks:")
        for ((index, pick) in picks.withIndex()) {
            val options = pick.optionTexts.mapIndexed { i, text -> "${i + 1}=\"${text.take(40)}\"" }.joinToString(", ")
            lines.add("  #${index + 1}: picked slot ${pick.pickIndex + 1} ($pick.strategy) — $options")
        }
        return lines
    }

    private fun readStringList(key: String): List<String> {
        val json = SettingsHelper.getStringSetting("racing", key)
        if (json.isEmpty()) return emptyList()
        return runCatching {
            val arr = JSONArray(json)
            (0 until arr.length()).map { arr.getString(it) }
        }.getOrElse { emptyList() }
    }

    private fun formatDecimal(value: Double): String =
        if (value % 1.0 == 0.0) {
            value.toInt().toString()
        } else {
            "%.1f".format(value)
        }

    private fun formatFanClass(enumName: String): String = enumName.replace('_', ' ')

    private fun formatTargetEpithets(epithets: List<String>): String =
        when {
            epithets.isEmpty() -> "Target epithets: (none)"
            epithets.size <= 6 -> "Target epithets: ${epithets.joinToString(", ")}"
            else -> "Target epithets (${epithets.size}): ${epithets.take(6).joinToString(", ")}…"
        }

    private fun formatSurfaceAptitudes(trainee: Trainee): String {
        val turf = trainee.trackSurfaceAptitudes[TrackSurface.TURF]?.name ?: "?"
        val dirt = trainee.trackSurfaceAptitudes[TrackSurface.DIRT]?.name ?: "?"
        return "Surface: Turf $turf, Dirt $dirt"
    }

    private fun formatDistanceAptitudes(trainee: Trainee): String {
        val sprint = trainee.trackDistanceAptitudes[TrackDistance.SPRINT]?.name ?: "?"
        val mile = trainee.trackDistanceAptitudes[TrackDistance.MILE]?.name ?: "?"
        val medium = trainee.trackDistanceAptitudes[TrackDistance.MEDIUM]?.name ?: "?"
        val long = trainee.trackDistanceAptitudes[TrackDistance.LONG]?.name ?: "?"
        return "Distance: Sprint $sprint, Mile $mile, Medium $medium, Long $long"
    }

    private fun formatStyleAptitudes(trainee: Trainee): String {
        val front = trainee.runningStyleAptitudes[RunningStyle.FRONT_RUNNER]?.name ?: "?"
        val pace = trainee.runningStyleAptitudes[RunningStyle.PACE_CHASER]?.name ?: "?"
        val late = trainee.runningStyleAptitudes[RunningStyle.LATE_SURGER]?.name ?: "?"
        val end = trainee.runningStyleAptitudes[RunningStyle.END_CLOSER]?.name ?: "?"
        return "Style: Front $front, Pace $pace, Late $late, End $end"
    }
}
