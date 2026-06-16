package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.SettingsHelper

/**
 * Scores legacy parent OCR snippets for factor-aware pair selection at career selection.
 */
object LegacyParentScorer {
    private val SKILL_KEYWORDS =
        listOf(
            "hint",
            "skill",
            "white",
            "unique",
            "inherit",
            "factor",
            "golden",
            "gold",
            "spark",
        )

    private val APTITUDE_KEYWORDS = listOf("sprint", "mile", "medium", "long", "turf", "dirt")

    private val STAT_KEYWORDS =
        mapOf(
            "speed" to "Speed",
            "stamina" to "Stamina",
            "power" to "Power",
            "guts" to "Guts",
            "wit" to "Wit",
            "wisdom" to "Wit",
        )

    data class Context(
        val strategy: String,
        val statPriorities: List<String>,
        val preferSkillHints: Boolean,
    )

    fun contextFromSettings(): Context {
        val strategy = SettingsHelper.getStringSetting("racing", "legacyParentSelectionStrategy").ifEmpty { "Default" }
        val statPriorities = SettingsHelper.getStringArraySetting("training", "statPrioritization").filter { it.isNotBlank() }
        val preferSkillHints = SettingsHelper.getBooleanSetting("training", "enablePrioritizeSkillHints", false)
        return Context(strategy = strategy, statPriorities = statPriorities, preferSkillHints = preferSkillHints)
    }

    fun isFactorSelectionEnabled(): Boolean = contextFromSettings().strategy != "Default"

    /** Higher is better. Returns 0 when strategy is Default. */
    fun score(ocrText: String, context: Context): Double {
        if (context.strategy == "Default" || ocrText.isBlank()) return 0.0

        val lower = ocrText.lowercase()
        var total = 0.0

        val skillSignal = SKILL_KEYWORDS.any { lower.contains(it) }
        when (context.strategy) {
            "SkillHints" -> if (skillSignal) total += 200.0
            "Balanced" -> if (skillSignal) total += 80.0
            "StatAndAptitude" -> if (skillSignal && context.preferSkillHints) total += 45.0
        }

        for ((index, stat) in context.statPriorities.withIndex()) {
            if (lower.contains(stat.lowercase())) {
                total +=
                    when (context.strategy) {
                        "StatAndAptitude" -> 120.0 - index * 12.0
                        "Balanced" -> 70.0 - index * 8.0
                        "SkillHints" -> 30.0
                        else -> 0.0
                    }
            }
        }

        for (keyword in APTITUDE_KEYWORDS) {
            if (lower.contains(keyword)) {
                total +=
                    when (context.strategy) {
                        "StatAndAptitude" -> 90.0
                        "Balanced" -> 50.0
                        else -> 20.0
                    }
            }
        }

        for ((keyword, statName) in STAT_KEYWORDS) {
            if (lower.contains(keyword)) {
                val priorityIndex = context.statPriorities.indexOf(statName)
                if (priorityIndex >= 0) {
                    total += 40.0 - priorityIndex * 5.0
                }
            }
        }

        return total
    }
}
