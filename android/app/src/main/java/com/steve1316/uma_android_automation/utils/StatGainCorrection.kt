package com.steve1316.uma_android_automation.utils

/**
 * Pure correction of an OCR-read single-facility stat gain. Extracted so the "implausibly large read" heuristic is scenario-aware and unit-testable without an Android/OCR dependency.
 */
object StatGainCorrection {
    /**
     * The largest single-facility stat gain that is plausible for a scenario. A read above this is treated as a false extra digit (see [correctStatGainMisread]).
     *
     * The old hard-coded ceiling was 100, which modern power creep exceeds: heavy rainbow stacking pushes ordinary trainings past 100, and Unity Cup spirit bursts push a single
     * facility far higher. These ceilings sit safely above realistic maxima while still catching a spurious third digit (e.g. a 45 read as 452). They are deliberately generous; if a
     * genuine gain is ever seen clipped, raise the relevant ceiling.
     *
     * @param scenario The active scenario name.
     * @return The maximum plausible single-facility stat gain for that scenario.
     */
    fun maxPlausibleSingleFacilityGain(scenario: String): Int =
        when (scenario) {
            // Spirit bursts make a single Unity Cup facility gain far larger than anywhere else.
            "Unity Cup" -> 300
            else -> 200
        }

    /**
     * Corrects a stat-gain read that is implausibly large for the scenario. The per-training gain cannot realistically exceed [maxPlausible], so a larger value indicates a false extra
     * (third) digit from OCR; dropping the trailing digit (integer-dividing by 10) recovers the real two-digit value. A value at or below the ceiling is returned unchanged.
     *
     * @param value The raw stat gain read from OCR.
     * @param maxPlausible The scenario's maximum plausible single-facility gain (from [maxPlausibleSingleFacilityGain]).
     * @return The corrected stat gain.
     */
    fun correctStatGainMisread(value: Int, maxPlausible: Int): Int = if (value > maxPlausible) value / 10 else value
}
