package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

@DisplayName("LegacyParentScorer")
class LegacyParentScorerTest {
    private val skillContext =
        LegacyParentScorer.Context(
            strategy = "SkillHints",
            statPriorities = listOf("Speed", "Stamina"),
            preferSkillHints = true,
        )

    @Test
    @DisplayName("Skill hint strategy prefers blue factor OCR text")
    fun skillHintsPreferBlueFactorText() {
        val plain = LegacyParentScorer.score("Speed factor +10", skillContext)
        val blue = LegacyParentScorer.score("Blue factor speed hint", skillContext)
        assertTrue(blue > plain)
    }

    @Test
    @DisplayName("Balanced strategy still rewards blue factor signals")
    fun balancedRewardsBlueFactor() {
        val context = skillContext.copy(strategy = "Balanced")
        val plain = LegacyParentScorer.score("Stamina +20", context)
        val blue = LegacyParentScorer.score("青 factor stamina", context)
        assertTrue(blue > plain)
    }

    @Test
    @DisplayName("WhiteFactor strategy strongly prefers white factor OCR text")
    fun whiteFactorPrefersWhiteText() {
        val context = skillContext.copy(strategy = "WhiteFactor")
        val statOnly = LegacyParentScorer.score("Speed +120", context)
        val white = LegacyParentScorer.score("White factor speed ★★", context)
        assertTrue(white > statOnly)
    }
}
