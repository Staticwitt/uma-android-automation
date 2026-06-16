package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Unit tests for [SupportCardSelection] OCR matching helpers. */
class SupportCardSelectionTest {
    @Test
    fun readStringList_parsesJsonArray() {
        assertEquals(listOf("Maruzensky", "Super Creek"), SupportCardSelection.readStringList("[\"Maruzensky\",\"Super Creek\"]"))
    }

    @Test
    fun readStringList_returnsEmptyForInvalidJson() {
        assertEquals(emptyList<String>(), SupportCardSelection.readStringList("not-json"))
    }

    @Test
    fun ocrMightMatchName_acceptsSubstring() {
        assertTrue(SupportCardSelection.ocrMightMatchName("maruzensky speed", "maruzensky"))
    }

    @Test
    fun ocrMightMatchName_rejectsNoOverlap() {
        assertFalse(SupportCardSelection.ocrMightMatchName("abcdef", "gold ship"))
    }

    @Test
    fun matchScore_prefersExactSubstring() {
        assertEquals(1.0, SupportCardSelection.matchScore("maruzensky speed", "Maruzensky"), 0.001)
    }
}
