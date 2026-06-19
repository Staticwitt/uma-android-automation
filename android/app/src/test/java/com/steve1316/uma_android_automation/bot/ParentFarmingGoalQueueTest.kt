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

    @Test
    fun wrappedIndex_cyclesBackToStart_pastQueueEnd() {
        assertEquals(0, ParentFarmingGoalQueue.wrappedIndex(0, 4))
        assertEquals(3, ParentFarmingGoalQueue.wrappedIndex(3, 4))
        assertEquals(0, ParentFarmingGoalQueue.wrappedIndex(4, 4))
        assertEquals(1, ParentFarmingGoalQueue.wrappedIndex(5, 4))
        assertEquals(2, ParentFarmingGoalQueue.wrappedIndex(10, 4))
    }

    @Test
    fun wrappedIndex_returnsZero_whenQueueEmpty() {
        assertEquals(0, ParentFarmingGoalQueue.wrappedIndex(7, 0))
    }
}
