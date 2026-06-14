package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

@DisplayName("SparkSelectionScorer")
class SparkSelectionScorerTest {
    private val statContext =
        SparkSelectionContext(
            strategy = "StatAndAptitude",
            statPriorities = listOf("Speed", "Stamina", "Power", "Guts", "Wit"),
            aptitudePriorities = listOf("Mile", "Dirt", "Sprint", "Medium", "Long", "Turf"),
            preferSkillHints = true,
        )

    @Test
    @DisplayName("Default strategy keeps all options tied at zero")
    fun defaultStrategyScoresZero() {
        val context = statContext.copy(strategy = "Default")
        assertEquals(0.0, SparkSelectionScorer.score("Speed +5%", context))
    }

    @Test
    @DisplayName("Stat and aptitude strategy prefers targeted mileage aptitude text")
    fun statStrategyPrefersMileAptitude() {
        val mileScore = SparkSelectionScorer.score("Mile aptitude spark", statContext)
        val sprintScore = SparkSelectionScorer.score("Sprint aptitude spark", statContext)
        assertTrue(mileScore > sprintScore)
    }

    @Test
    @DisplayName("Skill hint strategy prefers hint sparks over raw stat text")
    fun skillStrategyPrefersHints() {
        val context =
            SparkSelectionContext(
                strategy = "SkillHints",
                statPriorities = listOf("Speed"),
                aptitudePriorities = listOf("Mile"),
                preferSkillHints = true,
            )
        val hintScore = SparkSelectionScorer.score("Reward: Top Pick hint +1", context)
        val statScore = SparkSelectionScorer.score("Speed +3%", context)
        assertTrue(hintScore > statScore)
    }

    @Test
    @DisplayName("Aptitude priorities rank weaker solver aptitudes earlier")
    fun buildAptitudePrioritiesUsesDistanceBiasAndWeakGrades() {
        val json = """{"Sprint":"G","Mile":"A","Medium":"B","Long":"A","Turf":"A","Dirt":"G"}"""
        val priorities = SparkSelectionScorer.buildAptitudePriorities(json, "Mile")
        assertEquals("Mile", priorities.first())
        assertTrue(priorities.indexOf("Dirt") < priorities.indexOf("Long"))
    }
}
