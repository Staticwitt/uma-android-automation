package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SQLiteSettingsManager
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.automation_library.utils.TextUtils
import com.steve1316.uma_android_automation.MainActivity

/**
 * Game-data skill matching for inheritance spark and legacy parent OCR.
 * Uses the bundled skills SQLite table instead of keyword heuristics alone.
 */
object FactorSkillMatcher {
    private const val TAG = "[FACTOR_SKILL]"
    private const val TABLE_SKILLS = "skills"
    private const val SIMILARITY_THRESHOLD = 0.72

    data class SkillEntry(val name: String, val inherited: Boolean, val rarity: Int)

    @Volatile private var cachedSkills: List<SkillEntry>? = null

    fun isEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableParentFarmingGameDataFactorOcr", true)

    fun resetCache() {
        cachedSkills = null
    }

    fun loadSkills(context: android.content.Context? = null): List<SkillEntry> {
        cachedSkills?.let { return it }
        val ctx = context ?: return emptyList()
        val settingsManager = SQLiteSettingsManager(ctx)
        if (!settingsManager.isAvailable()) {
            settingsManager.close()
            return emptyList()
        }
        val result = mutableListOf<SkillEntry>()
        try {
            val cursor = settingsManager.readableDatabase.rawQuery("SELECT name_en, inherited, rarity FROM $TABLE_SKILLS", null)
            cursor.use {
                if (it.moveToFirst()) {
                    do {
                        val name = it.getString(0)?.trim().orEmpty()
                        if (name.isEmpty()) continue
                        val inherited = it.getInt(1) == 1
                        val rarity = it.getInt(2)
                        result.add(SkillEntry(name, inherited, rarity))
                    } while (it.moveToNext())
                }
            }
        } catch (t: Throwable) {
            MessageLog.w(TAG, "Failed to load skills for factor OCR: ${t.message}")
        } finally {
            settingsManager.close()
        }
        cachedSkills = result
        return result
    }

    data class Match(val skillName: String, val score: Double, val inherited: Boolean, val rarity: Int)

    /** Returns fuzzy skill matches found inside [ocrText], best first. */
    fun matchInText(context: android.content.Context?, ocrText: String, limit: Int = 4): List<Match> {
        if (!isEnabled() || ocrText.isBlank()) return emptyList()
        val skills = loadSkills(context)
        if (skills.isEmpty()) return emptyList()

        val lower = ocrText.lowercase()
        val matches = mutableListOf<Match>()
        for (skill in skills) {
            val needle = skill.name.lowercase()
            val score =
                when {
                    lower.contains(needle) -> 1.0
                    needle.length >= 4 && lower.windowed(needle.length, partialWindows = true).any { it.equals(needle, ignoreCase = true) } -> 0.95
                    else -> {
                        val fuzzy = TextUtils.matchStringInList(ocrText, listOf(skill.name), SIMILARITY_THRESHOLD)
                        if (fuzzy != null) 0.85 else 0.0
                    }
                }
            if (score > 0) matches.add(Match(skill.name, score, skill.inherited, skill.rarity))
        }
        return matches.sortedByDescending { it.score }.take(limit)
    }

    /**
     * Bonus score layered on keyword heuristics for spark / legacy OCR.
     */
    fun scoreBonus(context: android.content.Context?, ocrText: String, strategy: String, preferSkillHints: Boolean): Double {
        val matches = matchInText(context, ocrText)
        if (matches.isEmpty()) return 0.0

        var bonus = 0.0
        for (match in matches) {
            bonus +=
                when (strategy) {
                    "WhiteFactor" ->
                        when {
                            match.inherited -> 180.0 + match.rarity * 12.0
                            else -> 90.0 + match.rarity * 6.0
                        }
                    "SkillHints" ->
                        if (match.inherited || match.skillName.contains("hint", ignoreCase = true)) {
                            160.0 + match.rarity * 10.0
                        } else {
                            40.0
                        }
                    "Balanced" -> 70.0 + match.rarity * 5.0
                    "StatAndAptitude" ->
                        if (preferSkillHints && match.inherited) 55.0 else 25.0
                    else -> 15.0
                }
            bonus += match.score * 25.0
        }
        return bonus
    }

    fun formatMatches(matches: List<Match>): String =
        matches.joinToString(" · ") { skill ->
            val tag = if (skill.inherited) "inherit" else "skill"
            "${skill.skillName} ($tag)"
        }
}
