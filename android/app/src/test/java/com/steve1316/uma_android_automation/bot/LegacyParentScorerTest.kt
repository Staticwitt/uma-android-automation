package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Unit tests for [LegacyParentScorer] OCR scoring heuristics. */
class LegacyParentScorerTest {
    private val statContext =
        LegacyParentScorer.Context(
            strategy = "StatAndAptitude",
            statPriorities = listOf("Speed", "Stamina", "Power"),
            preferSkillHints = false,
        )

    private val skillContext =
        LegacyParentScorer.Context(
            strategy = "SkillHints",
            statPriorities = listOf("Wit", "Speed"),
            preferSkillHints = true,
        )

    @Test
    fun defaultStrategyScoresZero() {
        val context = LegacyParentScorer.Context(strategy = "Default", statPriorities = emptyList(), preferSkillHints = false)
        assertEquals(0.0, LegacyParentScorer.score("Speed factor · sprint", context))
    }

    @Test
    fun statAndAptitudePrefersMatchingStatsAndAptitude() {
        val high = LegacyParentScorer.score("Speed · Stamina · sprint · turf", statContext)
        val low = LegacyParentScorer.score("Guts only", statContext)
        assertTrue(high > low)
    }

    @Test
    fun skillHintsPrefersHintKeywords() {
        val hint = LegacyParentScorer.score("White skill hint inherit factor", skillContext)
        val plain = LegacyParentScorer.score("Speed stamina", skillContext)
        assertTrue(hint > plain)
    }

    @Test
    fun balancedCombinesSignals() {
        val context =
            LegacyParentScorer.Context(
                strategy = "Balanced",
                statPriorities = listOf("Speed"),
                preferSkillHints = false,
            )
        val balanced = LegacyParentScorer.score("Speed skill hint sprint", context)
        val statOnly = LegacyParentScorer.score("Speed sprint", context)
        assertTrue(balanced > statOnly)
    }
}
