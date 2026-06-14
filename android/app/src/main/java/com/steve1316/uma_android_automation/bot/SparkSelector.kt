package com.steve1316.uma_android_automation.bot

import android.graphics.Bitmap
import com.steve1316.automation_library.data.SharedData
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.bot.Game
import com.steve1316.uma_android_automation.components.ButtonInheritance
import org.opencv.core.Point

/**
 * Reads the three inheritance spark options and taps the best match before confirming inheritance.
 */
object SparkSelector {
    private const val TAG = "SparkSelector"

    /** Horizontal centers for the three spark cards (fraction of screen width). */
    private val SPARK_SLOT_X_FRACTIONS = doubleArrayOf(0.22, 0.50, 0.78)

    /** Vertical center for spark option cards (fraction of screen height). */
    private const val SPARK_SLOT_Y_FRACTION = 0.45

    /** OCR crop width as a fraction of screen width. */
    private const val OCR_WIDTH_FRACTION = 0.28

    /** OCR crop height as a fraction of screen height. */
    private const val OCR_HEIGHT_FRACTION = 0.14

    /**
     * OCRs each spark slot, scores options, and taps the best card.
     *
     * @param game Active game session.
     * @param sourceBitmap Screenshot captured while the inheritance button is visible.
     * @return Zero-based index of the tapped spark, or 0 when strategy is `Default`.
     */
    fun selectAndTapBestSpark(game: Game, sourceBitmap: Bitmap): Int {
        val strategy = SettingsHelper.getStringSetting("racing", "sparkSelectionStrategy").ifEmpty { "Default" }
        if (strategy == "Default") {
            return 0
        }

        val context = buildContext(strategy)
        val imageUtils = game.imageUtils
        val scores = mutableListOf<Pair<Int, Double>>()

        val ocrWidth = (SharedData.displayWidth * OCR_WIDTH_FRACTION).toInt()
        val ocrHeight = (SharedData.displayHeight * OCR_HEIGHT_FRACTION).toInt()

        for (index in 0 until SPARK_SLOT_X_FRACTIONS.size) {
            val centerX = SharedData.displayWidth * SPARK_SLOT_X_FRACTIONS[index]
            val centerY = SharedData.displayHeight * SPARK_SLOT_Y_FRACTION
            val cropX = imageUtils.relX(centerX, -(ocrWidth / 2))
            val cropY = imageUtils.relY(centerY, -(ocrHeight / 2))

            val ocrText =
                imageUtils.performOCROnRegion(
                    sourceBitmap,
                    cropX,
                    cropY,
                    ocrWidth,
                    ocrHeight,
                    useThreshold = false,
                    useGrayscale = true,
                    scale = 1.0,
                    ocrEngine = "mlkit",
                    debugName = "inheritance_spark_option_${index + 1}",
                )

            val score = SparkSelectionScorer.score(ocrText, context)
            scores.add(index to score)
            MessageLog.i(TAG, "[SPARK] Option ${index + 1}: \"$ocrText\" (score=${"%.1f".format(score)})")
        }

        val bestIndex = scores.maxByOrNull { it.second }?.first ?: 0
        val tapX = SharedData.displayWidth * SPARK_SLOT_X_FRACTIONS[bestIndex]
        val tapY = SharedData.displayHeight * SPARK_SLOT_Y_FRACTION

        MessageLog.i(TAG, "[SPARK] Selecting option ${bestIndex + 1} using strategy \"$strategy\".")
        game.gestureUtils.tap(tapX, tapY, ButtonInheritance.template.path)
        game.wait(0.6)
        return bestIndex
    }

    private fun buildContext(strategy: String): SparkSelectionContext {
        val statPriorities = SettingsHelper.getStringArraySetting("training", "statPrioritization")
        val preferredDistance = SettingsHelper.getStringSetting("training", "preferredDistanceOverride").ifEmpty { "Auto" }
        val aptitudesJson = SettingsHelper.getStringSetting("racing", "smartRaceSolverAptitudes").ifEmpty { "{}" }
        val preferSkillHints = SettingsHelper.getBooleanSetting("training", "enablePrioritizeSkillHints", false)

        return SparkSelectionContext(
            strategy = strategy,
            statPriorities = statPriorities.ifEmpty { listOf("Speed", "Stamina", "Power", "Guts", "Wit") },
            aptitudePriorities = SparkSelectionScorer.buildAptitudePriorities(aptitudesJson, preferredDistance),
            preferSkillHints = preferSkillHints,
        )
    }
}
