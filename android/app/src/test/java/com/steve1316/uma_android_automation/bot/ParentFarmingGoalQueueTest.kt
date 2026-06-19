package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ParentFarmingGoalQueueTest {
    @Test
    fun overrideString_returnsFallback_whenNoActivePatch() {
        ParentFarmingGoalQueue.setCharacterOverride("Oguri Cap")
        assertEquals("fallback-value", ParentFarmingGoalQueue.overrideString("smartRaceSolverCharacterPreset", "fallback-value"))
        ParentFarmingGoalQueue.setCharacterOverride(null)
    }

    @Test
    fun setCharacterOverride_blankStringTreatedAsNoOverride() {
        ParentFarmingGoalQueue.setCharacterOverride("")
        assertEquals("fallback-value", ParentFarmingGoalQueue.overrideString("smartRaceSolverCharacterPreset", "fallback-value"))
    }
}
