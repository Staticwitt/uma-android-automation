package com.steve1316.uma_android_automation.bot

import com.steve1316.uma_android_automation.types.Mood

/**
 * Pure policy for the mood-recovery floor. Extracted so the energy-aware relaxation is unit-testable without a live run.
 *
 * Mood recovery fires when the trainee's mood drops below a floor (the user's Minimum Mood For Training). Recovering costs a turn, and at high energy that turn could instead be spent
 * training - a run with energy to spare can afford to train through a slightly lower mood (mood is a gain multiplier, not a hard gate). This relaxation lowers the floor by one mood
 * level while energy is high, so the bot trains through a one-step mood dip instead of spending the turn on a recreation outing.
 */
object MoodRecoveryPolicy {
    /**
     * The effective mood-recovery floor after applying the optional high-energy tolerance.
     *
     * When [toleranceEnabled] and [energy] is at or above [energyThreshold], the [baseFloor] is lowered by one mood level (never below [Mood.AWFUL]), so a one-step mood dip is trained
     * through rather than recovered. Otherwise [baseFloor] is returned unchanged. Pure and side-effect-free.
     *
     * @param baseFloor The user's configured Minimum Mood For Training.
     * @param energy The trainee's current energy percentage (0..100).
     * @param toleranceEnabled Whether high-energy mood tolerance is enabled.
     * @param energyThreshold The energy percentage at or above which the tolerance applies.
     * @return The effective floor the caller should compare the trainee's mood against.
     */
    fun relaxedMoodFloor(baseFloor: Mood, energy: Int, toleranceEnabled: Boolean, energyThreshold: Int): Mood =
        if (toleranceEnabled && energy >= energyThreshold) {
            Mood.entries[(baseFloor.ordinal - 1).coerceAtLeast(0)]
        } else {
            baseFloor
        }
}
