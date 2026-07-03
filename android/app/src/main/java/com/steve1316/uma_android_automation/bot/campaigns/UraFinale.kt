package com.steve1316.uma_android_automation.bot.campaigns

import com.steve1316.automation_library.data.SharedData
import com.steve1316.automation_library.utils.DiscordUtils
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.bot.AppDiscordNotifications
import com.steve1316.uma_android_automation.bot.Campaign
import com.steve1316.uma_android_automation.bot.Game
import com.steve1316.uma_android_automation.components.ButtonHomeFansInfo
import com.steve1316.uma_android_automation.components.ButtonOk
import com.steve1316.uma_android_automation.types.StatName

/**
 * Handles the URA Finale scenario with scenario-specific logic and handling.
 *
 * @property game The [Game] instance for interacting with the game state.
 */
class UraFinale(game: Game) : Campaign(game) {
    override fun openFansDialog() {
        ButtonHomeFansInfo.click(game.imageUtils, region = game.imageUtils.regionTopHalf, tries = 10)
        bHasTriedCheckingFansToday = true
        game.wait(game.dialogWaitDelay, skipWaitingForLoading = true)
    }

    /**
     * Detects and handles the URA Duel screen where Happy Meek challenges the trainee to a stat
     * contest. Navigates the carousel to the trainee's highest stat (speed/power/wits) and confirms.
     *
     * @return True if the duel screen was detected and handled, false otherwise.
     */
    private fun handleUraDuel(): Boolean {
        val bitmap = game.imageUtils.getSourceBitmap()

        val detectX = (SharedData.displayWidth * 0.10).toInt()
        val detectY = (SharedData.displayHeight * 0.35).toInt()
        val detectW = (SharedData.displayWidth * 0.80).toInt()
        val detectH = (SharedData.displayHeight * 0.15).toInt()

        val headerText = game.imageUtils.performOCROnRegion(
            bitmap, detectX, detectY, detectW, detectH,
            useThreshold = false, useGrayscale = true, scale = 1.5,
            ocrEngine = "mlkit", debugName = "ura_duel_detect",
        ).lowercase()

        if (!headerText.contains("contest of")) return false

        MessageLog.i(TAG, "\n[URA_DUEL] Duel screen detected: \"$headerText\"")

        val statsAvail = mapOf(
            StatName.SPEED to trainee.stats.speed,
            StatName.POWER to trainee.stats.power,
            StatName.WIT to trainee.stats.wit,
        ).filter { it.value > 0 }

        val targetStat = statsAvail.maxByOrNull { it.value }?.key ?: StatName.SPEED
        val targetKeyword = when (targetStat) {
            StatName.SPEED -> "speed"
            StatName.POWER -> "power"
            StatName.WIT -> "wits"
            else -> "speed"
        }

        MessageLog.i(TAG, "[URA_DUEL] Best duel stat: $targetStat (spd=${trainee.stats.speed}, pow=${trainee.stats.power}, wit=${trainee.stats.wit}). Seeking \"$targetKeyword\".")

        val rightArrowX = SharedData.displayWidth * 0.88
        val rightArrowY = SharedData.displayHeight * 0.48

        for (attempt in 0 until 3) {
            val currentBitmap = game.imageUtils.getSourceBitmap()
            val current = game.imageUtils.performOCROnRegion(
                currentBitmap, detectX, detectY, detectW, detectH,
                useThreshold = false, useGrayscale = true, scale = 1.5,
                ocrEngine = "mlkit", debugName = "ura_duel_option_$attempt",
            ).lowercase()
            MessageLog.i(TAG, "[URA_DUEL] Attempt $attempt option text: \"$current\"")
            if (current.contains(targetKeyword)) break
            game.gestureUtils.tap(rightArrowX, rightArrowY, "ura_duel_right_arrow")
            game.wait(0.5)
        }

        if (!ButtonOk.click(game.imageUtils)) {
            val confirmX = SharedData.displayWidth * 0.5
            val confirmY = SharedData.displayHeight * 0.88
            game.gestureUtils.tap(confirmX, confirmY, "ura_duel_confirm")
        }

        game.wait(1.0)
        game.waitForLoading()

        if (SettingsHelper.getBooleanSetting("discord", "enableScenarioProgressPings", false) && DiscordUtils.enableDiscordNotifications) {
            val yearLabel = date.year.name.lowercase().replaceFirstChar { it.uppercase() }
            AppDiscordNotifications.sendInfo(
                title = "URA Finale Duel Complete ($yearLabel Year)",
                description = "The $yearLabel Year URA Duel was resolved. Trainee chose ${targetStat.name.lowercase()} as their contest stat.",
            )
        }

        return true
    }

    override fun checkCampaignSpecificConditions(): Boolean = handleUraDuel()
}
