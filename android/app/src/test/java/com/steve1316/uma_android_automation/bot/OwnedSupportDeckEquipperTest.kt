package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Unit tests for [OwnedSupportDeckEquipper] slot batch helpers. */
class OwnedSupportDeckEquipperTest {
    @Test
    fun countSatisfiedSlotsFromTexts_countsMatchingSlots() {
        val owned = listOf("Maruzensky", "Super Creek", "Gold Ship", "Silence Suzuka")
        val slotTexts = listOf("maruzensky speed", "super creek stamina", "gold ship", "wrong card")
        assertEquals(3, OwnedSupportDeckEquipper.countSatisfiedSlotsFromTexts(slotTexts, owned))
    }

    @Test
    fun slotMatchesCard_usesSupportSelectionThreshold() {
        assertTrue(OwnedSupportDeckEquipper.slotMatchesCard("maruzensky speed", "Maruzensky"))
        assertFalse(OwnedSupportDeckEquipper.slotMatchesCard("abcdef", "Maruzensky"))
    }
}
