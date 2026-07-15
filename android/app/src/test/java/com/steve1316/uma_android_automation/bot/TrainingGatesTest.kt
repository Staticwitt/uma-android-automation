package com.steve1316.uma_android_automation.bot

import com.steve1316.uma_android_automation.types.StatName
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

/**
 * Unit tests for the pure training gates: the minimum-energy-to-train floor and the per-stat
 * (Wit-specific) failure-chance threshold, verified without a live Campaign/Training.
 */
@DisplayName("Training gate helpers")
class TrainingGatesTest {
    @Test
    @DisplayName("Energy floor rests below it, trains at or above it, and is disabled at 0")
    fun testShouldRestForEnergyFloor() {
        assertTrue(shouldRestForEnergyFloor(energy = 25, minimumEnergyToTrain = 30), "25% energy is below the 30% floor, so the bot should rest")
        assertFalse(shouldRestForEnergyFloor(energy = 30, minimumEnergyToTrain = 30), "Exactly the floor is enough energy to train")
        assertFalse(shouldRestForEnergyFloor(energy = 80, minimumEnergyToTrain = 30), "Above the floor is enough energy to train")
        assertFalse(shouldRestForEnergyFloor(energy = 0, minimumEnergyToTrain = 0), "A floor of 0 disables the check entirely")
    }

    @Test
    @DisplayName("Wit uses its own threshold only when the override is configured")
    fun testWitThresholdOverride() {
        assertEquals(35, statFailureThresholdFor(StatName.WIT, witThreshold = 35, globalThreshold = 18), "A configured Wit override replaces the global threshold for Wit")
        assertEquals(18, statFailureThresholdFor(StatName.WIT, witThreshold = 0, globalThreshold = 18), "An override of 0 means Wit follows the global threshold")
    }

    @Test
    @DisplayName("Non-Wit stats always use the global threshold")
    fun testNonWitStatsUnaffected() {
        for (stat in listOf(StatName.SPEED, StatName.STAMINA, StatName.POWER, StatName.GUTS)) {
            assertEquals(18, statFailureThresholdFor(stat, witThreshold = 35, globalThreshold = 18), "$stat must ignore the Wit override")
        }
    }
}
