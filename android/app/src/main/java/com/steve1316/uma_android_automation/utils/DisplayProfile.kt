package com.steve1316.uma_android_automation.utils

/**
 * Known display configurations and recommended template-matching scale for each.
 *
 * Templates are authored against a 1080px-wide baseline. Wider panels (e.g. Samsung Tab S10 FE at
 * 1440×2304) need a proportionally larger [templateScale].
 */
data class DisplayProfileMatch(
    val id: String,
    val label: String,
    val templateScale: Double,
)

object DisplayProfileRegistry {
    private const val BASELINE_WIDTH = 1080

    /** Last matched profile id for display-aware OCR tuning (e.g. spark inheritance crops). */
    @Volatile
    var lastMatchedProfileId: String? = null

    private data class ProfileSpec(
        val id: String,
        val label: String,
        val width: Int,
        val height: Int,
        val widthTolerance: Int = 0,
        val heightTolerance: Int = 0,
        val dpiMin: Int,
        val dpiMax: Int,
        val templateScale: Double,
    )

    private val profiles: List<ProfileSpec> =
        listOf(
            ProfileSpec(
                id = "phone_1080p_240",
                label = "1080×1920 @ 240 DPI",
                width = 1080,
                height = 1920,
                dpiMin = 240,
                dpiMax = 240,
                templateScale = 1.0,
            ),
            ProfileSpec(
                id = "samsung_phone_1080p_450",
                label = "1080×2340 @ 450 DPI (Samsung phone)",
                width = 1080,
                height = 2340,
                dpiMin = 450,
                dpiMax = 450,
                templateScale = 1.0,
            ),
            ProfileSpec(
                id = "samsung_tab_s10_fe",
                label = "Samsung Galaxy Tab S10 FE (1440×2304)",
                width = 1440,
                height = 2304,
                heightTolerance = 32,
                dpiMin = 280,
                dpiMax = 420,
                templateScale = 1440.0 / BASELINE_WIDTH,
            ),
        )

    /** Normalizes to portrait (shorter side = width) before matching. */
    internal fun normalizePortrait(width: Int, height: Int): Pair<Int, Int> =
        if (width <= height) {
            width to height
        } else {
            height to width
        }

    fun match(width: Int, height: Int, dpi: Int): DisplayProfileMatch? {
        val (portraitWidth, portraitHeight) = normalizePortrait(width, height)
        for (spec in profiles) {
            if (!within(portraitWidth, spec.width, spec.widthTolerance)) continue
            if (!within(portraitHeight, spec.height, spec.heightTolerance)) continue
            if (dpi !in spec.dpiMin..spec.dpiMax) continue
            lastMatchedProfileId = spec.id
            return DisplayProfileMatch(spec.id, spec.label, spec.templateScale)
        }
        return null
    }

    fun isSupported(width: Int, height: Int, dpi: Int): Boolean = match(width, height, dpi) != null

    /**
     * Applies a profile's recommended template scale when auto-tuning is enabled and the user has
     * not changed the default scale (1.0).
     */
    fun resolveEffectiveTemplateScale(
        width: Int,
        height: Int,
        dpi: Int,
        userScale: Double,
        autoTuneEnabled: Boolean,
    ): Double {
        if (!autoTuneEnabled) return userScale
        val profile = match(width, height, dpi) ?: return userScale
        if (profile.templateScale == 1.0) return userScale
        if (kotlin.math.abs(userScale - 1.0) > 0.001) return userScale
        return profile.templateScale
    }

    fun supportedProfileLabels(): List<String> = profiles.map { it.label }

    private fun within(value: Int, target: Int, tolerance: Int): Boolean =
        value in (target - tolerance)..(target + tolerance)

    /** OCR scale multiplier for spark inheritance crops on wider tablet profiles. */
    fun sparkOcrScale(width: Int, height: Int, dpi: Int): Double {
        val profile = match(width, height, dpi) ?: return 1.0
        return when (profile.id) {
            "samsung_tab_s10_fe" -> 1.25
            else -> if (profile.templateScale > 1.05) 1.15 else 1.0
        }
    }
}
