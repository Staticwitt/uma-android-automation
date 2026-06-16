package com.steve1316.uma_android_automation.bot

import android.graphics.Bitmap
import com.steve1316.automation_library.data.SharedData
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.components.ButtonAutoSelect
import com.steve1316.uma_android_automation.components.ButtonBackGreen
import com.steve1316.uma_android_automation.components.ButtonSelectLegacy
import com.steve1316.uma_android_automation.components.Checkbox
import com.steve1316.uma_android_automation.components.DialogInterface
import com.steve1316.uma_android_automation.components.LabelEventProgress
import com.steve1316.uma_android_automation.utils.CustomImageUtils
import com.steve1316.uma_android_automation.utils.ScrollList
import com.steve1316.uma_android_automation.utils.ScrollListEntry
import com.steve1316.uma_android_automation.utils.ScrollListEntryDetectionConfig
import net.ricecode.similarity.JaroWinklerStrategy
import net.ricecode.similarity.StringSimilarityServiceImpl

/**
 * Auto-selects the legacy parent pair at career selection via the in-game Auto-Select button,
 * or by OCR-matching a configured two-parent priority list in the legacy picker.
 */
object LegacyParentSelector {
    private const val TAG = "[LEGACY_PARENT]"

    /** Horizontal centers for the two parent cards on career selection (fraction of screen width). */
    private val PARENT_SLOT_X_FRACTIONS = doubleArrayOf(0.28, 0.72)

    /** Vertical center for parent name OCR (fraction of screen height). */
    private const val PARENT_SLOT_Y_FRACTION = 0.36

    private const val OCR_WIDTH_FRACTION = 0.24
    private const val OCR_HEIGHT_FRACTION = 0.10
    private const val MIN_NAME_MATCH_SCORE = 0.82

    @Volatile private var autoSelectAttemptedThisRun = false

    private val similarity = StringSimilarityServiceImpl(JaroWinklerStrategy())

    fun resetForNewRun() {
        autoSelectAttemptedThisRun = false
    }

    fun isEnabled(): Boolean = SettingsHelper.getBooleanSetting("racing", "enableAutoSelectLegacyParents")

    /**
     * Opens legacy auto-select or picks a configured parent pair when career-selection controls are visible.
     *
     * @return True when a selection flow was initiated this iteration.
     */
    fun tryTriggerAutoSelect(game: Game): Boolean {
        if (!isEnabled() || autoSelectAttemptedThisRun) return false

        val preferredPair = readPreferredPair()
        if (preferredPair.isNotEmpty()) {
            val sourceBitmap = game.imageUtils.getSourceBitmap()
            if (parentSlotsMatch(game, sourceBitmap, preferredPair)) {
                autoSelectAttemptedThisRun = true
                MessageLog.i(TAG, "Legacy parent slots already match preferred pair: ${preferredPair.joinToString(" · ")}")
                return false
            }
            if (selectPreferredPair(game, preferredPair)) {
                autoSelectAttemptedThisRun = true
                return true
            }
            MessageLog.w(TAG, "Preferred parent pair selection failed; falling back to factor or in-game Auto-Select.")
        }

        if (LegacyParentScorer.isFactorSelectionEnabled()) {
            if (selectBestPairByStrategy(game)) {
                autoSelectAttemptedThisRun = true
                return true
            }
            MessageLog.w(TAG, "Factor-based parent selection failed; falling back to in-game Auto-Select.")
        }

        if (triggerGameAutoSelect(game)) {
            autoSelectAttemptedThisRun = true
            return true
        }
        return false
    }

    /** Confirms an Auto-Select or Confirm Auto-Select dialog (checkbox + OK). */
    fun confirmAutoSelectDialog(game: Game, dialog: DialogInterface): Boolean {
        Checkbox.click(game.imageUtils)
        if (dialog.ok(game.imageUtils)) {
            MessageLog.i(TAG, "Confirmed legacy parent auto-select dialog.")
            game.wait(0.8)
            return true
        }
        MessageLog.w(TAG, "Failed to confirm legacy parent auto-select dialog.")
        return false
    }

    private fun triggerGameAutoSelect(game: Game): Boolean {
        if (ButtonAutoSelect.check(game.imageUtils)) {
            if (ButtonAutoSelect.click(game.imageUtils)) {
                MessageLog.i(TAG, "Tapped in-game Auto-Select for legacy parents.")
                game.wait(1.0)
                return true
            }
            MessageLog.w(TAG, "Auto-Select button found but click failed.")
            return false
        }

        if (ButtonSelectLegacy.check(game.imageUtils)) {
            if (!ButtonSelectLegacy.click(game.imageUtils)) {
                MessageLog.w(TAG, "Select Legacy button found but click failed.")
                return false
            }
            game.wait(1.0)
            if (ButtonAutoSelect.check(game.imageUtils) && ButtonAutoSelect.click(game.imageUtils)) {
                MessageLog.i(TAG, "Opened legacy picker and tapped Auto-Select.")
                game.wait(1.0)
                return true
            }
            MessageLog.w(TAG, "Legacy picker opened but Auto-Select button was not found.")
            ButtonBackGreen.click(game.imageUtils)
        }
        return false
    }

    private fun selectPreferredPair(game: Game, preferredPair: List<String>): Boolean {
        if (!openLegacyPicker(game)) return false

        var allFound = true
        for (name in preferredPair.take(2)) {
            if (!findAndTapParentName(game, name)) {
                MessageLog.w(TAG, "Could not find legacy parent \"$name\" in picker list.")
                allFound = false
                break
            }
        }

        if (!allFound) {
            ButtonBackGreen.click(game.imageUtils)
            game.wait(0.5)
            return false
        }

        ButtonBackGreen.click(game.imageUtils)
        game.wait(0.8)
        MessageLog.i(TAG, "Selected preferred legacy parent pair: ${preferredPair.take(2).joinToString(" · ")}")
        return true
    }

    private fun selectBestPairByStrategy(game: Game): Boolean {
        if (!openLegacyPicker(game)) return false

        val context = LegacyParentScorer.contextFromSettings()
        val candidates = mutableListOf<Pair<ScrollListEntry, Double>>()
        ScrollList.processWithFallback(
            game,
            fallbackComponent = LabelEventProgress,
            entryDetectionConfig = ScrollListEntryDetectionConfig(bUseGeneric = true),
            keyExtractor = { entry -> ocrParentEntry(game.imageUtils, entry) },
            onEntry = { _, entry ->
                val text = ocrParentEntry(game.imageUtils, entry)
                if (ocrLooksLikeTrainee(text)) return@processWithFallback false
                val score = LegacyParentScorer.score(text, context)
                if (score > 0.0) {
                    candidates.add(entry to score)
                }
                false
            },
        )

        val topEntries =
            candidates
                .sortedByDescending { it.second }
                .distinctBy { (entry, _) -> ocrParentEntry(game.imageUtils, entry) }
                .take(2)

        if (topEntries.isEmpty()) {
            ButtonBackGreen.click(game.imageUtils)
            game.wait(0.5)
            return false
        }

        for ((entry, score) in topEntries) {
            val text = ocrParentEntry(game.imageUtils, entry)
            MessageLog.i(TAG, "Selecting legacy parent by factors (score=$score, ocr=\"$text\").")
            game.tap(entry.bbox.cx.toDouble(), entry.bbox.cy.toDouble())
            game.wait(0.8)
        }

        ButtonBackGreen.click(game.imageUtils)
        game.wait(0.8)
        MessageLog.i(TAG, "Selected ${topEntries.size} legacy parent(s) using ${context.strategy} strategy.")
        return true
    }

    private fun openLegacyPicker(game: Game): Boolean {
        if (ButtonSelectLegacy.check(game.imageUtils)) {
            if (ButtonSelectLegacy.click(game.imageUtils)) {
                game.wait(1.0)
                return true
            }
            return false
        }
        // Already inside the legacy picker (Auto-Select visible without Select Legacy).
        return ButtonAutoSelect.check(game.imageUtils)
    }

    private fun findAndTapParentName(game: Game, name: String): Boolean {
        if (SupportCardSelection.isTraineeCharacter(name)) {
            MessageLog.w(TAG, "Refusing to select trainee \"$name\" as legacy parent.")
            return false
        }
        var tapped = false
        ScrollList.processWithFallback(
            game,
            fallbackComponent = LabelEventProgress,
            entryDetectionConfig = ScrollListEntryDetectionConfig(bUseGeneric = true),
            keyExtractor = { entry -> ocrParentEntry(game.imageUtils, entry) },
            onEntry = { _, entry ->
                val text = ocrParentEntry(game.imageUtils, entry)
                val score = matchScore(text, name)
                if (score >= MIN_NAME_MATCH_SCORE) {
                    MessageLog.i(TAG, "Tapping legacy parent \"$name\" (score=$score, ocr=\"$text\").")
                    game.tap(entry.bbox.cx.toDouble(), entry.bbox.cy.toDouble())
                    game.wait(0.8)
                    tapped = true
                    true
                } else {
                    false
                }
            },
        )
        return tapped
    }

    private fun parentSlotsMatch(game: Game, sourceBitmap: Bitmap, preferredPair: List<String>): Boolean {
        val slotTexts = readParentSlotTexts(game, sourceBitmap)
        if (slotTexts.size < preferredPair.size) return false
        return preferredPair.indices.all { index ->
            matchScore(slotTexts[index], preferredPair[index]) >= MIN_NAME_MATCH_SCORE
        }
    }

    private fun readParentSlotTexts(game: Game, sourceBitmap: Bitmap): List<String> {
        val imageUtils = game.imageUtils
        val ocrWidth = (SharedData.displayWidth * OCR_WIDTH_FRACTION).toInt()
        val ocrHeight = (SharedData.displayHeight * OCR_HEIGHT_FRACTION).toInt()
        return PARENT_SLOT_X_FRACTIONS.map { xFraction ->
            val centerX = SharedData.displayWidth * xFraction
            val centerY = SharedData.displayHeight * PARENT_SLOT_Y_FRACTION
            val cropX = imageUtils.relX(centerX, -(ocrWidth / 2))
            val cropY = imageUtils.relY(centerY, -(ocrHeight / 2))
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
                debugName = "legacy_parent_slot_${xFraction}",
            )
        }
    }

    private fun ocrParentEntry(imageUtils: CustomImageUtils, entry: ScrollListEntry): String =
        imageUtils.performOCROnRegion(
            entry.bitmap,
            0,
            0,
            entry.bitmap.width,
            entry.bitmap.height,
            useThreshold = false,
            useGrayscale = true,
            scale = 2.0,
            ocrEngine = "tesseract",
            debugName = "legacy_parent_list_entry",
        ).lowercase()

    private fun matchScore(ocrText: String, name: String): Double {
        val normalizedOcr = ocrText.lowercase()
        val needle = name.lowercase()
        if (!ocrMightMatchName(normalizedOcr, needle)) return 0.0
        return when {
            normalizedOcr.contains(needle) -> 1.0
            else -> similarity.score(needle, normalizedOcr)
        }
    }

    private fun ocrMightMatchName(normalizedOcr: String, needle: String): Boolean {
        if (needle.isEmpty()) return false
        if (normalizedOcr.contains(needle)) return true
        if (needle.length < 3) return true
        for (i in 0..needle.length - 3) {
            if (normalizedOcr.contains(needle.substring(i, i + 3))) return true
        }
        return false
    }

    private fun readPreferredPair(): List<String> =
        SupportCardSelection.filterTraineeFromSupportNames(
            SupportCardSelection.readStringList(
                SettingsHelper.getStringSetting("racing", "legacyParentPreferredPair"),
            ),
        )

    private fun ocrLooksLikeTrainee(ocrText: String): Boolean {
        val trainee = SettingsHelper.getStringSetting("racing", "smartRaceSolverCharacterPreset").trim()
        if (trainee.isEmpty()) return false
        return SupportCardSelection.matchScore(ocrText, trainee) >= MIN_NAME_MATCH_SCORE
    }
}
