package com.steve1316.uma_android_automation.bot.solver

import com.steve1316.uma_android_automation.bot.solver.TestFixtures.race
import com.steve1316.uma_android_automation.bot.solver.TestFixtures.state
import com.steve1316.uma_android_automation.bot.solver.TestFixtures.win
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

@DisplayName("EnergyModel")
class EnergyModelTest {
    @Test
    fun restPreferredWhenEnergyCritical() {
        assertTrue(EnergyModel.shouldPreferRest(energy = 8, consecutiveRaces = 3))
        assertTrue(EnergyModel.shouldPreferRest(energy = 25, consecutiveRaces = 0))
    }

    @Test
    fun lowEnergyScheduleIncludesRestTurns() {
        val r30 = race("Race 30", 30)
        val r32 = race("Race 32", 32)
        val st =
            state(
                currentTurn = 30,
                races = listOf(r30, r32),
                initialEnergy = 25,
                weights = Weights(energyRestValue = 5.0, minimumRaceGapTurns = 1),
            )
        val schedule = Heuristic.search(st)
        assertTrue(schedule.decisions.values.any { it == Decision.Rest })
    }
}
