package com.steve1316.uma_android_automation.bot

import android.graphics.Bitmap
import com.steve1316.uma_android_automation.types.BoundingBox
import com.steve1316.uma_android_automation.utils.ScrollListEntry
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Unit tests for [SupportCardSelection] OCR matching helpers. */
class SupportCardSelectionTest {
    @Test
    fun readStringList_parsesJsonArray() {
        assertEquals(listOf("Maruzensky", "Super Creek"), SupportCardSelection.readStringList("[\"Maruzensky\",\"Super Creek\"]"))
    }

    @Test
    fun readStringList_returnsEmptyForInvalidJson() {
        assertEquals(emptyList<String>(), SupportCardSelection.readStringList("not-json"))
    }

    @Test
    fun ocrMightMatchName_acceptsSubstring() {
        assertTrue(SupportCardSelection.ocrMightMatchName("maruzensky speed", "maruzensky"))
    }

    @Test
    fun ocrMightMatchName_rejectsNoOverlap() {
        assertFalse(SupportCardSelection.ocrMightMatchName("abcdef", "gold ship"))
    }

    @Test
    fun matchScore_prefersExactSubstring() {
        assertEquals(1.0, SupportCardSelection.matchScore("maruzensky speed", "Maruzensky"), 0.001)
    }

    @Test
    fun firstMatchingPreferredName_respectsPriorityOrder() {
        val preferred = listOf("Maruzensky", "Super Creek")
        assertEquals("Maruzensky", SupportCardSelection.firstMatchingPreferredName("maruzensky speed", preferred))
        assertEquals("Super Creek", SupportCardSelection.firstMatchingPreferredName("super creek stamina", preferred))
    }

    @Test
    fun matchesName_usesThreshold() {
        assertTrue(SupportCardSelection.matchesName("maruzensky speed", "Maruzensky"))
        assertFalse(SupportCardSelection.matchesName("gold ship", "Maruzensky"))
    }

    @Test
    fun entryDedupeKey_usesBoundingBox() {
        val entry =
            ScrollListEntry(
                index = 0,
                bitmap = Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888),
                bbox = BoundingBox(x = 10, y = 20, w = 100, h = 50),
            )
        assertEquals("10:20:100:50", SupportCardSelection.entryDedupeKey(entry))
    }
}
