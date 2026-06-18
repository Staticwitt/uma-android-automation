package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Unit tests for [SupportCardBorrower] matching helpers. */
class SupportCardBorrowerTest {
    @Test
    fun pickPriorityBorrowSlot_prefersFirstPreferredName() {
        val slots = listOf("super creek stamina", "maruzensky speed", "gold ship", "silence suzuka")
        val match =
            SupportCardBorrower.pickPriorityBorrowSlot(
                slots,
                listOf("Maruzensky", "Super Creek"),
            )
        assertEquals(1, match?.slot)
        assertEquals("Maruzensky", match?.name)
    }

    @Test
    fun pickPriorityBorrowSlot_scansLeftToRightForEachPreferredName() {
        val slots = listOf("gold ship", "maruzensky speed", "super creek stamina", "silence suzuka")
        val match =
            SupportCardBorrower.pickPriorityBorrowSlot(
                slots,
                listOf("Super Creek", "Maruzensky"),
            )
        assertEquals(2, match?.slot)
        assertEquals("Super Creek", match?.name)
    }

    @Test
    fun pickPriorityBorrowSlot_returnsNullWhenNothingMatches() {
        assertNull(
            SupportCardBorrower.pickPriorityBorrowSlot(
                listOf("gold ship", "silence suzuka"),
                listOf("Maruzensky", "Super Creek"),
            ),
        )
    }

    @Test
    fun isFriendSupportSatisfiedFromOcr_requiresTopPreferredWhenRotationOff() {
        val preferred = listOf("Maruzensky", "Super Creek")
        assertTrue(
            SupportCardBorrower.isFriendSupportSatisfiedFromOcr(
                "maruzensky speed",
                preferred,
                borrowRotationEnabled = false,
            ),
        )
        assertFalse(
            SupportCardBorrower.isFriendSupportSatisfiedFromOcr(
                "super creek stamina",
                preferred,
                borrowRotationEnabled = false,
            ),
        )
    }

    @Test
    fun isFriendSupportSatisfiedFromOcr_acceptsAnyPreferredWhenRotationOn() {
        val preferred = listOf("Maruzensky", "Super Creek")
        assertTrue(
            SupportCardBorrower.isFriendSupportSatisfiedFromOcr(
                "super creek stamina",
                preferred,
                borrowRotationEnabled = true,
            ),
        )
    }
}
