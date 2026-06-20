package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.SettingsHelper

/**
 * Opt-in "Goal Race Stat Reallocation": when a mandatory/scheduled race is coming up within a
 * configurable lookahead window, training temporarily resolves stat targets using that race's
 * actual distance instead of the trainee's permanent preferred distance, so training leads into
 * the goal race appropriately even when its distance differs from the trainee's long-term build.
 *
 * This object only owns the feature's settings. The actual turn-lookahead OCR check and race
 * database lookup live on [Campaign.resolveGoalRaceDistance], since they need access to the
 * [Racing] instance which [Campaign] does not expose more broadly. Off by default; existing
 * training behavior is unchanged unless a user opts in.
 */
object GoalRaceStatBias {
    fun isEnabled(): Boolean = SettingsHelper.getBooleanSetting("training", "enableGoalRaceStatBias", false)

    /** Number of turns before the next mandatory race within which its distance is used for stat targets. */
    fun lookaheadTurns(): Int = SettingsHelper.getIntSetting("training", "goalRaceStatBiasLookaheadTurns", 3)
}
