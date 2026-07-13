package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

/** Unit tests for the projection-driven auto-abandon decision. Grade comparison is exercised through real rank labels ("B" < "A" < "S"). */
@DisplayName("Run abandon policy")
class RunAbandonPolicyTest {
    private fun projection(projectedGrade: String, turn: Int = 50) =
        RankProjectionResult(
            currentTurn = turn,
            currentScore = 4000,
            currentGrade = "C",
            projectedScore = 6000,
            projectedGrade = projectedGrade,
            scorePerTurn = 40.0,
        )

    @Test
    @DisplayName("Never abandons when disabled")
    fun testDisabled() {
        val d = RunAbandonPolicy.evaluate(projection("G"), currentTurn = 60, config = AbandonConfig(enabled = false, targetGrade = "A"))
        assertFalse(d.shouldAbandon)
    }

    @Test
    @DisplayName("Never abandons before there is a projection")
    fun testNoProjection() {
        val d = RunAbandonPolicy.evaluate(null, currentTurn = 60, config = AbandonConfig(enabled = true, targetGrade = "A"))
        assertFalse(d.shouldAbandon)
    }

    @Test
    @DisplayName("Never abandons before the evaluation turn, even when below target")
    fun testBeforeMinTurn() {
        val d = RunAbandonPolicy.evaluate(projection("G"), currentTurn = 20, config = AbandonConfig(enabled = true, minTurn = 36, targetGrade = "A"))
        assertFalse(d.shouldAbandon, "A doomed projection before the trust turn must still be given a chance")
    }

    @Test
    @DisplayName("Abandons when the projected grade is below target after the evaluation turn")
    fun testAbandonsBelowTarget() {
        val d = RunAbandonPolicy.evaluate(projection("B"), currentTurn = 40, config = AbandonConfig(enabled = true, minTurn = 36, targetGrade = "A"))
        assertTrue(d.shouldAbandon)
        assertTrue(d.reason.contains("below target"), "Reason should explain the abandon")
    }

    @Test
    @DisplayName("Keeps a run projected exactly at target")
    fun testKeepsAtTarget() {
        val d = RunAbandonPolicy.evaluate(projection("A"), currentTurn = 60, config = AbandonConfig(enabled = true, targetGrade = "A"))
        assertFalse(d.shouldAbandon)
    }

    @Test
    @DisplayName("Keeps a run projected above target")
    fun testKeepsAboveTarget() {
        val d = RunAbandonPolicy.evaluate(projection("S"), currentTurn = 60, config = AbandonConfig(enabled = true, targetGrade = "A"))
        assertFalse(d.shouldAbandon)
    }

    @Test
    @DisplayName("Does not abandon on an unknown target grade")
    fun testUnknownTargetGrade() {
        val d = RunAbandonPolicy.evaluate(projection("B"), currentTurn = 60, config = AbandonConfig(enabled = true, targetGrade = "ZZ"))
        assertFalse(d.shouldAbandon)
    }

    @Test
    @DisplayName("Default config is inert (disabled)")
    fun testDefaultInert() {
        assertEquals(false, AbandonConfig().enabled)
        assertFalse(RunAbandonPolicy.evaluate(projection("G"), currentTurn = 70, config = AbandonConfig()).shouldAbandon)
    }
}
