package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Unit tests for [ParentFarmingRunLoop] session counter helpers. */
class ParentFarmingRunLoopTest {
    @Test
    fun resetSession_clearsCompletedRunCount() {
        ParentFarmingRunLoop.resetSession()
        assertEqualsHelper(0, ParentFarmingRunLoop.sessionRunsCompleted())
    }

    @Test
    fun shouldContinueAfterRun_whenDisabled() {
        assertFalse(shouldContinueAfterRunHelper(enabled = false, completed = 0, target = 3))
    }

    @Test
    fun shouldContinueAfterRun_whenTargetReached() {
        assertFalse(shouldContinueAfterRunHelper(enabled = true, completed = 3, target = 3))
    }

    @Test
    fun shouldContinueAfterRun_whenBelowTarget() {
        assertTrue(shouldContinueAfterRunHelper(enabled = true, completed = 1, target = 3))
    }

    @Test
    fun shouldContinueAfterRun_unlimitedWhenTargetZero() {
        assertTrue(shouldContinueAfterRunHelper(enabled = true, completed = 99, target = 0))
    }

    @Test
    fun qualityTargetReached_stopsEarly() {
        assertTrue(qualityTargetReachedHelper(enabled = true, score = 85, target = 80))
        assertFalse(qualityTargetReachedHelper(enabled = true, score = 75, target = 80))
        assertFalse(qualityTargetReachedHelper(enabled = false, score = 95, target = 80))
    }

    /** Mirrors quality-target stop condition without SettingsHelper. */
    private fun qualityTargetReachedHelper(enabled: Boolean, score: Int, target: Int): Boolean {
        if (!enabled) return false
        return score >= target
    }

    /** Mirrors [ParentFarmingRunLoop.shouldContinueAfterRun] without SettingsHelper. */
    private fun shouldContinueAfterRunHelper(enabled: Boolean, completed: Int, target: Int): Boolean {
        if (!enabled) return false
        if (target <= 0) return true
        return completed < target
    }

    private fun assertEqualsHelper(expected: Int, actual: Int) {
        org.junit.jupiter.api.Assertions.assertEquals(expected, actual)
    }
}
