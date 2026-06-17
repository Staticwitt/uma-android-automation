package com.steve1316.uma_android_automation.utils

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class DisplayProfileTest {
    @Test
    fun match_recognizes_samsung_tab_s10_fe_portrait() {
        val profile = DisplayProfileRegistry.match(width = 1440, height = 2304, dpi = 340)
        assertNotNull(profile)
        assertEquals("samsung_tab_s10_fe", profile?.id)
        assertTrue(profile!!.templateScale > 1.32 && profile.templateScale < 1.34)
    }

    @Test
    fun match_recognizes_tab_when_landscape_metrics_are_reported() {
        val profile = DisplayProfileRegistry.match(width = 2304, height = 1440, dpi = 360)
        assertNotNull(profile)
        assertEquals("samsung_tab_s10_fe", profile?.id)
    }

    @Test
    fun resolveEffectiveTemplateScale_applies_tab_profile_when_default_scale() {
        val scale =
            DisplayProfileRegistry.resolveEffectiveTemplateScale(
                width = 1440,
                height = 2304,
                dpi = 340,
                userScale = 1.0,
                autoTuneEnabled = true,
            )
        assertTrue(scale > 1.32 && scale < 1.34)
    }

    @Test
    fun resolveEffectiveTemplateScale_respects_manual_scale() {
        val scale =
            DisplayProfileRegistry.resolveEffectiveTemplateScale(
                width = 1440,
                height = 2304,
                dpi = 340,
                userScale = 1.15,
                autoTuneEnabled = true,
            )
        assertEquals(1.15, scale)
    }

    @Test
    fun match_rejects_unknown_resolution() {
        assertNull(DisplayProfileRegistry.match(width = 720, height = 1280, dpi = 240))
    }
}
