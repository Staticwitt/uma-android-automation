package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Unit tests for [SupportCardBorrower] friend-slot satisfaction helper. */
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
}
