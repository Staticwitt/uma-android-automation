package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class DiscordEmbedSpecTest {
    @Test
    fun toPlainFallback_includes_title_and_fields() {
        val spec =
            DiscordEmbedSpec(
                title = "Test title",
                description = "Body",
                colorRgb = DiscordEmbedColors.GREEN,
                fields = listOf(DiscordEmbedField("Fans", "120000", inline = true)),
                footer = "2026-06-14",
            )
        val plain = spec.toPlainFallback()
        assertTrue(plain.contains("Test title"))
        assertTrue(plain.contains("Body"))
        assertTrue(plain.contains("Fans"))
        assertTrue(plain.contains("120000"))
    }

    @Test
    fun truncate_limits_long_field_values_in_service() {
        val longValue = "x".repeat(2000)
        val spec =
            DiscordEmbedSpec(
                title = "T",
                colorRgb = DiscordEmbedColors.BLURPLE,
                fields = listOf(DiscordEmbedField("Long", longValue)),
            )
        assertEquals(1, spec.fields.size)
        assertTrue(spec.fields.first().value.length == 2000)
    }
}
