package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.MessageLog

/**
 * Discord-friendly markdown helpers. Prefer readable markdown over ``` code fences.
 */
object DiscordMessageFormatter {
    fun success(message: String): String = "✅ **${MessageLog.getSystemTimeString()}** $message"

    fun error(message: String): String = "❌ **${MessageLog.getSystemTimeString()}** $message"

    fun section(title: String, lines: List<String>): String {
        if (lines.isEmpty()) return ""
        return "**$title**\n${lines.joinToString("\n")}"
    }

    fun bullet(label: String, value: String): String = "• **$label:** $value"

    fun plainBullet(text: String): String = "• $text"
}
