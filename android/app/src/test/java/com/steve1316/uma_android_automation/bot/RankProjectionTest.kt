package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

/** Unit tests for the pure final-rank projection math. Grade labels come from the scoring module's own (separately tested) table. */
@DisplayName("Final-rank projection")
class RankProjectionTest {
    @Test
    @DisplayName("Least-squares slope of a steady climb")
    fun testSlope() {
        assertEquals(100.0, RankProjection.slope(listOf(10 to 2000, 20 to 3000, 30 to 4000)), 1e-9)
        assertEquals(0.0, RankProjection.slope(listOf(30 to 4000)), 1e-9, "A single point has no slope")
        assertEquals(0.0, RankProjection.slope(emptyList()), 1e-9)
    }

    @Test
    @DisplayName("Projects the final score by extrapolating the fitted slope to the final turn")
    fun testProjectExtrapolation() {
        val proj = RankProjection.projectFrom(listOf(10 to 2000, 20 to 3000, 30 to 4000), totalTurns = 73)!!
        assertEquals(30, proj.currentTurn)
        assertEquals(4000, proj.currentScore)
        // slope 100 * (73-30) turns left = +4300 -> 8300.
        assertEquals(8300, proj.projectedScore)
        assertTrue(proj.currentGrade.isNotEmpty() && proj.projectedGrade.isNotEmpty(), "Grades are resolved from the score")
    }

    @Test
    @DisplayName("Never projects below the current score (rating only climbs)")
    fun testFloorAtCurrent() {
        // A dip in the last observation must not drag the projection under what's banked.
        val proj = RankProjection.projectFrom(listOf(40 to 5000, 50 to 5200, 60 to 5100), totalTurns = 73)!!
        assertTrue(proj.projectedScore >= proj.currentScore, "Projected >= current")
    }

    @Test
    @DisplayName("A single observation yields a flat projection")
    fun testSinglePoint() {
        val proj = RankProjection.projectFrom(listOf(60 to 5000), totalTurns = 73)!!
        assertEquals(0.0, proj.scorePerTurn, 1e-9)
        assertEquals(5000, proj.projectedScore)
    }

    @Test
    @DisplayName("The latest turn's observation is treated as current")
    fun testCurrentIsLatest() {
        val proj = RankProjection.projectFrom(listOf(50 to 4000, 60 to 5000, 55 to 4500), totalTurns = 73)!!
        assertEquals(60, proj.currentTurn)
        assertEquals(5000, proj.currentScore)
    }

    @Test
    @DisplayName("Empty observations project to null")
    fun testEmpty() {
        assertNull(RankProjection.projectFrom(emptyList(), totalTurns = 73))
    }

    @Test
    @DisplayName("record de-duplicates by turn and reset clears state")
    fun testRecordAndReset() {
        RankProjection.reset()
        RankProjection.record(10, 2000)
        RankProjection.record(20, 3000)
        RankProjection.record(20, 3200) // same turn re-read overwrites
        val proj = RankProjection.project(totalTurns = 73)
        assertNotNull(proj)
        assertEquals(3200, proj!!.currentScore)
        RankProjection.reset()
        assertNull(RankProjection.project(totalTurns = 73))
    }
}
