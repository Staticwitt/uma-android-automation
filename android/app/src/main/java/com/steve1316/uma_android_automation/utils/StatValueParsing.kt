package com.steve1316.uma_android_automation.utils

/**
 * Pure parsing of a trainee stat value out of an OCR snippet. Extracted so all stat-reading call sites share one behavior and so the digit-splitting handling is unit-testable
 * without an Android/OCR dependency.
 */
object StatValueParsing {
    /**
     * Rebuilds a stat value from OCR text by concatenating every digit in reading order.
     *
     * OCR frequently splits a value's digits across "words" (e.g. reads 1279 as "1 279"). Concatenating the digits recovers the real value, whereas taking the largest number
     * fragment would misread "1 279" as 279. The stat cell shows only the value, so any extra characters are noise and only the digits matter.
     *
     * A value above [cap] is rejected as an OCR misread (returns -1) rather than silently used; the caller retries on a fresh frame. An empty read, or a digit run too long to fit
     * in an Int, is likewise rejected.
     *
     * @param text Raw OCR text for a single stat cell.
     * @param cap The maximum plausible stat value; anything larger is treated as a misread.
     * @return The parsed value in 0..[cap], or -1 when there are no digits or the value exceeds [cap].
     */
    fun parseStatValue(text: String, cap: Int): Int {
        val digits = text.filter { it.isDigit() }
        if (digits.isEmpty()) return -1
        val value = digits.toIntOrNull() ?: return -1
        return if (value in 0..cap) value else -1
    }
}
