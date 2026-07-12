package com.steve1316.uma_android_automation.utils

/**
 * A measured rainbow-ring color sample: the fraction of the glow annulus falling in each of the three pastel hue bands, as
 * produced by `CustomImageUtils.detectRainbowRing`. Used to auto-fit per-device detection thresholds from labeled captures.
 *
 * @property green Fraction of the annulus in the green band.
 * @property cyan Fraction in the cyan band.
 * @property pink Fraction in the pink band.
 */
data class RingHueSample(val green: Double, val cyan: Double, val pink: Double) {
    /** The most-present (dominant) hue fraction. */
    val dominant: Double get() = maxOf(green, cyan, pink)

    /** The least-present hue fraction. All three must clear the floor for a ring, so this is what the floor is measured against. */
    val minHue: Double get() = minOf(green, cyan, pink)
}

/**
 * A fitted rainbow-detection threshold pair for the per-hue presence floor and the dominant-hue floor. Feeds the same rule
 * `detectRainbowRing` applies (all three hues at/above the floor, plus one dominant hue at/above the threshold), but tuned to a
 * specific device's color rendering instead of the hardcoded defaults.
 *
 * @property perHueFloor Minimum fraction each of the three hues must reach to count as present.
 * @property dominantThreshold Minimum fraction the dominant hue must reach.
 * @property separable True when these thresholds perfectly classify every labeled positive and negative.
 * @property margin The smaller of the two separating gaps (hue-floor gap, dominant gap); higher = more confident. 0 when not separable.
 */
data class RainbowCalibration(
    val perHueFloor: Double,
    val dominantThreshold: Double,
    val separable: Boolean,
    val margin: Double,
)

/**
 * Fits per-device rainbow-detection thresholds from labeled sample captures. The calibration wizard collects a handful of
 * training-screen frames the user marks as "rainbow" (positives) and "not rainbow" (negatives); this finds the per-hue floor and
 * dominant threshold that best separate them, and reports whether/how cleanly they separate. Pure and unit-testable; the on-device
 * capture flow that produces the samples is a separate concern.
 */
object RainbowCalibrator {
    // Sane bounds so a degenerate sample set cannot produce absurd thresholds.
    private const val FLOOR_MIN = 0.01
    private const val FLOOR_MAX = 0.20
    private const val DOM_MIN = 0.03
    private const val DOM_MAX = 0.30

    /** The current hardcoded production thresholds, used as the fallback when there is nothing to fit against. */
    val DEFAULT = RainbowCalibration(perHueFloor = 0.045, dominantThreshold = 0.085, separable = true, margin = 0.0)

    private fun clamp(v: Double, lo: Double, hi: Double): Double = maxOf(lo, minOf(hi, v))

    private fun midpoint(lo: Double, hi: Double): Double = if (hi > lo) (lo + hi) / 2.0 else hi

    /**
     * Applies a calibration's rule to a sample: a ring needs all three hues at/above the floor and one dominant hue at/above the threshold.
     *
     * @param sample The measured ring sample.
     * @param cal The calibration to apply.
     * @return True when the sample would be detected as a rainbow under this calibration.
     */
    fun classifyAsRainbow(sample: RingHueSample, cal: RainbowCalibration): Boolean =
        sample.green >= cal.perHueFloor &&
            sample.cyan >= cal.perHueFloor &&
            sample.pink >= cal.perHueFloor &&
            sample.dominant >= cal.dominantThreshold

    /**
     * Fits thresholds that best separate known rainbow rings from look-alikes.
     *
     * The floor is kept at or below the weakest hue seen across positives (so every positive still reads three hues) and pushed up
     * to exclude negatives whose weakest hue sits below that ceiling. Negatives that cannot be excluded on the hue axis (their
     * weakest hue is as strong as a positive's) are instead excluded on the dominant axis. When there is no negative pressure on an
     * axis, that threshold stays at the conservative default rather than drifting arbitrarily low.
     *
     * @param positives Samples the user labeled as real rainbow rings.
     * @param negatives Samples the user labeled as look-alikes (not rings).
     * @return The fitted calibration, or [DEFAULT] when there are no positives to anchor the fit.
     */
    fun fitThresholds(positives: List<RingHueSample>, negatives: List<RingHueSample>): RainbowCalibration {
        if (positives.isEmpty()) return DEFAULT

        val posFloorCeil = positives.minOf { it.minHue } // floor must stay <= this to keep every positive at three hues
        val posDomCeil = positives.minOf { it.dominant } // dominant threshold must stay <= this to keep every positive

        // Hue-floor axis: exclude negatives whose weakest hue is below the positive ceiling by lifting the floor just above them.
        val floorCatchable = negatives.filter { it.minHue < posFloorCeil }
        val negFloorFloor = floorCatchable.maxOfOrNull { it.minHue } ?: 0.0
        val perHueFloor =
            if (floorCatchable.isEmpty()) {
                clamp(minOf(DEFAULT.perHueFloor, posFloorCeil), FLOOR_MIN, FLOOR_MAX)
            } else {
                clamp(midpoint(negFloorFloor, posFloorCeil), FLOOR_MIN, FLOOR_MAX)
            }

        // Dominant axis: negatives the floor cannot catch (their weakest hue is as strong as a positive's) must fall below the threshold.
        val uncaught = negatives.filter { it.minHue >= posFloorCeil }
        val negDomCeil = uncaught.maxOfOrNull { it.dominant } ?: 0.0
        val dominantThreshold =
            if (uncaught.isEmpty()) {
                clamp(minOf(DEFAULT.dominantThreshold, posDomCeil), DOM_MIN, DOM_MAX)
            } else {
                clamp(midpoint(negDomCeil, posDomCeil), DOM_MIN, DOM_MAX)
            }

        val fitted = RainbowCalibration(perHueFloor, dominantThreshold, separable = false, margin = 0.0)
        val allPositivesPass = positives.all { classifyAsRainbow(it, fitted) }
        val allNegativesRejected = negatives.none { classifyAsRainbow(it, fitted) }
        val separable = allPositivesPass && allNegativesRejected
        val margin = if (separable) maxOf(0.0, minOf(posFloorCeil - negFloorFloor, posDomCeil - negDomCeil)) else 0.0
        return fitted.copy(separable = separable, margin = margin)
    }
}
