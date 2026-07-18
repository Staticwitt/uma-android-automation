package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.SettingsHelper
import org.json.JSONObject

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

    /** Distinct stat names backing [STAT_KEYWORDS], used to score each stat's keyword match once even though it may have multiple keyword aliases. */
    private val STAT_NAMES = STAT_KEYWORDS.values.distinct()

    /** Anchored to a distance/surface keyword so a bare letter (e.g. the article "a") in unrelated OCR text isn't mistaken for an aptitude grade. */
    private val APTITUDE_GRADE_PATTERN = Regex("(?i)(sprint|mile|medium|long|turf|dirt)\\D{0,8}\\b([sabcdefg])\\b")
    private val STAT_VALUE_PATTERN = Regex("(?i)(speed|stamina|power|guts|wit|wisdom|spd|sta|pow)\\D{0,8}(\\d{2,4})")

    /**
     * Tunable weights for the "StatAndAptitude" strategy, user-editable in Parent Farming settings.
     * Defaults match the values this strategy used before it became tunable.
     *
     * @property skillHintBonus Bonus when OCR text has a skill-hint signal and the user enabled "prioritize skill hints".
     * @property blueFactorBonus Bonus when OCR text signals a blue (stat) factor.
     * @property statPriorityBase Bonus for a stat-priority keyword match at priority index 0.
     * @property statPriorityDecay Subtracted from [statPriorityBase] per priority index step (lower-priority stats score less).
     * @property aptitudeKeywordBonus Bonus per distance/surface aptitude keyword found in OCR text.
     * @property statValueWeight Multiplier applied to parsed numeric stat values (e.g. "Speed +120") weighted by priority.
     * @property aptitudeGradeWeight Multiplier applied per aptitude-grade point (S=7..G=0) parsed from OCR text.
     */
    data class StatAptitudeWeights(
        val skillHintBonus: Double = 45.0,
        val blueFactorBonus: Double = 15.0,
        val statPriorityBase: Double = 120.0,
        val statPriorityDecay: Double = 12.0,
        val aptitudeKeywordBonus: Double = 90.0,
        val statValueWeight: Double = 0.35,
        val aptitudeGradeWeight: Double = 8.0,
    )

    /**
     * Tunable weights for the "WhiteFactor" strategy, user-editable in Parent Farming settings. Defaults match the values this strategy used before it became tunable.
     * WhiteFactor doesn't score stat-priority keyword matches at all (that's [SkillHintsWeights]/[BalancedWeights]/[StatAptitudeWeights] territory) - it's deliberately only about factor/skill signal quality.
     *
     * @property whiteFactorBonus Bonus when OCR text signals a white factor.
     * @property blueFactorBonus Bonus when OCR text signals a blue (stat) factor.
     * @property skillHintBonus Bonus when OCR text has a skill-hint signal.
     * @property starBonus Bonus per star (★/*) glyph detected in OCR text.
     * @property aptitudeKeywordBonus Bonus per distance/surface aptitude keyword found in OCR text.
     * @property statValueWeight Multiplier applied to parsed numeric stat values, weighted by priority.
     * @property aptitudeGradeWeight Multiplier applied per aptitude-grade point (S=7..G=0) parsed from OCR text.
     */
    data class WhiteFactorWeights(
        val whiteFactorBonus: Double = 240.0,
        val blueFactorBonus: Double = 200.0,
        val skillHintBonus: Double = 100.0,
        val starBonus: Double = 40.0,
        val aptitudeKeywordBonus: Double = 20.0,
        val statValueWeight: Double = 0.08,
        val aptitudeGradeWeight: Double = 2.0,
    )

    /**
     * Tunable weights for the "SkillHints" strategy, user-editable in Parent Farming settings. Defaults match the values this strategy used before it became tunable.
     *
     * @property skillHintBonus Bonus when OCR text has a skill-hint signal.
     * @property blueFactorBonus Bonus when OCR text signals a blue (stat) factor.
     * @property statPriorityBonus Flat bonus for a stat-priority keyword match, regardless of priority index.
     * @property aptitudeKeywordBonus Bonus per distance/surface aptitude keyword found in OCR text.
     * @property statValueWeight Multiplier applied to parsed numeric stat values, weighted by priority.
     * @property aptitudeGradeWeight Multiplier applied per aptitude-grade point (S=7..G=0) parsed from OCR text.
     */
    data class SkillHintsWeights(
        val skillHintBonus: Double = 200.0,
        val blueFactorBonus: Double = 40.0,
        val statPriorityBonus: Double = 30.0,
        val aptitudeKeywordBonus: Double = 20.0,
        val statValueWeight: Double = 0.08,
        val aptitudeGradeWeight: Double = 2.0,
    )

    /**
     * Tunable weights for the "Balanced" strategy, user-editable in Parent Farming settings. Defaults match the values this strategy used before it became tunable.
     *
     * @property skillHintBonus Bonus when OCR text has a skill-hint signal.
     * @property blueFactorBonus Bonus when OCR text signals a blue (stat) factor.
     * @property statPriorityBase Bonus for a stat-priority keyword match at priority index 0.
     * @property statPriorityDecay Subtracted from [statPriorityBase] per priority index step.
     * @property aptitudeKeywordBonus Bonus per distance/surface aptitude keyword found in OCR text.
     * @property statValueWeight Multiplier applied to parsed numeric stat values, weighted by priority.
     * @property aptitudeGradeWeight Multiplier applied per aptitude-grade point (S=7..G=0) parsed from OCR text.
     */
    data class BalancedWeights(
        val skillHintBonus: Double = 80.0,
        val blueFactorBonus: Double = 25.0,
        val statPriorityBase: Double = 70.0,
        val statPriorityDecay: Double = 8.0,
        val aptitudeKeywordBonus: Double = 50.0,
        val statValueWeight: Double = 0.2,
        val aptitudeGradeWeight: Double = 5.0,
    )

    data class Context(
        val strategy: String,
        val statPriorities: List<String>,
        val preferSkillHints: Boolean,
        val statAptitudeWeights: StatAptitudeWeights = StatAptitudeWeights(),
        val whiteFactorWeights: WhiteFactorWeights = WhiteFactorWeights(),
        val skillHintsWeights: SkillHintsWeights = SkillHintsWeights(),
        val balancedWeights: BalancedWeights = BalancedWeights(),
    )

    fun contextFromSettings(): Context {
        val strategy = SettingsHelper.getStringSetting("racing", "legacyParentSelectionStrategy").ifEmpty { "Default" }
        val statPriorities = SettingsHelper.getStringArraySetting("training", "statPrioritization").filter { it.isNotBlank() }
        val preferSkillHints = SettingsHelper.getBooleanSetting("training", "enablePrioritizeSkillHints", false)
        return Context(
            strategy = strategy,
            statPriorities = statPriorities,
            preferSkillHints = preferSkillHints,
            statAptitudeWeights = readStatAptitudeWeights(),
            whiteFactorWeights = readWhiteFactorWeights(),
            skillHintsWeights = readSkillHintsWeights(),
            balancedWeights = readBalancedWeights(),
        )
    }

    /** Parses the user's saved "StatAndAptitude" weight overrides. Falls back to [StatAptitudeWeights] defaults when empty or unparseable. */
    private fun readStatAptitudeWeights(): StatAptitudeWeights {
        val json = SettingsHelper.getStringSetting("racing", "legacyParentStatAptitudeWeights")
        if (json.isEmpty()) return StatAptitudeWeights()
        return runCatching {
            val obj = JSONObject(json)
            val defaults = StatAptitudeWeights()
            StatAptitudeWeights(
                skillHintBonus = obj.optDouble("skillHintBonus", defaults.skillHintBonus),
                blueFactorBonus = obj.optDouble("blueFactorBonus", defaults.blueFactorBonus),
                statPriorityBase = obj.optDouble("statPriorityBase", defaults.statPriorityBase),
                statPriorityDecay = obj.optDouble("statPriorityDecay", defaults.statPriorityDecay),
                aptitudeKeywordBonus = obj.optDouble("aptitudeKeywordBonus", defaults.aptitudeKeywordBonus),
                statValueWeight = obj.optDouble("statValueWeight", defaults.statValueWeight),
                aptitudeGradeWeight = obj.optDouble("aptitudeGradeWeight", defaults.aptitudeGradeWeight),
            )
        }.getOrElse { StatAptitudeWeights() }
    }

    /** Parses the user's saved "WhiteFactor" weight overrides. Falls back to [WhiteFactorWeights] defaults when empty or unparseable. */
    private fun readWhiteFactorWeights(): WhiteFactorWeights {
        val json = SettingsHelper.getStringSetting("racing", "legacyParentWhiteFactorWeights")
        if (json.isEmpty()) return WhiteFactorWeights()
        return runCatching {
            val obj = JSONObject(json)
            val defaults = WhiteFactorWeights()
            WhiteFactorWeights(
                whiteFactorBonus = obj.optDouble("whiteFactorBonus", defaults.whiteFactorBonus),
                blueFactorBonus = obj.optDouble("blueFactorBonus", defaults.blueFactorBonus),
                skillHintBonus = obj.optDouble("skillHintBonus", defaults.skillHintBonus),
                starBonus = obj.optDouble("starBonus", defaults.starBonus),
                aptitudeKeywordBonus = obj.optDouble("aptitudeKeywordBonus", defaults.aptitudeKeywordBonus),
                statValueWeight = obj.optDouble("statValueWeight", defaults.statValueWeight),
                aptitudeGradeWeight = obj.optDouble("aptitudeGradeWeight", defaults.aptitudeGradeWeight),
            )
        }.getOrElse { WhiteFactorWeights() }
    }

    /** Parses the user's saved "SkillHints" weight overrides. Falls back to [SkillHintsWeights] defaults when empty or unparseable. */
    private fun readSkillHintsWeights(): SkillHintsWeights {
        val json = SettingsHelper.getStringSetting("racing", "legacyParentSkillHintsWeights")
        if (json.isEmpty()) return SkillHintsWeights()
        return runCatching {
            val obj = JSONObject(json)
            val defaults = SkillHintsWeights()
            SkillHintsWeights(
                skillHintBonus = obj.optDouble("skillHintBonus", defaults.skillHintBonus),
                blueFactorBonus = obj.optDouble("blueFactorBonus", defaults.blueFactorBonus),
                statPriorityBonus = obj.optDouble("statPriorityBonus", defaults.statPriorityBonus),
                aptitudeKeywordBonus = obj.optDouble("aptitudeKeywordBonus", defaults.aptitudeKeywordBonus),
                statValueWeight = obj.optDouble("statValueWeight", defaults.statValueWeight),
                aptitudeGradeWeight = obj.optDouble("aptitudeGradeWeight", defaults.aptitudeGradeWeight),
            )
        }.getOrElse { SkillHintsWeights() }
    }

    /** Parses the user's saved "Balanced" weight overrides. Falls back to [BalancedWeights] defaults when empty or unparseable. */
    private fun readBalancedWeights(): BalancedWeights {
        val json = SettingsHelper.getStringSetting("racing", "legacyParentBalancedWeights")
        if (json.isEmpty()) return BalancedWeights()
        return runCatching {
            val obj = JSONObject(json)
            val defaults = BalancedWeights()
            BalancedWeights(
                skillHintBonus = obj.optDouble("skillHintBonus", defaults.skillHintBonus),
                blueFactorBonus = obj.optDouble("blueFactorBonus", defaults.blueFactorBonus),
                statPriorityBase = obj.optDouble("statPriorityBase", defaults.statPriorityBase),
                statPriorityDecay = obj.optDouble("statPriorityDecay", defaults.statPriorityDecay),
                aptitudeKeywordBonus = obj.optDouble("aptitudeKeywordBonus", defaults.aptitudeKeywordBonus),
                statValueWeight = obj.optDouble("statValueWeight", defaults.statValueWeight),
                aptitudeGradeWeight = obj.optDouble("aptitudeGradeWeight", defaults.aptitudeGradeWeight),
            )
        }.getOrElse { BalancedWeights() }
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
                if (whiteFactorSignal) total += context.whiteFactorWeights.whiteFactorBonus
                if (blueFactorSignal) total += context.whiteFactorWeights.blueFactorBonus
                if (skillSignal) total += context.whiteFactorWeights.skillHintBonus
                total += starCount * context.whiteFactorWeights.starBonus
            }
            "SkillHints" -> {
                if (skillSignal) total += context.skillHintsWeights.skillHintBonus
                if (blueFactorSignal) total += context.skillHintsWeights.blueFactorBonus
            }
            "Balanced" -> {
                if (skillSignal) total += context.balancedWeights.skillHintBonus
                if (blueFactorSignal) total += context.balancedWeights.blueFactorBonus
            }
            "StatAndAptitude" -> {
                if (skillSignal && context.preferSkillHints) total += context.statAptitudeWeights.skillHintBonus
                if (blueFactorSignal) total += context.statAptitudeWeights.blueFactorBonus
            }
        }

        for ((index, stat) in context.statPriorities.withIndex()) {
            if (lower.contains(stat.lowercase())) {
                total +=
                    when (context.strategy) {
                        "StatAndAptitude" -> context.statAptitudeWeights.statPriorityBase - index * context.statAptitudeWeights.statPriorityDecay
                        "Balanced" -> context.balancedWeights.statPriorityBase - index * context.balancedWeights.statPriorityDecay
                        "SkillHints" -> context.skillHintsWeights.statPriorityBonus
                        // WhiteFactor deliberately doesn't score stat-priority keywords - see WhiteFactorWeights KDoc.
                        else -> 0.0
                    }
            }
        }

        for (keyword in APTITUDE_KEYWORDS) {
            if (lower.contains(keyword)) {
                total +=
                    when (context.strategy) {
                        "StatAndAptitude" -> context.statAptitudeWeights.aptitudeKeywordBonus
                        "Balanced" -> context.balancedWeights.aptitudeKeywordBonus
                        "WhiteFactor" -> context.whiteFactorWeights.aptitudeKeywordBonus
                        "SkillHints" -> context.skillHintsWeights.aptitudeKeywordBonus
                        else -> 20.0
                    }
            }
        }

        for (statName in STAT_NAMES) {
            // Score each stat once even if it has multiple keyword aliases (e.g. "power" and "pow" both appear in matching OCR text).
            val keywordMatched = STAT_KEYWORDS.any { (keyword, name) -> name == statName && lower.contains(keyword) }
            if (keywordMatched) {
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
                    "StatAndAptitude" -> context.statAptitudeWeights.statValueWeight
                    "Balanced" -> context.balancedWeights.statValueWeight
                    "WhiteFactor" -> context.whiteFactorWeights.statValueWeight
                    "SkillHints" -> context.skillHintsWeights.statValueWeight
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
            val grade = match.groupValues[2].lowercase()
            val value = gradeValues[grade] ?: continue
            bonus +=
                when (context.strategy) {
                    "StatAndAptitude" -> value * context.statAptitudeWeights.aptitudeGradeWeight
                    "Balanced" -> value * context.balancedWeights.aptitudeGradeWeight
                    "WhiteFactor" -> value * context.whiteFactorWeights.aptitudeGradeWeight
                    "SkillHints" -> value * context.skillHintsWeights.aptitudeGradeWeight
                    else -> value * 2.0
                }
        }
        return bonus
    }
}
