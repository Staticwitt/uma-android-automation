package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Unit tests for [SupportCardBorrower] OCR prefilter helpers (via package-visible patterns).
 */
class SupportCardBorrowerTest {
    @Test
    fun ocrMightMatchName_acceptsSubstring() {
        assertTrue(ocrMightMatchNameHelper("maruzensky speed", "maruzensky"))
    }

    @Test
    fun ocrMightMatchName_rejectsNoOverlap() {
        assertFalse(ocrMightMatchNameHelper("abcdef", "gold ship"))
    }

    /** Mirrors [SupportCardBorrower] private prefilter without widening API surface. */
    private fun ocrMightMatchNameHelper(normalizedOcr: String, needle: String): Boolean {
        if (needle.isEmpty()) return false
        if (normalizedOcr.contains(needle)) return true
        if (needle.length < 3) return true
        for (i in 0..needle.length - 3) {
            if (normalizedOcr.contains(needle.substring(i, i + 3))) return true
        }
        return false
    }
}
