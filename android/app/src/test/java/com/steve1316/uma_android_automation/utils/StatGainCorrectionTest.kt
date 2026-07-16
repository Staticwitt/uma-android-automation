package com.steve1316.uma_android_automation.utils

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

/** Unit tests for [StatGainCorrection], the scenario-aware stat-gain misread correction. */
@DisplayName("Stat gain correction")
class StatGainCorrectionTest {
    @Test
    @DisplayName("A gain over 100 is no longer clipped for a normal scenario (the reported bug)")
    fun testLegitLargeGainKept() {
        val cap = StatGainCorrection.maxPlausibleSingleFacilityGain("URA Finale")
        assertEquals(120, StatGainCorrection.correctStatGainMisread(120, cap))
        assertEquals(150, StatGainCorrection.correctStatGainMisread(150, cap))
    }

    @Test
    @DisplayName("A spurious third digit is still corrected once past the scenario ceiling")
    fun testFalseThirdDigitCorrected() {
        val cap = StatGainCorrection.maxPlausibleSingleFacilityGain("URA Finale")
        // 45 read as 452 -> 45.
        assertEquals(45, StatGainCorrection.correctStatGainMisread(452, cap))
        assertEquals(34, StatGainCorrection.correctStatGainMisread(345, cap))
    }

    @Test
    @DisplayName("Unity Cup allows a higher gain than other scenarios (spirit bursts)")
    fun testUnityCupHigherCeiling() {
        val unity = StatGainCorrection.maxPlausibleSingleFacilityGain("Unity Cup")
        val other = StatGainCorrection.maxPlausibleSingleFacilityGain("URA Finale")
        assertTrue(unity > other)
        // A 250 gain is kept under Unity Cup but corrected as a misread elsewhere.
        assertEquals(250, StatGainCorrection.correctStatGainMisread(250, unity))
        assertEquals(25, StatGainCorrection.correctStatGainMisread(250, other))
    }

    @Test
    @DisplayName("A value at the ceiling is kept; just above it is corrected")
    fun testBoundary() {
        val cap = StatGainCorrection.maxPlausibleSingleFacilityGain("URA Finale")
        assertEquals(cap, StatGainCorrection.correctStatGainMisread(cap, cap))
        assertEquals((cap + 1) / 10, StatGainCorrection.correctStatGainMisread(cap + 1, cap))
    }

    @Test
    @DisplayName("An unknown scenario falls back to the default ceiling")
    fun testUnknownScenarioDefault() {
        assertEquals(200, StatGainCorrection.maxPlausibleSingleFacilityGain("Some Future Scenario"))
    }
}
