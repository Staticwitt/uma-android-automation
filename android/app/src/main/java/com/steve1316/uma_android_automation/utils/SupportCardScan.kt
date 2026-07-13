package com.steve1316.uma_android_automation.utils

/**
 * Pure geometry and classification helpers for the Support Card List scanner. The OpenCV pixel work lives in
 * [CustomImageUtils.scanSupportCardList]; the grid layout and the hue/pip classification are pure so they can be unit-tested and
 * tuned from the scan's logged measurements (the same calibration-first approach used for rainbow detection).
 *
 * The Support Card List renders a fixed 5-column grid of card tiles. Each tile shows a rarity badge (top-left), a type icon
 * (top-right), limit-break diamond pips and a "Lvl NN" label (bottom). Positions are expressed as fractions of the screen so the
 * same layout adapts across resolutions; the fractions are initial estimates calibrated against a 1080x2340 capture and refined
 * from the annotated scan crop.
 */

/** A tile rectangle in absolute pixels, plus its grid position. */
data class SupportCardTile(val col: Int, val row: Int, val x: Int, val y: Int, val width: Int, val height: Int)

/** A card detected from one tile of the Support Card List. `type`/`rarity` are "" and level -1 when unread. */
data class DetectedSupportCard(val type: String, val rarity: String, val limitBreak: Int, val level: Int)

/** A sub-region within a tile, as fractions of the tile's own width/height. */
data class TileSubRegion(val xFrac: Double, val yFrac: Double, val wFrac: Double, val hFrac: Double)

object SupportCardScanLayout {
    const val COLUMNS = 5

    // Grid placement as fractions of the screen (initial 1080x2340 calibration; tune from the annotated scan crop).
    const val GRID_LEFT_FRAC = 0.034
    const val GRID_TOP_FRAC = 0.106
    const val COL_PITCH_FRAC = 0.193
    const val ROW_PITCH_FRAC = 0.120
    const val TILE_WIDTH_FRAC = 0.179
    const val TILE_HEIGHT_FRAC = 0.101

    // Sub-regions within each tile (fractions of tile w/h).
    val TYPE_ICON = TileSubRegion(xFrac = 0.70, yFrac = 0.02, wFrac = 0.28, hFrac = 0.16)
    val RARITY_BADGE = TileSubRegion(xFrac = 0.02, yFrac = 0.02, wFrac = 0.30, hFrac = 0.16)
    val PIPS = TileSubRegion(xFrac = 0.03, yFrac = 0.86, wFrac = 0.55, hFrac = 0.12)
    val LEVEL = TileSubRegion(xFrac = 0.55, yFrac = 0.85, wFrac = 0.43, hFrac = 0.14)

    /**
     * Computes the tile rectangles for a screen of the given size. Rows are laid out top-to-bottom until a tile would fall below
     * the screen; only fully-visible rows are returned.
     *
     * @param width Screen width in pixels.
     * @param height Screen height in pixels.
     * @param maxRows Safety cap on rows scanned.
     * @return Visible tile rectangles, row-major.
     */
    fun tileGrid(width: Int, height: Int, maxRows: Int = 8): List<SupportCardTile> {
        val tileW = (width * TILE_WIDTH_FRAC).toInt()
        val tileH = (height * TILE_HEIGHT_FRAC).toInt()
        val left = (width * GRID_LEFT_FRAC).toInt()
        val top = (height * GRID_TOP_FRAC).toInt()
        val colPitch = (width * COL_PITCH_FRAC).toInt()
        val rowPitch = (height * ROW_PITCH_FRAC).toInt()

        val tiles = mutableListOf<SupportCardTile>()
        for (row in 0 until maxRows) {
            val y = top + row * rowPitch
            if (y + tileH > height) break
            for (col in 0 until COLUMNS) {
                val x = left + col * colPitch
                if (x + tileW > width) break
                tiles.add(SupportCardTile(col = col, row = row, x = x, y = y, width = tileW, height = tileH))
            }
        }
        return tiles
    }
}

/**
 * Classifies a support-card type from the dominant hue (OpenCV H, 0-180) and saturation (0-255) of the tile's type-icon region.
 * The icons are strongly colored: Stamina is a red heart, Power an orange dumbbell, Wit a green book, Speed a blue shoe. Guts and
 * Friend hue bands are left unassigned pending on-device samples, so they classify as "Unknown" and the scan log surfaces their
 * measured hue for calibration.
 *
 * @param hue Dominant hue in the OpenCV 0-180 range.
 * @param saturation Dominant saturation in 0-255.
 * @return One of "Speed"/"Stamina"/"Power"/"Wit", or "Unknown" for a low-saturation or unrecognized icon.
 */
fun cardTypeFromHue(hue: Double, saturation: Double): String {
    if (saturation < 60.0) return "Unknown" // washed-out / background, not a vivid type icon
    return when {
        hue < 10.0 || hue >= 170.0 -> "Stamina" // red
        hue < 22.0 -> "Power" // orange
        hue in 35.0..85.0 -> "Wit" // green
        hue in 95.0..130.0 -> "Speed" // blue
        else -> "Unknown" // Guts (pink/rose) and Friend bands not yet calibrated
    }
}

/**
 * Counts filled limit-break pips from per-pip fill ratios. A limit break shows up to four diamonds; filled diamonds are vividly
 * colored (high fill), empty ones are gray (low fill).
 *
 * @param fillRatios Per-pip colored-pixel fraction, in pip order.
 * @param threshold Minimum fraction for a pip to count as filled.
 * @return The number of filled pips (0-4), clamped to the count provided.
 */
fun pipCountFromFills(fillRatios: List<Double>, threshold: Double = 0.4): Int = fillRatios.count { it >= threshold }

/** Normalizes an OCR'd rarity token to "SSR"/"SR"/"R", or "" when unrecognized. */
fun normalizeRarity(raw: String): String {
    val t = raw.trim().uppercase().replace(" ", "")
    return when {
        t.contains("SSR") -> "SSR"
        t.contains("SR") -> "SR"
        t == "R" || t.startsWith("R") -> "R"
        else -> ""
    }
}
