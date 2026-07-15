package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

/**
 * Unit tests for the pure momentum race-selection helpers — the streak-driven win-rate guard floor
 * adjustment, verified without the Android-coupled MomentumRaceSelection object state.
 */
@DisplayName("Momentum race selection helpers")
class MomentumRaceSelectionTest {
    @Test
    @DisplayName("No streak leaves the guard floor untouched")
    fun testNoStreakIsNeutral() {
        assertEquals(0.4, momentumAdjustedGuardFloor(baseFloor = 0.4, winStreak = 0, lossStreak = 0, fansStillNeeded = true), 1e-9)
        assertEquals(0.4, momentumAdjustedGuardFloor(baseFloor = 0.4, winStreak = 1, lossStreak = 0, fansStillNeeded = true), 1e-9)
        assertEquals(0.4, momentumAdjustedGuardFloor(baseFloor = 0.4, winStreak = 0, lossStreak = 1, fansStillNeeded = true), 1e-9)
    }

    @Test
    @DisplayName("A losing streak tightens the floor per loss and caps out")
    fun testLossStreakTightens() {
        assertEquals(0.5, momentumAdjustedGuardFloor(baseFloor = 0.4, winStreak = 0, lossStreak = 2, fansStillNeeded = false), 1e-9)
        assertEquals(0.55, momentumAdjustedGuardFloor(baseFloor = 0.4, winStreak = 0, lossStreak = 3, fansStillNeeded = false), 1e-9)
        // 4+ losses hit the 0.15 cap instead of growing unbounded.
        assertEquals(0.55, momentumAdjustedGuardFloor(baseFloor = 0.4, winStreak = 0, lossStreak = 6, fansStillNeeded = false), 1e-9)
    }

    @Test
    @DisplayName("A losing streak enables a floor even when the user's guard is off")
    fun testLossStreakEnablesDisabledGuard() {
        val adjusted = momentumAdjustedGuardFloor(baseFloor = 0.0, winStreak = 0, lossStreak = 3, fansStillNeeded = false)
        assertTrue(adjusted > 0.0, "A slump should temporarily enable a win-rate floor even with the base guard disabled")
    }

    @Test
    @DisplayName("A winning streak relaxes the floor only while fans are still needed")
    fun testWinStreakRelaxesOnlyWithFanGap() {
        assertEquals(0.35, momentumAdjustedGuardFloor(baseFloor = 0.4, winStreak = 3, lossStreak = 0, fansStillNeeded = true), 1e-9)
        // Fan goals met: extra races cost training turns for nothing, so the streak is not ridden.
        assertEquals(0.4, momentumAdjustedGuardFloor(baseFloor = 0.4, winStreak = 5, lossStreak = 0, fansStillNeeded = false), 1e-9)
        // Below the win-streak threshold, no relaxation even with a fan gap.
        assertEquals(0.4, momentumAdjustedGuardFloor(baseFloor = 0.4, winStreak = 2, lossStreak = 0, fansStillNeeded = true), 1e-9)
    }

    @Test
    @DisplayName("Adjusted floor stays inside [0, 0.95]")
    fun testFloorStaysClamped() {
        assertEquals(0.0, momentumAdjustedGuardFloor(baseFloor = 0.0, winStreak = 4, lossStreak = 0, fansStillNeeded = true), 1e-9)
        assertEquals(0.95, momentumAdjustedGuardFloor(baseFloor = 0.9, winStreak = 0, lossStreak = 6, fansStillNeeded = false), 1e-9)
    }

    @Test
    @DisplayName("Fan gap detection requires a configured target and an actual shortfall")
    fun testFansStillNeeded() {
        assertTrue(momentumFansStillNeeded(currentFans = 5000, minimumFanTarget = 10000))
        assertFalse(momentumFansStillNeeded(currentFans = 10000, minimumFanTarget = 10000), "Meeting the target exactly means no fan gap")
        assertFalse(momentumFansStillNeeded(currentFans = 5000, minimumFanTarget = 0), "A target of 0 means no fan requirement is configured")
    }
}
