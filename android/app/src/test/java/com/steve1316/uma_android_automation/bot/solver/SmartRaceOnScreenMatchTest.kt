package com.steve1316.uma_android_automation.bot.solver

import com.steve1316.uma_android_automation.bot.Racing.RaceData
import com.steve1316.uma_android_automation.types.RaceGrade
import com.steve1316.uma_android_automation.types.TrackDistance
import com.steve1316.uma_android_automation.types.TrackSurface
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/** Unit tests for on-screen race fuzzy matching in [SmartRaceSolverIntegration]. */
class SmartRaceOnScreenMatchTest {
    private fun race(name: String, grade: RaceGrade = RaceGrade.G1): RaceData =
        RaceData(
            name = name,
            grade = grade,
            fans = 1000,
            nameFormatted = name,
            trackSurface = TrackSurface.TURF,
            trackDistance = TrackDistance.MILE,
            turnNumber = 40,
            isRival = false,
        )

    @Test
    fun bestFuzzyOnScreenRaceMatch_picksCloseOcrName() {
        val match =
            SmartRaceSolverIntegration.bestFuzzyOnScreenRaceMatch(
                plannedRaceKey = "Tenno Sho (Spring) (Senior Year Late Apr)",
                plannedGrade = RaceGrade.G1,
                candidates = listOf(race("Tenno Sho Spring"), race("Oka Sho")),
            )
        assertEquals("Tenno Sho Spring", match?.name)
    }

    @Test
    fun bestFuzzyOnScreenRaceMatch_returnsNullWhenNoOverlap() {
        val match =
            SmartRaceSolverIntegration.bestFuzzyOnScreenRaceMatch(
                plannedRaceKey = "Japan Cup (Senior Year Late Nov)",
                plannedGrade = RaceGrade.G1,
                candidates = listOf(race("Oka Sho"), race("Sprinters Stakes")),
            )
        assertNull(match)
    }
}
