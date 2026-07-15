package com.steve1316.uma_android_automation.bot.campaigns

import android.graphics.Bitmap
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.bot.Campaign
import com.steve1316.uma_android_automation.bot.Game
import com.steve1316.uma_android_automation.bot.Training
import com.steve1316.uma_android_automation.components.ButtonTrainingGuts
import com.steve1316.uma_android_automation.components.ButtonTrainingPower
import com.steve1316.uma_android_automation.components.ButtonTrainingSpeed
import com.steve1316.uma_android_automation.components.ButtonTrainingStamina
import com.steve1316.uma_android_automation.components.ButtonTrainingWit
import com.steve1316.uma_android_automation.components.IconDuel
import com.steve1316.uma_scoring.StatName
import kotlin.math.abs

/**
 * Applies the Happy Meek duel bias to a training's score. Pure so it is unit-testable without a live Training.
 *
 * Winning the duel grants bonus rewards, so a duel-badged facility can be worth taking over a slightly better
 * plain training. "Moderate" prefers the duel only when it is already close to the best pick (multiplicative
 * nudge); "Aggressive" strongly prefers the duel facility (doubling plus a flat boost so even a weak facility
 * usually wins). Any other value, or no badge, leaves the score untouched.
 *
 * @param score The training's base score.
 * @param hasDuelBadge Whether the duel badge was detected on this facility.
 * @param bias The configured bias level: "Off", "Moderate", or "Aggressive".
 * @return The biased score.
 */
fun applyDuelBias(score: Double, hasDuelBadge: Boolean, bias: String): Double =
    when {
        !hasDuelBadge -> score
        bias == "Moderate" -> score * 1.15
        bias == "Aggressive" -> score * 2.0 + 500.0
        else -> score
    }

/**
 * URA Finale-specific Training subclass that detects Happy Meek's duel badge on training facilities and biases
 * scoring toward the badged facility, so the bot enters (and wins) the duel. No-ops entirely when the
 * "Happy Meek Duel Bias" scenario override is Off.
 *
 * @property game The [Game] instance for interacting with the game state.
 * @property campaign The [Campaign] instance for accessing campaign state.
 */
class UraFinaleTraining(game: Game, campaign: Campaign) : Training(game, campaign) {
    /** The configured duel bias level: "Off" (default), "Moderate", or "Aggressive". */
    private val duelBias: String = SettingsHelper.getStringSetting("scenarioOverrides", "uraFinaleHappyMeekDuelBias", "Off")

    override fun runExtraTrainingAnalysis(result: TrainingAnalysisResult, sourceBitmap: Bitmap, singleTraining: Boolean) {
        try {
            if (duelBias != "Off") {
                result.extras["uraDuelBadge"] = detectDuelBadgeOnFacility(result.name, sourceBitmap)
            }
        } catch (e: Exception) {
            MessageLog.w(TAG, "[WARN] runExtraTrainingAnalysis:: Duel badge detection failed for ${result.name}: ${e.message}")
            result.extras["uraDuelBadge"] = false
        } finally {
            result.latch.countDown()
        }
    }

    /**
     * Whether Happy Meek's duel badge sits on [stat]'s facility in [sourceBitmap]. The badge floats above and
     * slightly left of the facility button, so a detected badge is associated with the facility whose button
     * center is below it within a loose window (the support-card portrait's own "Duel Lvl" badge uses a
     * different, smaller style that this template does not match).
     */
    private fun detectDuelBadgeOnFacility(stat: StatName, sourceBitmap: Bitmap): Boolean {
        val badges = IconDuel.findAll(game.imageUtils, sourceBitmap = sourceBitmap)
        if (badges.isEmpty()) return false

        val button =
            when (stat) {
                StatName.SPEED -> ButtonTrainingSpeed
                StatName.STAMINA -> ButtonTrainingStamina
                StatName.POWER -> ButtonTrainingPower
                StatName.GUTS -> ButtonTrainingGuts
                StatName.WIT -> ButtonTrainingWit
            }.findAll(game.imageUtils, sourceBitmap = sourceBitmap).firstOrNull() ?: return false

        val found = badges.any { badge -> abs(badge.x - button.x) <= 100.0 && (button.y - badge.y) in 30.0..180.0 }
        if (found) {
            MessageLog.i(TAG, "[TRAINING] [$stat] Happy Meek duel badge detected on this facility.")
        }
        return found
    }

    override fun scoreTraining(config: TrainingConfig, option: TrainingOption): Double {
        val base = super.scoreTraining(config, option)
        val hasDuelBadge = option.extras["uraDuelBadge"] as? Boolean ?: false
        val biased = applyDuelBias(base, hasDuelBadge, duelBias)
        if (biased != base) {
            MessageLog.i(TAG, "[TRAINING] [${option.name}] Applying '$duelBias' Happy Meek duel bias: ${String.format("%.2f", base)} -> ${String.format("%.2f", biased)}")
        }
        return biased
    }

    override fun getExtraLogFields(training: TrainingOption): List<String> {
        return if (training.extras["uraDuelBadge"] as? Boolean == true) {
            listOf("Happy Meek duel badge on this facility")
        } else {
            emptyList()
        }
    }
}
