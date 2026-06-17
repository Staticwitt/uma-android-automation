package com.steve1316.uma_android_automation.bot.solver

import com.steve1316.uma_android_automation.bot.solver.TestFixtures.race
import com.steve1316.uma_android_automation.types.Aptitude
import com.steve1316.uma_android_automation.types.RaceGrade
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

@DisplayName("RaceWinModel")
class RaceWinModelTest {
    private val strong =
        Aptitudes(
            Aptitude.S,
            Aptitude.S,
            Aptitude.S,
            Aptitude.S,
            Aptitude.S,
            Aptitude.S,
        )

    private val weak =
        Aptitudes(
            Aptitude.G,
            Aptitude.G,
            Aptitude.G,
            Aptitude.G,
            Aptitude.G,
            Aptitude.G,
        )

    @Test
    fun strongAptitudesScoreHigherThanWeak() {
        val g1 = race("Test G1", 30, grade = RaceGrade.G1)
        assertTrue(RaceWinModel.winProbability(g1, strong) > RaceWinModel.winProbability(g1, weak))
    }

    @Test
    fun winRateGuardBlocksWeakMatchups() {
        val g1 = race("Test G1", 30, grade = RaceGrade.G1)
        val weights = Weights(minWinRateGuard = 0.8)
        assertFalse(RaceWinModel.passesWinRateGuard(g1, weak, weights))
        assertTrue(RaceWinModel.passesWinRateGuard(g1, strong, weights))
    }

    @Test
    fun assumedRaceWinRateScalesEffectiveRate() {
        val g1 = race("Test G1", 30, grade = RaceGrade.G1)
        val full = RaceWinModel.effectiveWinRate(g1, strong, Weights(assumedRaceWinRate = 1.0))
        val conservative = RaceWinModel.effectiveWinRate(g1, strong, Weights(assumedRaceWinRate = 0.5))
        assertEquals(full * 0.5, conservative, 1e-9)
    }
}
