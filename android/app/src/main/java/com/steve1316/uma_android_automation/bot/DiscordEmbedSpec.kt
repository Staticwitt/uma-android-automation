package com.steve1316.uma_android_automation.bot

/** A single field row inside a Discord embed. */
data class DiscordEmbedField(
    val name: String,
    val value: String,
    val inline: Boolean = false,
)

/**
 * Serializable Discord embed payload built in app code and sent via Kord.
 *
 * @property title Embed title (max 256 chars — truncated when sending).
 * @property description Optional embed body (max 4096 chars — truncated when sending).
 * @property colorRgb Discord color integer (RGB, e.g. 0x5865F2).
 * @property fields Up to 25 fields (values truncated per Discord limits).
 * @property footer Optional footer text (max 2048 chars — truncated when sending).
 */
data class DiscordEmbedSpec(
    val title: String,
    val description: String? = null,
    val colorRgb: Int,
    val fields: List<DiscordEmbedField> = emptyList(),
    val footer: String? = null,
) {
    /** Plain-text fallback when embed delivery fails or embeds are disabled. */
    fun toPlainFallback(): String {
        val lines = mutableListOf<String>()
        lines.add("**$title**")
        if (!description.isNullOrBlank()) {
            lines.add(description)
        }
        fields.forEach { field ->
            lines.add("**${field.name}:** ${field.value}")
        }
        if (!footer.isNullOrBlank()) {
            lines.add(footer)
        }
        return lines.joinToString("\n")
    }
}

/** Shared Discord embed accent colors. */
object DiscordEmbedColors {
    const val BLURPLE: Int = 0x5865F2
    const val GREEN: Int = 0x57F287
    const val YELLOW: Int = 0xFEE75C
    const val RED: Int = 0xED4245
    const val GREY: Int = 0x95A5A6
}
