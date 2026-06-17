package com.steve1316.uma_android_automation.bot

import com.steve1316.uma_android_automation.types.Mood
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class DiscordSolverNotifierTest {
    @Test
    fun buildRaceLossEmbed_includes_race_and_turn() {
        val spec = DiscordSolverNotifier.buildRaceLossEmbed("Japan Cup", 42)
        assertEquals("Race lost", spec.title)
        assertEquals("Japan Cup", spec.description)
        assertEquals(DiscordEmbedColors.RED, spec.colorRgb)
        assertTrue(spec.fields.any { it.name == "Turn" && it.value == "42" })
    }

    @Test
    fun buildWinRateGuardSkipEmbed_shows_probability_and_floor() {
        val spec =
            DiscordSolverNotifier.buildWinRateGuardSkipEmbed(
                raceKey = "Test G1",
                turnNumber = 30,
                winProbability = 0.62,
                guardFloor = 0.75,
            )
        assertEquals("Win-rate guard skipped race", spec.title)
        assertEquals("Test G1", spec.description)
        assertEquals(DiscordEmbedColors.YELLOW, spec.colorRgb)
        assertTrue(spec.fields.any { it.name == "P(win)" && it.value == "62%" })
        assertTrue(spec.fields.any { it.name == "Guard floor" && it.value == "75%" })
    }
}

class ParentDiscordNotifierTest {
    @Test
    fun formatMood_titleCases_enum_name() {
        assertEquals("Great", ParentDiscordNotifier.formatMood(Mood.GREAT))
        assertEquals("Normal", ParentDiscordNotifier.formatMood(Mood.NORMAL))
    }
}
