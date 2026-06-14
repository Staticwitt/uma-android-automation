package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.DiscordUtils
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.MainActivity
import dev.kord.common.Color
import dev.kord.core.behavior.channel.createMessage
import dev.kord.core.entity.channel.MessageChannel
import dev.kord.rest.builder.message.embed
import kotlinx.coroutines.runBlocking
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * Sends [DiscordEmbedSpec] payloads through the shared [DiscordUtils] DM channel via Kord.
 */
object DiscordEmbedService {
    private const val TAG: String = "[${MainActivity.loggerTag}]DiscordEmbedService"
    private const val MAX_TITLE = 256
    private const val MAX_DESCRIPTION = 4096
    private const val MAX_FIELD_NAME = 256
    private const val MAX_FIELD_VALUE = 1024
    private const val MAX_FOOTER = 2048
    private const val MAX_FIELDS = 25

    private val pending = ConcurrentLinkedQueue<DiscordEmbedSpec>()

    fun isEmbedsEnabled(): Boolean =
        DiscordUtils.enableDiscordNotifications &&
            SettingsHelper.getBooleanSetting("discord", "enableDiscordEmbeds", true)

    fun queue(spec: DiscordEmbedSpec) {
        pending.add(spec)
        flushBlocking()
    }

    fun flushBlocking() {
        if (!DiscordUtils.enableDiscordNotifications || pending.isEmpty()) return
        runBlocking {
            flushPending()
        }
    }

    suspend fun flushPending() {
        val dmChannel = DiscordUtils.Companion.dmChannel
        if (dmChannel == null) {
            return
        }
        while (pending.isNotEmpty()) {
            val spec = pending.poll() ?: break
            try {
                sendEmbed(dmChannel, spec)
            } catch (e: Exception) {
                MessageLog.w(TAG, "[WARN] flushPending:: Embed send failed, falling back to plain text: ${e.message}")
                DiscordUtils.queue.add(spec.toPlainFallback())
            }
        }
    }

    private suspend fun sendEmbed(channel: MessageChannel, spec: DiscordEmbedSpec) {
        channel.createMessage {
            embed {
                title = truncate(spec.title, MAX_TITLE)
                spec.description?.takeIf { it.isNotBlank() }?.let { description = truncate(it, MAX_DESCRIPTION) }
                color = Color(spec.colorRgb)
                spec.fields.take(MAX_FIELDS).forEach { field ->
                    field(
                        truncate(field.name, MAX_FIELD_NAME),
                        field.inline,
                    ) {
                        truncate(field.value, MAX_FIELD_VALUE)
                    }
                }
                spec.footer?.takeIf { it.isNotBlank() }?.let { footerText ->
                    footer {
                        text = truncate(footerText, MAX_FOOTER)
                    }
                }
            }
        }
    }

    private fun truncate(text: String, max: Int): String {
        if (text.length <= max) return text
        if (max <= 1) return text.take(max)
        return text.take(max - 1) + "…"
    }
}
