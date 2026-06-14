package com.steve1316.uma_android_automation.bot

/**
 * Records inheritance spark OCR results and the bot's picks for parent-run summaries.
 */
object SparkPickHistory {
    data class Record(
        val pickIndex: Int,
        val optionTexts: List<String>,
        val strategy: String,
    )

    private val picks = mutableListOf<Record>()

    /** Clears spark history for a fresh bot run. */
    fun reset() {
        picks.clear()
    }

    /**
     * @param pickIndex Zero-based spark slot tapped.
     * @param optionTexts OCR text for each spark option.
     * @param strategy Active spark selection strategy name.
     */
    fun record(pickIndex: Int, optionTexts: List<String>, strategy: String) {
        picks.add(Record(pickIndex, optionTexts.toList(), strategy))
    }

    /** Snapshot of spark picks for the current run. */
    fun snapshot(): List<Record> = picks.toList()
}
