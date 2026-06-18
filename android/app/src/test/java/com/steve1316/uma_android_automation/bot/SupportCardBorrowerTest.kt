package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Unit tests for [SupportCardBorrower] matching helpers. */
class SupportCardBorrowerTest {
    @Test
    fun isFriendSupportSatisfied_matchesAnyPreferredName() {
        val preferred = listOf("Maruzensky", "Super Creek")
        assertTrue(
            preferred.any { name ->
                SupportCardSelection.matchScore("maruzensky speed", name) >= SupportCardSelection.MIN_NAME_MATCH_SCORE
            },
        )
        assertFalse(
            preferred.any { name ->
                SupportCardSelection.matchScore("gold ship", name) >= SupportCardSelection.MIN_NAME_MATCH_SCORE
            },
        )
    }

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
}
