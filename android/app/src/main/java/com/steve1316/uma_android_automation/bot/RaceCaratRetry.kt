package com.steve1316.uma_android_automation.bot

/**
 * Pure helpers for carat-funded race retry budgeting.
 */
object RaceCaratRetry {
    fun canSpend(
        enabled: Boolean,
        maxPerRun: Int,
        used: Int,
    ): Boolean = enabled && (maxPerRun <= 0 || used < maxPerRun)

    fun formatBudgetLabel(used: Int, maxPerRun: Int): String =
        if (maxPerRun > 0) "$used/$maxPerRun" else "$used/∞"
}
