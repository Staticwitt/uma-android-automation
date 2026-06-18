package com.steve1316.uma_android_automation.bot

import org.junit.Assert.assertFalse
import org.junit.Test

class ParentFarmingGenerationFarmTest {
    @Test
    fun resetSession_clears_iteration_state() {
        ParentFarmingGenerationFarm.resetSession()
        assertFalse(ParentFarmingGenerationFarm.isEnabled())
    }
}
