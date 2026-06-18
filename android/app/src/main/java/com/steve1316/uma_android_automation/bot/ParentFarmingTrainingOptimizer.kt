package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.types.Aptitude
import com.steve1316.uma_android_automation.types.StatName

/**
 * Reorders training stat priorities for parent-farming runs based on weak aptitudes and bundle goals.
 */
object ParentFarmingTrainingOptimizer {
    fun isEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMode", false) &&
            SettingsHelper.getBooleanSetting("racing", "enableParentFarmingTrainingOptimizer", true)

    /**
     * Returns stat names weak-first, merged with configured priorities.
     */
    fun optimizedStatPriorities(base: List<StatName>): List<StatName> {
        if (!isEnabled()) return base
        val aptitudesJson = SettingsHelper.getStringSetting("racing", "smartRaceSolverAptitudes")
        val preferredDistance = SettingsHelper.getStringSetting("training", "preferredDistanceOverride").ifEmpty { "Auto" }
        val aptitudeSlots = SparkSelectionScorer.buildAptitudePriorities(aptitudesJson, preferredDistance)

        val weakStatBoosts = mutableListOf<StatName>()
        for (slot in aptitudeSlots) {
            when (slot.lowercase()) {
                "dirt" -> weakStatBoosts.add(StatName.POWER)
                "sprint", "mile" -> weakStatBoosts.add(StatName.SPEED)
                "medium", "long" -> weakStatBoosts.add(StatName.STAMINA)
            }
        }

        val merged = (weakStatBoosts + base + StatName.entries).distinct()
        return merged
    }

    fun weakAptitudeSummary(aptitudesJson: String): String {
        val parsed = parseAptitudeMap(aptitudesJson)
        if (parsed.isEmpty()) return ""
        val weak = parsed.entries.sortedBy { aptitudeRankValue(it.value) }.take(2).map { it.key }
        return weak.joinToString(", ")
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

    private fun aptitudeRankValue(rank: String): Int = Aptitude.fromName(rank)?.ordinal ?: Aptitude.A.ordinal
}
