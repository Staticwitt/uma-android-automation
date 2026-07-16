package com.steve1316.uma_android_automation.bot

import com.steve1316.uma_android_automation.types.Mood
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

/** Unit tests for [MoodRecoveryPolicy.relaxedMoodFloor], the energy-aware mood-recovery floor. */
@DisplayName("Mood recovery policy")
class MoodRecoveryPolicyTest {
    @Test
    @DisplayName("Tolerance off leaves the floor unchanged")
    fun testDisabled() {
        assertEquals(Mood.GOOD, MoodRecoveryPolicy.relaxedMoodFloor(Mood.GOOD, energy = 100, toleranceEnabled = false, energyThreshold = 80))
    }

    @Test
    @DisplayName("Below the energy threshold leaves the floor unchanged even when enabled")
    fun testBelowThreshold() {
        assertEquals(Mood.GOOD, MoodRecoveryPolicy.relaxedMoodFloor(Mood.GOOD, energy = 79, toleranceEnabled = true, energyThreshold = 80))
    }

    @Test
    @DisplayName("At or above the threshold lowers the floor by one level")
    fun testRelaxedAtThreshold() {
        // GOOD -> NORMAL: the bot now trains through Normal mood at high energy instead of recovering.
        assertEquals(Mood.NORMAL, MoodRecoveryPolicy.relaxedMoodFloor(Mood.GOOD, energy = 80, toleranceEnabled = true, energyThreshold = 80))
        assertEquals(Mood.GOOD, MoodRecoveryPolicy.relaxedMoodFloor(Mood.GREAT, energy = 95, toleranceEnabled = true, energyThreshold = 80))
    }

    @Test
    @DisplayName("The floor never drops below AWFUL")
    fun testClampFloor() {
        assertEquals(Mood.AWFUL, MoodRecoveryPolicy.relaxedMoodFloor(Mood.AWFUL, energy = 100, toleranceEnabled = true, energyThreshold = 80))
    }
}
