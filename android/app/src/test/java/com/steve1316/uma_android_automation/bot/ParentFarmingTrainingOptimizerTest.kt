package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ParentFarmingTrainingOptimizerTest {
    @Test
    fun optimizedStatPriorities_reorders_without_crashing_when_disabled_path() {
        val base = listOf(com.steve1316.uma_android_automation.types.StatName.SPEED)
        val result = ParentFarmingTrainingOptimizer.optimizedStatPriorities(base)
        assertTrue(result.isNotEmpty())
    }
}
