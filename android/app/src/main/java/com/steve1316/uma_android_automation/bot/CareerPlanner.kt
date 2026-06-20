package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.types.StatName

/**
 * Opt-in "Career Planner" mode: infers a target stat build from the equipped support deck's
 * stat-type composition and applies it as a soft multiplicative bias on top of [Training]'s
 * existing per-distance/per-phase stat targets.
 *
 * This intentionally only nudges the `statTargets` map that already feeds the shared scoring
 * module's `ratioMultiplier` - it does not touch stat prioritization order, blacklist, or
 * training selection directly, so rainbow training, skill hints, and failure-chance logic in
 * `Training.recommendTraining` are unaffected. Off by default; existing Trackblazer/Smart Race
 * Solver behavior is unchanged unless a user opts in.
 */
object CareerPlanner {
    private const val TAG = "[CAREER_PLANNER]"

    /** Bias multiplier at zero deck representation for a stat (mild deprioritization, never fully starved). */
    private const val BIAS_FLOOR = 0.7

    /** Bias multiplier slope per unit of deck share; tuned so an even 5-way deck split (share = 0.2) yields multiplier 1.0 (no-op). */
    private const val BIAS_SCALE = 1.5

    fun isEnabled(): Boolean = SettingsHelper.getBooleanSetting("training", "enableCareerPlanner")

    /**
     * Multiplies [baseTargets] by the deck-inferred bias for each stat. Returns [baseTargets]
     * unchanged when the equipped deck has no recognizable stat types.
     *
     * @param baseTargets Phase-scaled stat targets to bias, as returned by [Trainee.getPhaseStatTargets].
     * @return Biased stat targets, same key set as [baseTargets].
     */
    fun applyDeckBias(baseTargets: Map<StatName, Int>): Map<StatName, Int> {
        val shares = deckStatShares()
        if (shares.isEmpty()) return baseTargets

        return baseTargets.mapValues { (statName, target) ->
            val share = shares[statName] ?: 0.0
            val multiplier = BIAS_FLOOR + BIAS_SCALE * share
            (target * multiplier).toInt().coerceAtLeast(1)
        }
    }

    /**
     * Normalized share (0.0-1.0) of the equipped support deck that maps to each [StatName],
     * counting only cards with a recognizable stat type.
     *
     * @return Per-stat deck share, or empty when no equipped cards resolve to a known type
     *   (unset deck, all-Friend deck, or unrecognized names).
     */
    private fun deckStatShares(): Map<StatName, Double> {
        val ownedCards = SupportCardSelection.readStringList(SettingsHelper.getStringSetting("racing", "supportDeckOwnedCards"))
        val types = ownedCards.mapNotNull { SupportCardTypeRegistry.typeOf(it) }
        if (types.isEmpty()) {
            MessageLog.v(TAG, "No recognizable support card types in the equipped deck; skipping stat-target bias.")
            return emptyMap()
        }

        val total = types.size.toDouble()
        return types.groupingBy { it }.eachCount().mapValues { (_, count) -> count / total }
    }
}
