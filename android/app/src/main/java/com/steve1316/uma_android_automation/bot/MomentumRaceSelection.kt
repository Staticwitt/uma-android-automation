package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import kotlin.math.min

/** Consecutive losses before the guard floor starts tightening. */
const val MOMENTUM_LOSS_STREAK_THRESHOLD = 2

/** Consecutive wins before the guard floor may relax (only while fans are still needed). */
const val MOMENTUM_WIN_STREAK_THRESHOLD = 3

/** How much the floor tightens per consecutive loss once at/over the threshold. */
const val MOMENTUM_TIGHTEN_PER_LOSS = 0.05

/** Cap on the total tightening so a long slump can't make every race ineligible. */
const val MOMENTUM_TIGHTEN_CAP = 0.15

/** Flat relaxation applied on a qualifying win streak while fans are still needed. */
const val MOMENTUM_WIN_RELAXATION = 0.05

/**
 * Whether the trainee still needs fans toward the solver's minimum fan target. A target of 0 means
 * no fan requirement is configured, so extra races carry no fan value.
 */
fun momentumFansStillNeeded(currentFans: Int, minimumFanTarget: Int): Boolean = minimumFanTarget > 0 && currentFans < minimumFanTarget

/**
 * Pure momentum adjustment of the win-rate guard floor.
 *
 * On a losing streak (>= [MOMENTUM_LOSS_STREAK_THRESHOLD]) the floor tightens by
 * [MOMENTUM_TIGHTEN_PER_LOSS] per loss up to [MOMENTUM_TIGHTEN_CAP], so the bot skips marginal
 * races and spends the turns training/recovering instead. This applies even when the user's base
 * floor is 0 (guard off): a loss streak temporarily enables a floor.
 *
 * On a winning streak (>= [MOMENTUM_WIN_STREAK_THRESHOLD]) the floor relaxes by
 * [MOMENTUM_WIN_RELAXATION] — but only while [fansStillNeeded] is true. Once fan goals are met,
 * extra races cost training turns for nothing, so the streak is never ridden for its own sake.
 *
 * @param baseFloor The configured [com.steve1316.uma_android_automation.bot.solver.Weights.minWinRateGuard], already 0..1.
 * @param winStreak Current consecutive wins (0 if the last race was a loss).
 * @param lossStreak Current consecutive losses (0 if the last race was a win).
 * @param fansStillNeeded Result of [momentumFansStillNeeded] for the current run.
 * @return The adjusted floor, clamped to [0.0, 0.95].
 */
fun momentumAdjustedGuardFloor(baseFloor: Double, winStreak: Int, lossStreak: Int, fansStillNeeded: Boolean): Double {
    if (lossStreak >= MOMENTUM_LOSS_STREAK_THRESHOLD) {
        return (baseFloor + min(MOMENTUM_TIGHTEN_PER_LOSS * lossStreak, MOMENTUM_TIGHTEN_CAP)).coerceIn(0.0, 0.95)
    }
    if (winStreak >= MOMENTUM_WIN_STREAK_THRESHOLD && fansStillNeeded) {
        return (baseFloor - MOMENTUM_WIN_RELAXATION).coerceIn(0.0, 0.95)
    }
    return baseFloor
}

/**
 * Momentum-aware optional-race selection. Tracks the run's win/loss streaks and, when the feature
 * is enabled, nudges the Smart Race Solver's win-rate guard floor from run context — tightening
 * during losing streaks (protect training turns; a slumping trainee should train, not race) and
 * relaxing slightly during winning streaks only while a fan target is still unmet. All direction
 * decisions are automatic; the single user-facing control is the on/off setting.
 *
 * The streak state mirrors Campaign's Discord momentum tracker but lives here so the solver
 * integration (which has no Campaign reference) can read it, and so it can be unit-tested.
 */
object MomentumRaceSelection {
    private const val TAG = "[MOMENTUM_RACE]"

    @Volatile private var winStreak = 0

    @Volatile private var lossStreak = 0

    /** Last delta that was logged, so the log only records changes instead of spamming every weights read. */
    @Volatile private var lastLoggedDelta = 0.0

    fun isEnabled(): Boolean = SettingsHelper.getBooleanSetting("racing", "enableMomentumRaceSelection", false)

    /** Clears streak state. Called alongside the solver integration's per-run reset. */
    fun reset() {
        winStreak = 0
        lossStreak = 0
        lastLoggedDelta = 0.0
    }

    /** Records a race result. Tracking is unconditional (cheap) so state is warm if the feature is enabled. */
    fun onRaceResult(won: Boolean) {
        if (won) {
            winStreak++
            lossStreak = 0
        } else {
            lossStreak++
            winStreak = 0
        }
    }

    /**
     * Applies the momentum adjustment to the guard floor when enabled; returns [baseFloor] untouched otherwise.
     * Logs once whenever the applied delta changes so the run log shows when momentum kicks in or clears.
     */
    fun applyGuardAdjustment(baseFloor: Double, currentFans: Int, minimumFanTarget: Int): Double {
        if (!isEnabled()) return baseFloor
        val adjusted = momentumAdjustedGuardFloor(baseFloor, winStreak, lossStreak, momentumFansStillNeeded(currentFans, minimumFanTarget))
        val delta = adjusted - baseFloor
        if (delta != lastLoggedDelta) {
            lastLoggedDelta = delta
            when {
                delta > 0.0 -> MessageLog.i(TAG, "Loss streak of $lossStreak: raising the win-rate guard floor from $baseFloor to $adjusted to favor training over marginal races.")
                delta < 0.0 -> MessageLog.i(TAG, "Win streak of $winStreak with fans still needed: relaxing the win-rate guard floor from $baseFloor to $adjusted.")
                else -> MessageLog.i(TAG, "Momentum adjustment cleared; win-rate guard floor back to $baseFloor.")
            }
        }
        return adjusted
    }
}
