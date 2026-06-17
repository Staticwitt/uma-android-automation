package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class RaceCaratRetryTest {
    @Test
    fun canSpend_respects_enable_flag_and_cap() {
        assertFalse(RaceCaratRetry.canSpend(enabled = false, maxPerRun = 5, used = 0))
        assertTrue(RaceCaratRetry.canSpend(enabled = true, maxPerRun = 5, used = 4))
        assertFalse(RaceCaratRetry.canSpend(enabled = true, maxPerRun = 5, used = 5))
        assertTrue(RaceCaratRetry.canSpend(enabled = true, maxPerRun = 0, used = 99))
    }

    @Test
    fun formatBudgetLabel_shows_unlimited_when_cap_zero() {
        assertTrue(RaceCaratRetry.formatBudgetLabel(2, 0).contains("∞"))
        assertTrue(RaceCaratRetry.formatBudgetLabel(2, 5).contains("2/5"))
    }
}
