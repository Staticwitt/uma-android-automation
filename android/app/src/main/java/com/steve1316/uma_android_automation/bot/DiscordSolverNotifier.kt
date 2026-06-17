package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.DiscordUtils
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper

/**
 * Discord alerts for smart race solver events (race losses, win-rate guard skips).
 */
object DiscordSolverNotifier {
    fun isRaceAlertsEnabled(): Boolean =
        DiscordUtils.enableDiscordNotifications &&
            SettingsHelper.getBooleanSetting("racing", "enableSmartRaceSolver", false) &&
            SettingsHelper.getBooleanSetting("discord", "enableDiscordRaceAlerts", true)

    fun isWinRateGuardAlertsEnabled(): Boolean =
        DiscordUtils.enableDiscordNotifications &&
            SettingsHelper.getBooleanSetting("racing", "enableSmartRaceSolver", false) &&
            SettingsHelper.getBooleanSetting("discord", "enableDiscordWinRateGuardAlerts", true)

    fun maybeSendRaceLoss(raceName: String, turnNumber: Int) {
        if (!isRaceAlertsEnabled()) return
        AppDiscordNotifications.sendEmbed(buildRaceLossEmbed(raceName, turnNumber))
    }

    fun maybeSendWinRateGuardSkip(
        raceKey: String,
        turnNumber: Int,
        winProbability: Double,
        guardFloor: Double,
    ) {
        if (!isWinRateGuardAlertsEnabled()) return
        AppDiscordNotifications.sendEmbed(
            buildWinRateGuardSkipEmbed(raceKey, turnNumber, winProbability, guardFloor),
        )
    }

    internal fun buildRaceLossEmbed(raceName: String, turnNumber: Int): DiscordEmbedSpec =
        DiscordEmbedSpec(
            title = "Race lost",
            description = raceName,
            colorRgb = DiscordEmbedColors.RED,
            fields =
                listOf(
                    DiscordEmbedField("Turn", turnNumber.toString(), inline = true),
                    DiscordEmbedField("Result", "Did not finish 1st", inline = true),
                ),
            footer = MessageLog.getSystemTimeString(),
        )

    internal fun buildWinRateGuardSkipEmbed(
        raceKey: String,
        turnNumber: Int,
        winProbability: Double,
        guardFloor: Double,
    ): DiscordEmbedSpec {
        val pWinPct = (winProbability * 100).toInt()
        val floorPct = (guardFloor * 100).toInt()
        return DiscordEmbedSpec(
            title = "Win-rate guard skipped race",
            description = raceKey,
            colorRgb = DiscordEmbedColors.YELLOW,
            fields =
                listOf(
                    DiscordEmbedField("Turn", turnNumber.toString(), inline = true),
                    DiscordEmbedField("P(win)", "$pWinPct%", inline = true),
                    DiscordEmbedField("Guard floor", "$floorPct%", inline = true),
                ),
            footer = MessageLog.getSystemTimeString(),
        )
    }
}
