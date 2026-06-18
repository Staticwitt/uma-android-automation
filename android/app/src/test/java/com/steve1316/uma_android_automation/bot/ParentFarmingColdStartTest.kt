package com.steve1316.uma_android_automation.bot

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ParentFarmingColdStartTest {
    @Test
    fun scenarioKeywords_mapTrackblazerUraAndUnity() {
        assertTrue(ParentFarmingColdStart.scenarioKeywords("Trackblazer").any { it.contains("trackblazer") })
        assertTrue(ParentFarmingColdStart.scenarioKeywords("URA Finale").any { it.contains("ura") })
        assertTrue(ParentFarmingColdStart.scenarioKeywords("Unity Cup").any { it.contains("unity") })
    }

    @Test
    fun scenarioTapFraction_returnsDistinctPositions() {
        val track = ParentFarmingColdStart.scenarioTapFraction("Trackblazer")
        val ura = ParentFarmingColdStart.scenarioTapFraction("URA Finale")
        val unity = ParentFarmingColdStart.scenarioTapFraction("Unity Cup")
        assertTrue(track.first < ura.first)
        assertTrue(ura.first < unity.first)
    }

    @Test
    fun likelyScenarioSelectFromOcr_requiresTwoScenarioKeywords() {
        assertFalse(ParentFarmingColdStart.likelyScenarioSelectFromOcr("grass wonder special week"))
        assertFalse(ParentFarmingColdStart.likelyScenarioSelectFromOcr("only trackblazer here"))
        assertTrue(
            ParentFarmingColdStart.likelyScenarioSelectFromOcr(
                "trackblazer ura finale unity cup choose scenario",
            ),
        )
    }

    @Test
    fun shouldPickScenario_isPhaseGatedOnly() {
        ParentFarmingColdStart.resetSession()
        assertFalse(ParentFarmingColdStart.shouldPickScenario())
    }

    @Test
    fun careerHubTapPoint_usesNavAnchorWhenPresent() {
        val anchored = ParentFarmingColdStart.careerHubTapPoint(1080, 2340, 2100.0)
        val fallback = ParentFarmingColdStart.careerHubTapPoint(1080, 2340, null)
        assertTrue(anchored.second < fallback.second)
        assertEquals(907.2, anchored.first, 0.1)
    }

    @Test
    fun resetSession_restoresNavigateHomePhase() {
        ParentFarmingColdStart.resetSession()
        assertTrue(ParentFarmingColdStart.currentPhase() == ParentFarmingColdStart.Phase.NAVIGATE_HOME)
    }
}
