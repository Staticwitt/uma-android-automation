package com.steve1316.uma_android_automation.bot

import com.steve1316.uma_scoring.rankLabelToImageIndex

/**
 * Configuration for the projection-driven auto-abandon check.
 *
 * @property enabled Master switch; when false the policy never abandons.
 * @property minTurn The earliest turn the projection is trusted enough to act on. Before this the extrapolation is too noisy (few observations), so a run is never abandoned.
 * @property targetGrade The grade the run is aiming for (e.g. "A", "S"). A run is abandoned once its *projected* final grade sits strictly below this.
 * @property minObservations The fewest per-turn projection observations required before the check may fire. Guards against a too-short trajectory - most importantly a bot started
 *   mid-career, where a single observation makes the projection flat at the current (mid-run, sub-target) score and would trigger an immediate false abandon.
 */
data class AbandonConfig(
    val enabled: Boolean = false,
    val minTurn: Int = 36,
    val targetGrade: String = "A",
    val minObservations: Int = 8,
)

/**
 * The outcome of an auto-abandon check.
 *
 * @property shouldAbandon Whether the run should be given up now.
 * @property reason A human-readable explanation, logged either way.
 */
data class AbandonDecision(
    val shouldAbandon: Boolean,
    val reason: String,
)

/**
 * Decides whether an unattended run is worth continuing, using the live final-rank projection. The idea: a farm's time is better spent restarting a run that is already
 * projected below target than grinding it to a mediocre finish. The check is deliberately conservative - it only fires after [AbandonConfig.minTurn] (so early noise cannot
 * abandon a run that would have recovered) and only when the projected grade is *strictly* below the target. Grade comparison is done in the shared rank-label index space, where
 * a higher index is a higher grade. Pure and side-effect-free; the caller owns the actual stop.
 */
object RunAbandonPolicy {
    /**
     * Evaluate the abandon decision for the current run state.
     *
     * @param projection The latest final-rank projection, or null if none has been computed yet.
     * @param currentTurn The current career turn.
     * @param observationCount How many per-turn observations the projection is built from (see [AbandonConfig.minObservations]).
     * @param config The abandon configuration.
     * @return Whether to abandon, with the reasoning.
     */
    fun evaluate(projection: RankProjectionResult?, currentTurn: Int, observationCount: Int, config: AbandonConfig): AbandonDecision {
        if (!config.enabled) return AbandonDecision(false, "Auto-abandon is disabled.")
        if (projection == null) return AbandonDecision(false, "No rank projection available yet.")
        if (currentTurn < config.minTurn) {
            return AbandonDecision(false, "Turn $currentTurn is before the evaluation turn (${config.minTurn}); projection not trusted yet.")
        }
        if (observationCount < config.minObservations) {
            // Too few points for a real trajectory - e.g. the bot was started mid-career, so the projection is nearly flat at the current sub-target score. Give the run time to
            // accumulate a trend rather than abandoning it on the spot.
            return AbandonDecision(false, "Only $observationCount projection observation(s) so far (need ${config.minObservations}); trajectory too short to judge.")
        }

        val targetIndex = rankLabelToImageIndex(config.targetGrade)
        if (targetIndex < 0) return AbandonDecision(false, "Unknown target grade '${config.targetGrade}'.")

        val projectedIndex = rankLabelToImageIndex(projection.projectedGrade)
        if (projectedIndex < 0) return AbandonDecision(false, "Unrecognized projected grade '${projection.projectedGrade}'.")

        return if (projectedIndex < targetIndex) {
            AbandonDecision(
                true,
                "Projected final grade ${projection.projectedGrade} (${projection.projectedScore}) is below target ${config.targetGrade} at turn $currentTurn.",
            )
        } else {
            AbandonDecision(false, "Projected final grade ${projection.projectedGrade} meets target ${config.targetGrade}.")
        }
    }
}
