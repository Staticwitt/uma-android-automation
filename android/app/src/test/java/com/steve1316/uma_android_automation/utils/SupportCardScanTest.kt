package com.steve1316.uma_android_automation.utils

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

/** Unit tests for the pure Support Card List scan geometry and classification. The OpenCV pixel reads are validated on-device. */
@DisplayName("Support card scan geometry and classification")
class SupportCardScanTest {
    @Test
    @DisplayName("The tile grid is a 5-column layout with only fully-visible rows, all tiles on-screen")
    fun testTileGrid() {
        val tiles = SupportCardScanLayout.tileGrid(1080, 2340)
        assertTrue(tiles.isNotEmpty(), "A 1080x2340 screen fits several rows of cards")
        assertEquals(SupportCardScanLayout.COLUMNS, tiles.count { it.row == 0 }, "The first row has five columns")
        tiles.forEach { t ->
            assertTrue(t.x >= 0 && t.x + t.width <= 1080, "Tile stays within screen width: $t")
            assertTrue(t.y >= 0 && t.y + t.height <= 2340, "Tile stays within screen height: $t")
        }
        // Columns advance left-to-right, rows top-to-bottom.
        val row0 = tiles.filter { it.row == 0 }.sortedBy { it.col }
        for (i in 1 until row0.size) assertTrue(row0[i].x > row0[i - 1].x, "Columns advance rightward")
        val col0 = tiles.filter { it.col == 0 }.sortedBy { it.row }
        for (i in 1 until col0.size) assertTrue(col0[i].y > col0[i - 1].y, "Rows advance downward")
    }

    @Test
    @DisplayName("Type classification maps vivid icon hues to the right stat, and washed-out/uncalibrated icons to Unknown")
    fun testCardTypeFromHue() {
        assertEquals("Stamina", cardTypeFromHue(hue = 3.0, saturation = 200.0), "Red heart -> Stamina")
        assertEquals("Stamina", cardTypeFromHue(hue = 176.0, saturation = 200.0), "Wrap-around red -> Stamina")
        assertEquals("Power", cardTypeFromHue(hue = 16.0, saturation = 200.0), "Orange -> Power")
        assertEquals("Wit", cardTypeFromHue(hue = 60.0, saturation = 200.0), "Green -> Wit")
        assertEquals("Speed", cardTypeFromHue(hue = 110.0, saturation = 200.0), "Blue -> Speed")
        assertEquals("Unknown", cardTypeFromHue(hue = 110.0, saturation = 20.0), "Low saturation -> Unknown")
        assertEquals("Unknown", cardTypeFromHue(hue = 155.0, saturation = 200.0), "Uncalibrated pink band -> Unknown for now")
    }

    @Test
    @DisplayName("Pip counting counts only pips whose colored fill clears the threshold")
    fun testPipCount() {
        assertEquals(4, pipCountFromFills(listOf(0.9, 0.8, 0.85, 0.7)))
        assertEquals(2, pipCountFromFills(listOf(0.9, 0.8, 0.1, 0.05)))
        assertEquals(0, pipCountFromFills(listOf(0.1, 0.05, 0.0, 0.2)))
    }

    @Test
    @DisplayName("Rarity normalization recognizes SSR/SR/R and rejects noise")
    fun testNormalizeRarity() {
        assertEquals("SSR", normalizeRarity(" ssr "))
        assertEquals("SR", normalizeRarity("SR"))
        assertEquals("R", normalizeRarity("R"))
        assertEquals("SSR", normalizeRarity("SSR")) // SSR must win over the SR substring
        assertEquals("", normalizeRarity("xyz"))
    }
}
