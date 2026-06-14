package com.steve1316.uma_android_automation.bot.solver

import com.steve1316.uma_android_automation.bot.solver.TestFixtures.epithet
import com.steve1316.uma_android_automation.bot.solver.TestFixtures.race
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

@DisplayName("EpithetReachability")
class EpithetReachabilityTest {
    @Test
    fun winRaceEpithetDeadAfterLoss() {
        val r = race("Japan Cup", 60)
        val ep = epithet("Cup Winner", listOf(EpithetMatcher.WinRace("Japan Cup")))
        val racesByTurn = mapOf(60 to listOf(r))

        val dead =
            EpithetReachability.epithetsMadeUnreachable(
                epithets = listOf(ep),
                racesByTurn = racesByTurn,
                wins = emptyList(),
                lostRaceNames = setOf("Japan Cup"),
                currentTurn = 61,
            )

        assertEquals(setOf("Cup Winner"), dead)
    }

    @Test
    fun winAnyOfSurvivesWhenAlternateRaceRemains() {
        val rA = race("Race A", 30)
        val rB = race("Race B", 32)
        val ep = epithet("Either", listOf(EpithetMatcher.WinAnyOf(listOf("Race A", "Race B"), count = 1)))
        val racesByTurn = mapOf(30 to listOf(rA), 32 to listOf(rB))

        val dead =
            EpithetReachability.epithetsMadeUnreachable(
                epithets = listOf(ep),
                racesByTurn = racesByTurn,
                wins = emptyList(),
                lostRaceNames = setOf("Race A"),
                currentTurn = 31,
            )

        assertTrue(dead.isEmpty())
    }

    @Test
    fun dependencyEpithetDeadWhenPrerequisiteDead() {
        val prereq = epithet("Base", listOf(EpithetMatcher.WinRace("Base Stakes")))
        val child = epithet("Child", listOf(EpithetMatcher.EpithetAll(listOf("Base"))))
        val r = race("Base Stakes", 30)
        val racesByTurn = mapOf(30 to listOf(r))

        val dead =
            EpithetReachability.epithetsMadeUnreachable(
                epithets = listOf(prereq, child),
                racesByTurn = racesByTurn,
                wins = emptyList(),
                lostRaceNames = setOf("Base Stakes"),
                currentTurn = 31,
            )

        assertEquals(setOf("Base", "Child"), dead)
    }

    @Test
    fun alreadyCompletedEpithetNotMarkedDead() {
        val r = race("Done Stakes", 20)
        val ep = epithet("Done", listOf(EpithetMatcher.WinRace("Done Stakes")))
        val wins = listOf(RaceWin(r.key, r.name, r.classYear, 20))

        val dead =
            EpithetReachability.epithetsMadeUnreachable(
                epithets = listOf(ep),
                racesByTurn = mapOf(20 to listOf(r)),
                wins = wins,
                lostRaceNames = emptySet(),
                currentTurn = 25,
                completedEpithetNames = setOf("Done"),
            )

        assertTrue(dead.isEmpty())
    }

    @Test
    fun pastTurnWithoutWinIsUnreachable() {
        val r = race("Missed Stakes", 25)
        val ep = epithet("Missed", listOf(EpithetMatcher.WinRace("Missed Stakes")))
        val racesByTurn = mapOf(25 to listOf(r))

        val dead =
            EpithetReachability.epithetsMadeUnreachable(
                epithets = listOf(ep),
                racesByTurn = racesByTurn,
                wins = emptyList(),
                lostRaceNames = emptySet(),
                currentTurn = 30,
            )

        assertEquals(setOf("Missed"), dead)
    }

    @Test
    fun doesNotReReportAlreadyDeadEpithets() {
        val r = race("Race A", 30)
        val ep = epithet("A", listOf(EpithetMatcher.WinRace("Race A")))

        val dead =
            EpithetReachability.epithetsMadeUnreachable(
                epithets = listOf(ep),
                racesByTurn = mapOf(30 to listOf(r)),
                wins = emptyList(),
                lostRaceNames = setOf("Race A"),
                currentTurn = 31,
                alreadyDead = setOf("A"),
            )

        assertTrue(dead.isEmpty())
    }
}
