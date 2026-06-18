package com.steve1316.uma_android_automation.bot

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class ParentFarmingGenerationFarmTest {
    @Test
    fun resetSession_clears_iteration_state() {
        ParentFarmingGenerationFarm.resetSession()
        assertFalse(ParentFarmingGenerationFarm.isEnabled())
    }

    @Test
    fun resetNavigation_clears_phase_state() {
        ParentFarmingGenerationFarm.resetNavigation()
        // No character configured; should be a no-op rather than acting on stale phase state.
        assertFalse(ParentFarmingGenerationFarm.isEnabled())
    }

    @Test
    fun scenarioKeywords_matchesKnownScenarios() {
        assertEquals(listOf("ura finale", "ura"), ParentFarmingGenerationFarm.scenarioKeywords("URA Finale"))
        assertEquals(listOf("unity cup", "unity", "aoharu"), ParentFarmingGenerationFarm.scenarioKeywords("Unity Cup"))
        assertEquals(listOf("trackblazer", "make a new start"), ParentFarmingGenerationFarm.scenarioKeywords("Trackblazer"))
        assertEquals(listOf("trackblazer", "make a new start"), ParentFarmingGenerationFarm.scenarioKeywords("Unknown Scenario"))
    }

    @Test
    fun scenarioTapFraction_differsPerScenario() {
        assertEquals(0.50 to 0.52, ParentFarmingGenerationFarm.scenarioTapFraction("URA Finale"))
        assertEquals(0.74 to 0.52, ParentFarmingGenerationFarm.scenarioTapFraction("Unity Cup"))
        assertEquals(0.26 to 0.52, ParentFarmingGenerationFarm.scenarioTapFraction("Trackblazer"))
    }

    @Test
    fun careerHubTapPoint_usesNavAnchorWhenAvailable() {
        val (x, y) = ParentFarmingGenerationFarm.careerHubTapPoint(1000, 2000, navAnchorY = 1800.0)
        assertEquals(840.0, x, 0.001)
        assertEquals(1560.0, y, 0.001)
    }

    @Test
    fun careerHubTapPoint_fallsBackToFractionWithoutAnchor() {
        val (x, y) = ParentFarmingGenerationFarm.careerHubTapPoint(1000, 2000, navAnchorY = null)
        assertEquals(840.0, x, 0.001)
        assertEquals(1670.0, y, 0.001)
    }
}
