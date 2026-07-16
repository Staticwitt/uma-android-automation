package com.steve1316.uma_android_automation.utils

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

/** Unit tests for [StatValueParsing.parseStatValue], the shared OCR stat-value parser. */
@DisplayName("Stat value parsing")
class StatValueParsingTest {
    private val cap = 1950

    @Test
    @DisplayName("Parses a clean value")
    fun testClean() {
        assertEquals(1279, StatValueParsing.parseStatValue("1279", cap))
    }

    @Test
    @DisplayName("Rebuilds a value whose digits OCR split (the bug the main-screen path had)")
    fun testDigitSplit() {
        assertEquals(1279, StatValueParsing.parseStatValue("1 279", cap))
        assertEquals(1279, StatValueParsing.parseStatValue("12 79", cap))
        // A leading '1' split off on its own must not be dropped in favor of the larger "279" fragment.
        assertEquals(1200, StatValueParsing.parseStatValue("1 200", cap))
    }

    @Test
    @DisplayName("Strips surrounding non-digit noise")
    fun testStripsNoise() {
        assertEquals(842, StatValueParsing.parseStatValue("  842  ", cap))
        assertEquals(842, StatValueParsing.parseStatValue("Spd 842", cap))
    }

    @Test
    @DisplayName("Rejects an empty or digitless read")
    fun testEmpty() {
        assertEquals(-1, StatValueParsing.parseStatValue("", cap))
        assertEquals(-1, StatValueParsing.parseStatValue("---", cap))
    }

    @Test
    @DisplayName("Rejects a value above the cap as a misread")
    fun testOverCap() {
        assertEquals(-1, StatValueParsing.parseStatValue("2600", cap))
        // A digit run too long to fit in an Int is also a misread, not a crash.
        assertEquals(-1, StatValueParsing.parseStatValue("99999999999999", cap))
    }

    @Test
    @DisplayName("Accepts a value exactly at the cap")
    fun testAtCap() {
        assertEquals(cap, StatValueParsing.parseStatValue("1950", cap))
    }

    @Test
    @DisplayName("Handles a leading zero")
    fun testLeadingZero() {
        assertEquals(279, StatValueParsing.parseStatValue("0279", cap))
    }
}
