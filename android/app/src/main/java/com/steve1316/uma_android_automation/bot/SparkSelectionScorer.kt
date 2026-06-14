package com.steve1316.uma_android_automation.bot

import com.steve1316.uma_android_automation.types.Aptitude

/**
 * User-tunable spark inheritance priorities mirrored from React Native settings.
 *
 * @property strategy Spark selection mode (`Default`, `StatAndAptitude`, `SkillHints`, `Balanced`).
 * @property statPriorities Ordered stat names (e.g. Speed, Stamina) from training settings.
 * @property aptitudePriorities Ordered aptitude slot names to prefer when OCR matches.
 * @property preferSkillHints Whether skill-hint parent farming should still value hint sparks in stat mode.
 */
data class SparkSelectionContext(
    val strategy: String,
    val statPriorities: List<String>,
    val aptitudePriorities: List<String>,
    val preferSkillHints: Boolean,
)

/**
 * Scores inheritance spark OCR snippets so the bot can pick the best of three offered sparks.
 */
object SparkSelectionScorer {
    private val SKILL_KEYWORDS =
        listOf(
            "hint",
            "skill",
            "white",
            "unique",
            "inherit",
            "factor",
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

    /**
     * @param ocrText OCR snippet from a spark option card.
     * @param context Active spark selection preferences.
     * @return Higher is better. All options score 0.0 in `Default` mode.
     */
    fun score(ocrText: String, context: SparkSelectionContext): Double {
        if (context.strategy == "Default" || ocrText.isBlank()) return 0.0

        val lower = ocrText.lowercase()
        var score = 0.0

        val skillSignal = SKILL_KEYWORDS.any { lower.contains(it) }
        when (context.strategy) {
            "SkillHints" -> if (skillSignal) score += 200.0
            "Balanced" -> if (skillSignal) score += 80.0
            "StatAndAptitude" -> if (skillSignal && context.preferSkillHints) score += 45.0
        }

        for ((index, aptitude) in context.aptitudePriorities.withIndex()) {
            if (lower.contains(aptitude.lowercase())) {
                score +=
                    when (context.strategy) {
                        "StatAndAptitude" -> 130.0 - index * 15.0
                        "Balanced" -> 75.0 - index * 10.0
                        "SkillHints" -> 35.0
                        else -> 0.0
                    }
            }
        }

        for ((index, stat) in context.statPriorities.withIndex()) {
            if (lower.contains(stat.lowercase())) {
                score +=
                    when (context.strategy) {
                        "StatAndAptitude" -> 110.0 - index * 12.0
                        "Balanced" -> 65.0 - index * 8.0
                        "SkillHints" -> 30.0
                        else -> 0.0
                    }
            }
        }

        for (keyword in APTITUDE_KEYWORDS) {
            if (lower.contains(keyword) && context.aptitudePriorities.none { it.equals(keyword, ignoreCase = true) }) {
                score += when (context.strategy) {
                    "StatAndAptitude" -> 25.0
                    "Balanced" -> 15.0
                    else -> 5.0
                }
            }
        }

        for ((keyword, statName) in STAT_KEYWORDS) {
            if (lower.contains(keyword) && context.statPriorities.none { it.equals(statName, ignoreCase = true) }) {
                score += when (context.strategy) {
                    "StatAndAptitude" -> 20.0
                    "Balanced" -> 12.0
                    else -> 5.0
                }
            }
        }

        val percentMatch = Regex("(\\d+)\\s*%").find(lower)
        if (percentMatch != null) {
            val pct = percentMatch.groupValues[1].toIntOrNull() ?: 0
            score += pct * 0.4
        }

        return score
    }

    /**
     * Builds aptitude priority order from solver aptitudes and training distance bias.
     * Weaker aptitudes and distance-aligned slots are ranked earlier.
     */
    fun buildAptitudePriorities(aptitudesJson: String, preferredDistance: String): List<String> {
        val parsed = parseAptitudeMap(aptitudesJson)
        val distanceBias =
            when (preferredDistance.uppercase()) {
                "SPRINT", "SHORT" -> listOf("Sprint")
                "MILE" -> listOf("Mile")
                "MEDIUM" -> listOf("Medium")
                "LONG" -> listOf("Long")
                else -> emptyList()
            }

        val weakFirst =
            parsed.entries
                .sortedBy { aptitudeRankValue(it.value) }
                .map { it.key }

        return (distanceBias + weakFirst + listOf("Sprint", "Mile", "Medium", "Long", "Turf", "Dirt")).distinct()
    }

    private fun parseAptitudeMap(json: String): Map<String, String> {
        if (json.isBlank()) return emptyMap()
        return runCatching {
            val obj = org.json.JSONObject(json)
            listOf("Sprint", "Mile", "Medium", "Long", "Turf", "Dirt")
                .mapNotNull { key ->
                    val value = obj.optString(key, "")
                    if (value.isNotEmpty()) key to value else null
                }
                .toMap()
        }.getOrDefault(emptyMap())
    }

    private fun aptitudeRankValue(rank: String): Int =
        Aptitude.fromName(rank)?.ordinal ?: Aptitude.A.ordinal
}
