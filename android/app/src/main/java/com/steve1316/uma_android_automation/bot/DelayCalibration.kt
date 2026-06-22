package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.MainActivity
import org.json.JSONObject

/**
 * Tracks how long the bot actually spends in [Game.waitForLoading] during a run and resolves
 * user-configurable per-action delay overrides.
 *
 * [SettingsHelper] only exposes flat scalar reads, so per-action overrides are stored as a single
 * JSON-string map (`general/delayOverrides`), the same convention `racing/smartRaceSolverWeights`
 * uses for its multiplier map.
 */
object DelayCalibration {
    private val TAG: String = "[${MainActivity.loggerTag}]DelayCalibration"

    /** The action key [Game.tap] checks for its post-tap settle delay, overriding the hardcoded 0.20s default. */
    const val TAP_FOLLOW_UP_KEY = "tapFollowUpDelay"

    @Volatile private var loadingWaitCount: Int = 0
    @Volatile private var totalLoadingWaitMs: Long = 0L
    @Volatile private var maxLoadingWaitMs: Long = 0L

    @Volatile private var cachedOverrides: Map<String, Double>? = null

    /** Clears accumulated telemetry and the cached override map. Call once at the start of a run. */
    fun reset() {
        loadingWaitCount = 0
        totalLoadingWaitMs = 0L
        maxLoadingWaitMs = 0L
        cachedOverrides = null
    }

    /** Records one [Game.waitForLoading] call's wall-clock duration for end-of-run calibration telemetry. */
    fun recordLoadingWait(durationMs: Long) {
        loadingWaitCount++
        totalLoadingWaitMs += durationMs
        if (durationMs > maxLoadingWaitMs) maxLoadingWaitMs = durationMs
    }

    /**
     * Resolves the effective delay in seconds for [actionKey], preferring a user override from the
     * `general/delayOverrides` JSON map and falling back to [defaultSeconds] when no override exists
     * for that key.
     */
    fun resolveDelay(actionKey: String, defaultSeconds: Double): Double {
        return overrides()[actionKey] ?: defaultSeconds
    }

    private fun overrides(): Map<String, Double> {
        cachedOverrides?.let { return it }

        val raw = SettingsHelper.getStringSetting("general", "delayOverrides", "{}")
        val parsed =
            try {
                val json = JSONObject(raw.ifBlank { "{}" })
                val map = mutableMapOf<String, Double>()
                json.keys().forEach { key -> map[key] = json.getDouble(key) }
                map
            } catch (e: Exception) {
                MessageLog.w(TAG, "[WARN] Failed to parse the delayOverrides setting, ignoring per-action overrides: ${e.message}")
                emptyMap()
            }

        cachedOverrides = parsed
        return parsed
    }

    /**
     * Builds a human-readable calibration summary comparing the measured average loading-wait
     * duration against [configuredWaitDelaySeconds], plus a tuning suggestion. Returns null when no
     * loading waits were recorded this run.
     *
     * @param configuredWaitDelaySeconds The currently configured `general/waitDelay` setting.
     * @return The summary line, or null if there's nothing to report.
     */
    fun buildTelemetrySummary(configuredWaitDelaySeconds: Double): String? {
        if (loadingWaitCount == 0) return null

        val avgMs = totalLoadingWaitMs / loadingWaitCount
        val configuredMs = (configuredWaitDelaySeconds * 1000).toLong()
        val suggestion =
            when {
                configuredMs <= 0L -> "Wait Delay is currently 0 -- calibration suggestions are unavailable."
                avgMs < configuredMs * 3 / 10 ->
                    "Loading consistently finished well under your configured Wait Delay (avg ${avgMs}ms vs ${configuredMs}ms). You may be able to lower General > Wait Delay for faster runs."
                avgMs > configuredMs * 9 / 10 ->
                    "Loading often took close to or longer than your configured Wait Delay (avg ${avgMs}ms vs ${configuredMs}ms). Consider raising General > Wait Delay to reduce extra polling."
                else -> "Wait Delay looks well-calibrated for this run (avg loading wait ${avgMs}ms vs ${configuredMs}ms configured)."
            }

        return "Loading waits: $loadingWaitCount, avg ${avgMs}ms, max ${maxLoadingWaitMs}ms, total ${totalLoadingWaitMs}ms. $suggestion"
    }
}
