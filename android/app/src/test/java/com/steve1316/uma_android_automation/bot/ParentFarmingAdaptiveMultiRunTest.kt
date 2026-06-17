package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

@DisplayName("ParentFarmingAdaptiveMultiRun")
class ParentFarmingAdaptiveMultiRunTest {
    @Test
    @DisplayName("downgrades failed forced epithets for the next run")
    fun downgradesFailedForced() {
        ParentFarmingAdaptiveMultiRun.reset()
        ParentFarmingAdaptiveMultiRun.noteForcedFailures(listOf("Triple Crown"))
        assertEquals(emptySet<String>(), ParentFarmingAdaptiveMultiRun.effectiveForcedEpithets(setOf("Triple Crown")))
        assertTrue(ParentFarmingAdaptiveMultiRun.extraTargetEpithets().contains("Triple Crown"))
    }
}
