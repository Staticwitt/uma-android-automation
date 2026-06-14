package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.DiscordUtils
import com.steve1316.automation_library.utils.MessageLog

/**
 * Routes outbound Discord notifications to embeds or plain markdown depending on settings.
 */
object AppDiscordNotifications {
    fun sendPlain(text: String) {
        if (!DiscordUtils.enableDiscordNotifications) return
        DiscordUtils.queue.add(text)
    }

    fun sendEmbed(spec: DiscordEmbedSpec) {
        if (!DiscordUtils.enableDiscordNotifications) return
        if (DiscordEmbedService.isEmbedsEnabled()) {
            DiscordEmbedService.queue(spec)
        } else {
            sendPlain(spec.toPlainFallback())
        }
    }

    fun sendSuccess(message: String) {
        sendEmbed(
            DiscordEmbedSpec(
                title = "Run finished",
                description = message,
                colorRgb = DiscordEmbedColors.GREEN,
                footer = MessageLog.getSystemTimeString(),
            ),
        )
    }

    fun sendError(message: String) {
        sendEmbed(
            DiscordEmbedSpec(
                title = "Bot stopped",
                description = message,
                colorRgb = DiscordEmbedColors.RED,
                footer = MessageLog.getSystemTimeString(),
            ),
        )
    }

    fun sendInfo(title: String, description: String? = null, fields: List<DiscordEmbedField> = emptyList()) {
        sendEmbed(
            DiscordEmbedSpec(
                title = title,
                description = description,
                colorRgb = DiscordEmbedColors.BLURPLE,
                fields = fields,
                footer = MessageLog.getSystemTimeString(),
            ),
        )
    }
}
