package com.steve1316.uma_android_automation.utils

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

/**
 * Unit tests for the per-device rainbow-detection threshold fitter. Uses real on-device hue samples captured during debugging so
 * the fit is validated against the exact separation problem the calibration wizard exists to solve.
 */
@DisplayName("Rainbow detection threshold fitting")
class RainbowCalibratorTest {
    @Test
    @DisplayName("Fits a separating floor/dominant pair for clearly-labeled samples and classifies them all correctly")
    fun testClearlySeparable() {
        val positives =
            listOf(
                RingHueSample(green = 0.070, cyan = 0.130, pink = 0.170),
                RingHueSample(green = 0.060, cyan = 0.090, pink = 0.140),
                RingHueSample(green = 0.100, cyan = 0.130, pink = 0.130),
            )
        val negatives =
            listOf(
                RingHueSample(green = 0.003, cyan = 0.014, pink = 0.000), // a support face with no glow
                RingHueSample(green = 0.020, cyan = 0.220, pink = 0.000), // a strong cyan art element
                RingHueSample(green = 0.058, cyan = 0.037, pink = 0.043), // the known false positive (dominant 0.058)
            )

        val cal = RainbowCalibrator.fitThresholds(positives, negatives)

        assertTrue(cal.separable, "These positives and negatives are cleanly separable")
        assertTrue(cal.perHueFloor > 0.037 && cal.perHueFloor <= 0.06, "Floor sits between the strongest catchable negative and the weakest positive hue")
        positives.forEach { assertTrue(RainbowCalibrator.classifyAsRainbow(it, cal), "Every positive must be detected: $it") }
        negatives.forEach { assertFalse(RainbowCalibrator.classifyAsRainbow(it, cal), "Every negative must be rejected: $it") }
        assertTrue(cal.margin > 0.0, "A separable fit reports a positive margin")
    }

    @Test
    @DisplayName("Separates on the dominant axis when negatives are as hue-present as positives")
    fun testDominantAxisSeparation() {
        // Negatives here have all three hues present (so the floor cannot exclude them); only their weak dominant hue distinguishes them.
        val positives = listOf(RingHueSample(0.05, 0.20, 0.20), RingHueSample(0.06, 0.15, 0.15))
        val negatives = listOf(RingHueSample(0.06, 0.06, 0.06))

        val cal = RainbowCalibrator.fitThresholds(positives, negatives)

        assertTrue(cal.separable, "A low-dominant look-alike is separable on the dominant axis")
        assertTrue(cal.dominantThreshold > 0.06 && cal.dominantThreshold <= 0.15, "Dominant threshold lands between the negative and the weakest positive")
        assertTrue(RainbowCalibrator.classifyAsRainbow(positives[0], cal))
        assertFalse(RainbowCalibrator.classifyAsRainbow(negatives[0], cal))
    }

    @Test
    @DisplayName("Reports a thin-but-separable fit for the real device case where a real ring's pink hue dips low")
    fun testThinSeparation() {
        // The pass-2 miss: a real ring whose pink dipped to 0.024, vs a cyan-art element whose green is 0.015.
        val positives = listOf(RingHueSample(green = 0.069, cyan = 0.087, pink = 0.024))
        val negatives = listOf(RingHueSample(green = 0.015, cyan = 0.270, pink = 0.028))

        val cal = RainbowCalibrator.fitThresholds(positives, negatives)

        assertTrue(cal.separable, "The real ring and the cyan-art element are (thinly) separable")
        assertTrue(RainbowCalibrator.classifyAsRainbow(positives[0], cal), "The previously-missed real ring is now detected")
        assertFalse(RainbowCalibrator.classifyAsRainbow(negatives[0], cal), "The cyan-art element is still rejected")
        assertTrue(cal.margin < 0.02, "The fit honestly reports a thin margin")
    }

    @Test
    @DisplayName("Falls back to the production defaults when there are no positives to anchor the fit")
    fun testNoPositivesReturnsDefault() {
        val cal = RainbowCalibrator.fitThresholds(emptyList(), listOf(RingHueSample(0.0, 0.2, 0.0)))
        assertEquals(RainbowCalibrator.DEFAULT.perHueFloor, cal.perHueFloor, 1e-9)
        assertEquals(RainbowCalibrator.DEFAULT.dominantThreshold, cal.dominantThreshold, 1e-9)
    }

    @Test
    @DisplayName("Reports non-separable when a negative is indistinguishable from a positive")
    fun testNonSeparable() {
        val positives = listOf(RingHueSample(0.05, 0.05, 0.05))
        val negatives = listOf(RingHueSample(0.05, 0.05, 0.05))
        val cal = RainbowCalibrator.fitThresholds(positives, negatives)
        assertFalse(cal.separable, "Identical positive and negative cannot be separated")
        assertEquals(0.0, cal.margin, 1e-9)
    }

    @Test
    @DisplayName("Keeps the dominant threshold at the conservative default when no negative pressures that axis")
    fun testNoDominantPressureKeepsDefault() {
        // All negatives are excluded on the hue axis, so the dominant axis is unconstrained and should hold near the default.
        val positives = listOf(RingHueSample(0.06, 0.12, 0.15))
        val negatives = listOf(RingHueSample(0.0, 0.10, 0.0))
        val cal = RainbowCalibrator.fitThresholds(positives, negatives)
        assertEquals(RainbowCalibrator.DEFAULT.dominantThreshold, cal.dominantThreshold, 1e-9)
    }
}
