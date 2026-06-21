package com.steve1316.uma_android_automation.bot

import com.steve1316.uma_android_automation.types.Aptitude
import com.steve1316.uma_android_automation.types.FanCountClass
import com.steve1316.uma_android_automation.types.RunningStyle
import com.steve1316.uma_android_automation.types.TrackDistance
import com.steve1316.uma_android_automation.types.TrackSurface
import com.steve1316.uma_android_automation.types.Trainee
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ParentRunSummaryTest {
    @Test
    fun build_includes_trainee_stats_and_goals() {
        val trainee = Trainee()
        trainee.name = "Special Week"
        trainee.fans = 250000
        trainee.fanCountClass = FanCountClass.GOLD
        trainee.skillPoints = 420
        trainee.stats.speed = 900
        trainee.stats.stamina = 800
        trainee.stats.power = 700
        trainee.stats.guts = 400
        trainee.stats.wit = 500
        trainee.trackSurfaceAptitudes[TrackSurface.TURF] = Aptitude.A
        trainee.trackSurfaceAptitudes[TrackSurface.DIRT] = Aptitude.C
        trainee.trackDistanceAptitudes[TrackDistance.SPRINT] = Aptitude.B
        trainee.trackDistanceAptitudes[TrackDistance.MILE] = Aptitude.A
        trainee.trackDistanceAptitudes[TrackDistance.MEDIUM] = Aptitude.B
        trainee.trackDistanceAptitudes[TrackDistance.LONG] = Aptitude.C
        trainee.runningStyleAptitudes[RunningStyle.FRONT_RUNNER] = Aptitude.B
        trainee.runningStyleAptitudes[RunningStyle.PACE_CHASER] = Aptitude.A
        trainee.runningStyleAptitudes[RunningStyle.LATE_SURGER] = Aptitude.C
        trainee.runningStyleAptitudes[RunningStyle.END_CLOSER] = Aptitude.D

        val summary =
            ParentRunSummary.build(
                ParentRunSummaryInput(
                    trainee = trainee,
                    scenario = "Trackblazer",
                    profileName = "Parents",
                    bundleLabel = "Special Week — G1 / Fan Parent",
                    goalPresetLabel = "G1 / Fan Parent",
                    characterPreset = "Special Week",
                    sparkStrategy = "StatAndAptitude",
                    targetEpithets = listOf("Globe-Trotter", "Triple Tiara"),
                    completedTargetEpithets = listOf("Globe-Trotter"),
                    incompleteTargetEpithets = listOf("Triple Tiara (1/3)"),
                    extraCompletedEpithets = listOf("G1 Hunter"),
                    sparkPicks =
                        listOf(
                            SparkPickHistory.Record(
                                pickIndex = 1,
                                optionTexts = listOf("Speed +5%", "Stamina +3%", "Power +2%"),
                                strategy = "StatAndAptitude",
                            ),
                        ),
                    fanWeight = 1.0,
                    minimumFanTarget = 120000,
                    minimumRaceGapTurns = 1,
                    targetEpithetMultiplier = 4.0,
                    raceStats = RunRaceStats(wins = 18, losses = 2),
                    elapsedMs = 3600000L,
                    trainingBias = "Auto distance · Speed-first · skill hints on · stat targets off",
                ),
            )

        assertTrue(summary.contains("Parent Run Complete"))
        assertTrue(summary.contains("Training bias: Auto distance"), summary)
        assertTrue(summary.contains("G1 / Fan Parent"), summary)
        assertTrue(summary.contains("Targets completed"), summary)
        assertTrue(summary.contains("Inheritance sparks"), summary)
        assertTrue(summary.contains("fanFloor=120000"), summary)
        assertTrue(summary.contains("18 wins, 2 losses"), summary)
    }

    @Test
    fun buildDiscordMarkdown_uses_markdown_sections() {
        val trainee = Trainee()
        trainee.name = "Special Week"
        trainee.fans = 250000
        trainee.fanCountClass = FanCountClass.GOLD
        trainee.skillPoints = 420

        val markdown =
            ParentRunSummary.buildDiscordMarkdown(
                ParentRunSummaryInput(
                    trainee = trainee,
                    scenario = "Trackblazer",
                    profileName = "Parents",
                    bundleLabel = "Special Week — G1 / Fan Parent",
                    goalPresetLabel = "G1 / Fan Parent",
                    characterPreset = "Special Week",
                    sparkStrategy = "StatAndAptitude",
                    targetEpithets = listOf("Globe-Trotter"),
                    completedTargetEpithets = listOf("Globe-Trotter"),
                    incompleteTargetEpithets = emptyList(),
                    extraCompletedEpithets = emptyList(),
                    sparkPicks = emptyList(),
                    fanWeight = 1.0,
                    minimumFanTarget = 120000,
                    minimumRaceGapTurns = 1,
                    targetEpithetMultiplier = 4.0,
                    raceStats = RunRaceStats(wins = 10, losses = 1),
                    elapsedMs = 1800000L,
                ),
            )

        assertTrue(markdown.contains("**Parent run complete**"), markdown)
        assertTrue(markdown.contains("**Overview**"), markdown)
        assertTrue(markdown.contains("**Setup**"), markdown)
        assertTrue(markdown.contains("G1 / Fan Parent"), markdown)
        assertTrue(!markdown.contains("```"), markdown)
    }

    @Test
    fun buildDiscordEmbed_includes_key_fields_and_color() {
        val trainee = Trainee()
        trainee.name = "Special Week"
        trainee.fans = 250000
        trainee.fanCountClass = FanCountClass.GOLD
        trainee.skillPoints = 420

        val embed =
            ParentRunSummary.buildDiscordEmbed(
                ParentRunSummaryInput(
                    trainee = trainee,
                    scenario = "Trackblazer",
                    profileName = "Parents",
                    bundleLabel = "Special Week — G1 / Fan Parent",
                    goalPresetLabel = "G1 / Fan Parent",
                    characterPreset = "Special Week",
                    sparkStrategy = "StatAndAptitude",
                    targetEpithets = listOf("Globe-Trotter", "Triple Tiara"),
                    completedTargetEpithets = listOf("Globe-Trotter"),
                    incompleteTargetEpithets = listOf("Triple Tiara (1/3)"),
                    extraCompletedEpithets = emptyList(),
                    sparkPicks = emptyList(),
                    fanWeight = 1.0,
                    minimumFanTarget = 120000,
                    minimumRaceGapTurns = 1,
                    targetEpithetMultiplier = 4.0,
                    raceStats = RunRaceStats(wins = 10, losses = 1),
                    elapsedMs = 1800000L,
                ),
            )

        assertTrue(embed.title.contains("Parent run complete"), embed.title)
        assertTrue(embed.fields.any { it.name == "Bundle" }, embed.fields.map { it.name }.toString())
        assertTrue(embed.fields.any { it.name == "Completed" }, embed.fields.map { it.name }.toString())
        assertTrue(embed.toPlainFallback().contains("Globe-Trotter"), embed.toPlainFallback())
    }

    @Test
    fun buildDiscordEmbed_includes_quality_breakdown() {
        val trainee = Trainee()
        trainee.name = "Special Week"
        trainee.fans = 250000
        trainee.fanCountClass = FanCountClass.GOLD

        val embed =
            ParentRunSummary.buildDiscordEmbed(
                ParentRunSummaryInput(
                    trainee = trainee,
                    scenario = "Trackblazer",
                    profileName = "Parents",
                    bundleLabel = "Bundle",
                    goalPresetLabel = "Goal",
                    characterPreset = "Special Week",
                    sparkStrategy = "StatAndAptitude",
                    targetEpithets = listOf("Globe-Trotter"),
                    completedTargetEpithets = listOf("Globe-Trotter"),
                    incompleteTargetEpithets = emptyList(),
                    extraCompletedEpithets = emptyList(),
                    sparkPicks = emptyList(),
                    fanWeight = 1.0,
                    minimumFanTarget = 120000,
                    minimumRaceGapTurns = 1,
                    targetEpithetMultiplier = 4.0,
                    raceStats = RunRaceStats(wins = 10, losses = 1),
                    elapsedMs = 1800000L,
                ),
            )

        val breakdownField = embed.fields.firstOrNull { it.name == "Quality breakdown" }
        assertTrue(breakdownField != null, embed.fields.map { it.name }.toString())
        assertTrue(breakdownField!!.value.contains("Epithets"), breakdownField.value)
        assertTrue(breakdownField.value.contains("/35"), breakdownField.value)
    }

    @Test
    fun buildDiscordEmbed_includes_history_comparison_when_provided() {
        val trainee = Trainee()
        trainee.name = "Special Week"
        trainee.fans = 250000
        trainee.fanCountClass = FanCountClass.GOLD

        val input =
            ParentRunSummaryInput(
                trainee = trainee,
                scenario = "Trackblazer",
                profileName = "Parents",
                bundleLabel = "Bundle",
                goalPresetLabel = "Goal",
                characterPreset = "Special Week",
                sparkStrategy = "StatAndAptitude",
                targetEpithets = listOf("Globe-Trotter"),
                completedTargetEpithets = listOf("Globe-Trotter"),
                incompleteTargetEpithets = emptyList(),
                extraCompletedEpithets = emptyList(),
                sparkPicks = emptyList(),
                fanWeight = 1.0,
                minimumFanTarget = 120000,
                minimumRaceGapTurns = 1,
                targetEpithetMultiplier = 4.0,
                raceStats = RunRaceStats(wins = 10, losses = 1),
                elapsedMs = 1800000L,
            )

        val comparison =
            ParentRunArchive.RunComparison(
                runCount = 5,
                avgFans = 200000L,
                avgQualityScore = 70.0,
                bestFans = 300000,
                bestQualityScore = 95,
                bestGrade = "S",
            )

        val embedWithoutHistory = ParentRunSummary.buildDiscordEmbed(input)
        assertTrue(embedWithoutHistory.fields.none { it.name == "History" })

        val embedWithHistory = ParentRunSummary.buildDiscordEmbed(input, comparison)
        val historyField = embedWithHistory.fields.firstOrNull { it.name == "History" }
        assertTrue(historyField != null, embedWithHistory.fields.map { it.name }.toString())
        assertTrue(historyField!!.value.contains("vs avg over 5 runs"), historyField.value)
        assertTrue(historyField.value.contains("vs best"), historyField.value)
    }

    @Test
    fun buildSimpleDiscordEmbed_includes_basic_run_stats() {
        val trainee = Trainee()
        trainee.name = "Special Week"
        trainee.fans = 250000
        trainee.fanCountClass = FanCountClass.GOLD
        trainee.skillPoints = 420
        trainee.trackSurfaceAptitudes[TrackSurface.TURF] = Aptitude.A
        trainee.trackSurfaceAptitudes[TrackSurface.DIRT] = Aptitude.C

        val embed =
            ParentRunSummary.buildSimpleDiscordEmbed(
                trainee = trainee,
                scenario = "Trackblazer",
                elapsedMs = 1800000L,
                raceStats = RunRaceStats(wins = 10, losses = 1),
            )

        assertTrue(embed.title == "Career complete", embed.title)
        assertTrue(embed.description?.contains("Special Week") == true, embed.description.toString())
        assertTrue(embed.fields.any { it.name == "Runtime" }, embed.fields.map { it.name }.toString())
        assertTrue(embed.fields.any { it.name == "Races" && it.value.contains("10 wins") }, embed.fields.map { it.name }.toString())
        assertTrue(embed.fields.any { it.name == "Fans" && it.value.contains("250000") }, embed.fields.map { it.name }.toString())
        assertTrue(embed.fields.none { it.name == "Harvest" }, embed.fields.map { it.name }.toString())
    }

    @Test
    fun chunkForDiscord_splits_long_text() {
        val longText = "line\n".repeat(500)
        val chunks = ParentRunSummary.chunkForDiscord(longText, 200)
        assertTrue(chunks.size > 1)
        chunks.forEach { chunk -> assertTrue(chunk.length <= 200) }
    }
}
