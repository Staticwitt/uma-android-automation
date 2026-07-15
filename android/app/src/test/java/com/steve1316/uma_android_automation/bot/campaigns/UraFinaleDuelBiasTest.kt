package com.steve1316.uma_android_automation.bot.campaigns

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

/**
 * Unit tests for the pure Happy Meek duel bias helper, verified without the Android-coupled
 * UraFinaleTraining detection flow.
 */
@DisplayName("Happy Meek duel bias helper")
class UraFinaleDuelBiasTest {
    @Test
    @DisplayName("No badge or Off bias leaves the score untouched")
    fun testNeutralCases() {
        assertEquals(300.0, applyDuelBias(300.0, hasDuelBadge = false, bias = "Aggressive"), 1e-9)
        assertEquals(300.0, applyDuelBias(300.0, hasDuelBadge = true, bias = "Off"), 1e-9)
        assertEquals(300.0, applyDuelBias(300.0, hasDuelBadge = true, bias = "garbage"), 1e-9)
    }

    @Test
    @DisplayName("Moderate wins close calls but does not override a clearly better facility")
    fun testModerateBias() {
        val biased = applyDuelBias(300.0, hasDuelBadge = true, bias = "Moderate")
        assertTrue(biased > 300.0, "Moderate must nudge the badged facility upward")
        assertTrue(biased < 400.0, "Moderate must not let a badged 300-score facility beat a clearly better 400-score one")
    }

    @Test
    @DisplayName("Aggressive strongly prefers the badged facility even from a weak base score")
    fun testAggressiveBias() {
        val weakBadged = applyDuelBias(100.0, hasDuelBadge = true, bias = "Aggressive")
        assertTrue(weakBadged > 400.0, "Aggressive must lift even a weak badged facility above typical plain scores")
    }
}
