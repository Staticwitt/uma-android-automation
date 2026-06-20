package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.types.StatName
import org.json.JSONObject

/**
 * Cached support-card-name -> [StatName] lookup, sourced from the `supportCardTypesData` setting.
 *
 * That setting is populated from the bundled `src/data/supportCardTypes.json` by the RN bootstrap
 * (`useBootstrap.tsx`'s `populateSolverData`), mirroring how `racesData`/`epithetsData` are plumbed
 * to the solver. Cards with no stat-affecting type (e.g. a Friend-type support) are absent from the
 * map rather than mapped to a placeholder.
 */
object SupportCardTypeRegistry {
    private const val TAG = "[SUPPORT_CARD_TYPES]"

    @Volatile private var cached: Map<String, StatName>? = null

    /** Stat category for [cardName], or null when the card is unknown or has no stat type. */
    fun typeOf(cardName: String): StatName? = load()[cardName]

    private fun load(): Map<String, StatName> {
        cached?.let { return it }
        val json = SettingsHelper.getStringSetting("racing", "supportCardTypesData")
        if (json.isEmpty()) return emptyMap()
        return runCatching { parse(json) }
            .onFailure { MessageLog.e(TAG, "Failed to parse supportCardTypesData: ${it.message}") }
            .getOrNull()
            ?.also { cached = it }
            ?: emptyMap()
    }

    private fun parse(json: String): Map<String, StatName> {
        val obj = JSONObject(json)
        val out = mutableMapOf<String, StatName>()
        for (cardName in obj.keys()) {
            val type = obj.getJSONObject(cardName).optString("type", "")
            StatName.fromName(type)?.let { out[cardName] = it }
        }
        return out
    }
}
