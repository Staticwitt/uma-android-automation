package com.steve1316.uma_android_automation.bot

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
    fun likelyScenarioSelectFromOcr_requiresMultipleScenarioKeywords() {
        assertFalse(ParentFarmingColdStart.likelyScenarioSelectFromOcr("only trackblazer here"))
        assertTrue(
            ParentFarmingColdStart.likelyScenarioSelectFromOcr(
                "trackblazer ura finale unity cup choose scenario",
            ),
        )
    }
}
