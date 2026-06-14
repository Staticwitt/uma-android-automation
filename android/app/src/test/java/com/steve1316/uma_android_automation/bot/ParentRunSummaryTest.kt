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
                ),
            )

        assertTrue(summary.contains("Parent Run Complete"))
        assertTrue(summary.contains("G1 / Fan Parent"), summary)
        assertTrue(summary.contains("Targets completed"), summary)
        assertTrue(summary.contains("Inheritance sparks"), summary)
        assertTrue(summary.contains("fanFloor=120000"), summary)
        assertTrue(summary.contains("18 wins, 2 losses"), summary)
    }

    @Test
    fun chunkForDiscord_splits_long_text() {
        val longText = "line\n".repeat(500)
        val chunks = ParentRunSummary.chunkForDiscord(longText, 200)
        assertTrue(chunks.size > 1)
        chunks.forEach { chunk -> assertTrue(chunk.length <= 200) }
    }
}
