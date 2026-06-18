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
            "★",
        )

    private val APTITUDE_KEYWORDS = listOf("sprint", "mile", "medium", "long", "turf", "dirt")

    private val STAT_KEYWORDS =
        mapOf(
            "speed" to "Speed",
            "spd" to "Speed",
            "stamina" to "Stamina",
            "sta" to "Stamina",
            "power" to "Power",
            "pow" to "Power",
            "guts" to "Guts",
            "wit" to "Wit",
            "wisdom" to "Wit",
        )

    private val APTITUDE_GRADE_PATTERN = Regex("(?i)\\b([sabcdefg])\\b")
    private val STAT_VALUE_PATTERN = Regex("(?i)(speed|stamina|power|guts|wit|wisdom|spd|sta|pow)\\D{0,8}(\\d{2,4})")

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
    fun score(ocrText: String, context: Context, gameContext: android.content.Context? = null): Double {
        if (context.strategy == "Default" || ocrText.isBlank()) return 0.0

        val lower = ocrText.lowercase()
        var total = 0.0

        val skillSignal = SKILL_KEYWORDS.any { lower.contains(it) }
        val blueFactorSignal = lower.contains("blue") || lower.contains("青")
        val whiteFactorSignal = lower.contains("white") || lower.contains("白")
        val starCount = ocrText.count { it == '★' || it == '*' }
        when (context.strategy) {
            "WhiteFactor" -> {
                if (whiteFactorSignal) total += 240.0
                if (blueFactorSignal) total += 200.0
                if (skillSignal) total += 100.0
                total += starCount * 40.0
            }
            "SkillHints" -> {
                if (skillSignal) total += 200.0
                if (blueFactorSignal) total += 40.0
            }
            "Balanced" -> {
                if (skillSignal) total += 80.0
                if (blueFactorSignal) total += 25.0
            }
            "StatAndAptitude" -> {
                if (skillSignal && context.preferSkillHints) total += 45.0
                if (blueFactorSignal) total += 15.0
            }
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

        total += scoreParsedStatValues(lower, context)
        total += scoreParsedAptitudeGrades(lower, context)
        total += FactorSkillMatcher.scoreBonus(gameContext, ocrText, context.strategy, context.preferSkillHints)

        return total
    }

    private fun scoreParsedStatValues(lower: String, context: Context): Double {
        var bonus = 0.0
        for (match in STAT_VALUE_PATTERN.findAll(lower)) {
            val keyword = match.groupValues[1]
            val value = match.groupValues[2].toIntOrNull() ?: continue
            val statName = STAT_KEYWORDS[keyword.lowercase()] ?: continue
            val priorityIndex = context.statPriorities.indexOf(statName)
            if (priorityIndex < 0) continue
            val weight =
                when (context.strategy) {
                    "StatAndAptitude" -> 0.35
                    "Balanced" -> 0.2
                    else -> 0.08
                }
            bonus += value * weight * (1.0 - priorityIndex * 0.12)
        }
        return bonus
    }

    private fun scoreParsedAptitudeGrades(lower: String, context: Context): Double {
        val gradeValues = mapOf("s" to 7, "a" to 6, "b" to 5, "c" to 4, "d" to 3, "e" to 2, "f" to 1, "g" to 0)
        var bonus = 0.0
        for (match in APTITUDE_GRADE_PATTERN.findAll(lower)) {
            val grade = match.groupValues[1].lowercase()
            val value = gradeValues[grade] ?: continue
            bonus +=
                when (context.strategy) {
                    "StatAndAptitude" -> value * 8.0
                    "Balanced" -> value * 5.0
                    else -> value * 2.0
                }
        }
        return bonus
    }
}
