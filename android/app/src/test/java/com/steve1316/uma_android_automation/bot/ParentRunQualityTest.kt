package com.steve1316.uma_android_automation.bot

import com.steve1316.uma_android_automation.types.FanCountClass
import com.steve1316.uma_android_automation.types.Trainee
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ParentRunQualityTest {
    @Test
    fun score_rewards_completed_targets_and_forced_routes() {
        val trainee = Trainee()
        trainee.fans = 200_000
        trainee.fanCountClass = FanCountClass.GOLD

        val input =
            ParentRunSummaryInput(
                trainee = trainee,
                scenario = "Trackblazer",
                profileName = "",
                bundleLabel = "",
                goalPresetLabel = "G1 Fans",
                characterPreset = "Special Week",
                sparkStrategy = "StatAndAptitude",
                targetEpithets = listOf("Globe-Trotter", "Fan Favorite"),
                forcedEpithets = listOf("Globe-Trotter"),
                completedTargetEpithets = listOf("Globe-Trotter", "Fan Favorite"),
                incompleteTargetEpithets = emptyList(),
                extraCompletedEpithets = listOf("Speed Star"),
                sparkPicks = emptyList(),
                fanWeight = 1.0,
                minimumFanTarget = 120_000,
                minimumRaceGapTurns = 0,
                targetEpithetMultiplier = 4.0,
                raceStats = RunRaceStats(wins = 20, losses = 1),
                elapsedMs = 60_000L,
            )

        val result = ParentRunQuality.score(input)
        assertTrue(result.score >= 85)
        assertEquals("S", result.grade)
        assertEquals(20.0, result.breakdown.forcedScore)
    }
}
