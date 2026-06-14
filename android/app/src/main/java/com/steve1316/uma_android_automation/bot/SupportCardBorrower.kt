package com.steve1316.uma_android_automation.bot

import android.graphics.Bitmap
import com.steve1316.automation_library.data.SharedData
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.components.ButtonBorrowSupportCard
import com.steve1316.uma_android_automation.components.ButtonOk
import net.ricecode.similarity.JaroWinklerStrategy
import net.ricecode.similarity.StringSimilarityServiceImpl
import org.json.JSONArray

/**
 * Auto-borrows a friend support card at career selection using OCR + preset priority lists from React Native settings.
 */
object SupportCardBorrower {
    private const val TAG = "[SUPPORT_BORROW]"

    /** Horizontal centers for support cards in the borrow dialog (fraction of screen width). */
    private val CARD_SLOT_X_FRACTIONS = doubleArrayOf(0.18, 0.38, 0.58, 0.78)

    /** Vertical center for card name OCR (fraction of screen height). */
    private const val CARD_SLOT_Y_FRACTION = 0.52

    private const val OCR_WIDTH_FRACTION = 0.22
    private const val OCR_HEIGHT_FRACTION = 0.10

    private const val MIN_NAME_MATCH_SCORE = 0.82

    @Volatile private var borrowAttemptedThisRun = false

    private val similarity = StringSimilarityServiceImpl(JaroWinklerStrategy())

    fun resetForNewRun() {
        borrowAttemptedThisRun = false
    }

    fun isEnabled(): Boolean = SettingsHelper.getBooleanSetting("racing", "enableAutoBorrowSupportCard")

    /**
     * Opens the borrow flow when the career-selection button is visible.
     *
     * @return True when borrow was initiated or already completed this run.
     */
    fun tryOpenBorrowDialog(game: Game): Boolean {
        if (!isEnabled() || borrowAttemptedThisRun) return false
        if (!ButtonBorrowSupportCard.check(game.imageUtils)) return false

        borrowAttemptedThisRun = true
        if (ButtonBorrowSupportCard.click(game.imageUtils)) {
            MessageLog.i(TAG, "Opened Borrow Card dialog.")
            game.wait(1.0)
            return true
        }
        MessageLog.w(TAG, "Borrow support card button found but click failed.")
        return false
    }

    /**
     * OCRs visible borrow slots and taps the best match from [readPreferredNames].
     *
     * @return True when a card was selected.
     */
    fun selectPreferredCard(game: Game, sourceBitmap: Bitmap): Boolean {
        val preferredNames = readPreferredNames()
        if (preferredNames.isEmpty()) {
            MessageLog.w(TAG, "No preferred support cards configured; skipping borrow selection.")
            return false
        }

        val imageUtils = game.imageUtils
        val ocrWidth = (SharedData.displayWidth * OCR_WIDTH_FRACTION).toInt()
        val ocrHeight = (SharedData.displayHeight * OCR_HEIGHT_FRACTION).toInt()
        var bestSlot = -1
        var bestScore = 0.0
        var bestName = ""
        var bestText = ""

        for (index in CARD_SLOT_X_FRACTIONS.indices) {
            val centerX = SharedData.displayWidth * CARD_SLOT_X_FRACTIONS[index]
            val centerY = SharedData.displayHeight * CARD_SLOT_Y_FRACTION
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
                    scale = 2.0,
                    ocrEngine = "tesseract",
                    debugName = "support_borrow_slot_$index",
                )
            val normalizedOcr = ocrText.lowercase()
            for (name in preferredNames) {
                val needle = name.lowercase()
                if (!ocrMightMatchName(normalizedOcr, needle)) continue
                val score =
                    when {
                        normalizedOcr.contains(needle) -> 1.0
                        else -> similarity.score(needle, normalizedOcr)
                    }
                if (score > bestScore) {
                    bestScore = score
                    bestSlot = index
                    bestName = name
                    bestText = ocrText
                }
            }
        }

        if (bestSlot < 0 || bestScore < MIN_NAME_MATCH_SCORE) {
            MessageLog.w(
                TAG,
                "No borrow match above threshold (best=$bestScore for \"$bestText\"). Preferred: ${preferredNames.joinToString()}",
            )
            return false
        }

        val tapX = SharedData.displayWidth * CARD_SLOT_X_FRACTIONS[bestSlot]
        val tapY = SharedData.displayHeight * (CARD_SLOT_Y_FRACTION + 0.08)
        MessageLog.i(TAG, "Selecting support \"$bestName\" (slot $bestSlot, score=$bestScore, ocr=\"$bestText\").")
        game.tap(tapX, tapY, taps = 1)
        game.wait(0.8)
        return true
    }

    fun confirmBorrow(game: Game): Boolean {
        if (ButtonOk.click(game.imageUtils)) {
            MessageLog.i(TAG, "Confirmed support card borrow.")
            game.waitForLoading()
            return true
        }
        MessageLog.w(TAG, "Failed to confirm support card borrow.")
        return false
    }

    /** Skips expensive similarity when OCR text shares no token overlap with the support name. */
    private fun ocrMightMatchName(normalizedOcr: String, needle: String): Boolean {
        if (needle.isEmpty()) return false
        if (normalizedOcr.contains(needle)) return true
        if (needle.length < 3) return true
        for (i in 0..needle.length - 3) {
            if (normalizedOcr.contains(needle.substring(i, i + 3))) return true
        }
        return false
    }

    private fun readPreferredNames(): List<String> {
        val json = SettingsHelper.getStringSetting("racing", "supportBorrowPreferredCards")
        if (json.isEmpty()) return emptyList()
        return runCatching {
            val array = JSONArray(json)
            buildList {
                for (i in 0 until array.length()) {
                    val value = array.optString(i)
                    if (value.isNotBlank()) add(value)
                }
            }
        }.getOrElse { emptyList() }
    }
}
