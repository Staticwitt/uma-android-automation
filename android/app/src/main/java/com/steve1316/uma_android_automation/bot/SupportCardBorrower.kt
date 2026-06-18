package com.steve1316.uma_android_automation.bot

import android.graphics.Bitmap
import com.steve1316.automation_library.data.SharedData
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.components.ButtonBorrowSupportCard
import com.steve1316.uma_android_automation.components.ButtonOk

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

    /** Friend borrow slot on career selection (right of the four owned slots). */
    private const val FRIEND_SLOT_X_FRACTION = 0.86
    private const val FRIEND_SLOT_Y_FRACTION = 0.56
    private const val FRIEND_SLOT_OCR_WIDTH_FRACTION = 0.16
    private const val FRIEND_SLOT_OCR_HEIGHT_FRACTION = 0.08

    @Volatile private var borrowCompletedThisRun = false

    internal data class BorrowSlotMatch(
        val slot: Int,
        val name: String,
        val score: Double,
        val ocrText: String,
    )

    fun resetForNewRun() {
        borrowCompletedThisRun = false
    }

    fun isEnabled(): Boolean = SettingsHelper.getBooleanSetting("racing", "enableAutoBorrowSupportCard")

    /**
     * Opens the borrow flow when the career-selection button is visible.
     *
     * @return True when borrow was initiated this iteration.
     */
    fun tryOpenBorrowDialog(game: Game): Boolean {
        if (!isEnabled() || borrowCompletedThisRun) return false

        val preferredNames = preferredNames()
        if (preferredNames.isEmpty()) {
            MessageLog.w(TAG, "No preferred support cards configured; skipping borrow.")
            return false
        }

        if (!CareerSelectionAutomation.isOnCareerSelectionScreen(game)) return false

        if (isFriendSupportSatisfied(game, preferredNames)) {
            borrowCompletedThisRun = true
            MessageLog.i(TAG, "Friend support already matches borrow list; skipping borrow dialog.")
            return false
        }

        if (!ButtonBorrowSupportCard.check(game.imageUtils)) return false

        val owned = SupportCardSelection.readStringList(SettingsHelper.getStringSetting("racing", "supportDeckOwnedCards"))
        if (owned.isNotEmpty() && !OwnedSupportDeckEquipper.isEnabled()) {
            MessageLog.i(TAG, "Recommended owned slots (equip manually or enable auto-equip): ${owned.joinToString(" · ")}")
        }
        if (ButtonBorrowSupportCard.click(game.imageUtils)) {
            MessageLog.i(TAG, "Opened Borrow Card dialog.")
            game.wait(1.0)
            return true
        }
        MessageLog.w(TAG, "Borrow support card button found but click failed.")
        return false
    }

    /**
     * OCRs visible borrow slots and taps the first preferred-name match in list order.
     *
     * @return True when a card was selected.
     */
    fun selectPreferredCard(game: Game, sourceBitmap: Bitmap): Boolean {
        val preferredNames = preferredNames()
        if (preferredNames.isEmpty()) {
            MessageLog.w(TAG, "No preferred support cards configured; skipping borrow selection.")
            return false
        }

        val slotOcrTexts = ocrBorrowSlotTexts(game, sourceBitmap)
        val match = pickPriorityBorrowSlot(slotOcrTexts, preferredNames)

        if (match == null) {
            val bestScore =
                preferredNames.maxOfOrNull { name ->
                    slotOcrTexts.maxOfOrNull { text -> SupportCardSelection.matchScore(text, name) } ?: 0.0
                } ?: 0.0
            MessageLog.w(
                TAG,
                "No borrow match above threshold (best=$bestScore). Preferred: ${preferredNames.joinToString()}",
            )
            if (SettingsHelper.getBooleanSetting("racing", "enableParentFarmingBorrowIntelligence", true)) {
                if (SupportCardSelection.findAndTapPreferredCardInList(game, preferredNames, TAG) != null) {
                    return true
                }
                SupportCardSelection.dismissListPicker(game)
            }
            return false
        }

        val tapX = SharedData.displayWidth * CARD_SLOT_X_FRACTIONS[match.slot]
        val tapY = SharedData.displayHeight * (CARD_SLOT_Y_FRACTION + 0.08)
        MessageLog.i(
            TAG,
            "Selecting support \"${match.name}\" (slot ${match.slot}, score=${match.score}, ocr=\"${match.ocrText}\").",
        )
        game.tap(tapX, tapY, taps = 1)
        game.wait(0.8)
        return true
    }

    /** Walks preferred names in order and returns the first slot that meets the match threshold. */
    internal fun pickPriorityBorrowSlot(
        slotOcrTexts: List<String>,
        preferredNames: List<String>,
    ): BorrowSlotMatch? {
        for (name in preferredNames) {
            if (SupportCardSelection.isTraineeCharacter(name)) continue
            for (index in slotOcrTexts.indices) {
                val ocrText = slotOcrTexts[index]
                val score = SupportCardSelection.matchScore(ocrText, name)
                if (score >= SupportCardSelection.MIN_NAME_MATCH_SCORE) {
                    return BorrowSlotMatch(index, name, score, ocrText)
                }
            }
        }
        return null
    }

    fun confirmBorrow(game: Game): Boolean {
        if (ButtonOk.click(game.imageUtils)) {
            borrowCompletedThisRun = true
            MessageLog.i(TAG, "Confirmed support card borrow.")
            game.waitForLoading()
            return true
        }
        MessageLog.w(TAG, "Failed to confirm support card borrow.")
        return false
    }

    private fun ocrBorrowSlotTexts(game: Game, sourceBitmap: Bitmap): List<String> {
        val imageUtils = game.imageUtils
        return CARD_SLOT_X_FRACTIONS.indices.map { index ->
            val centerX = SharedData.displayWidth * CARD_SLOT_X_FRACTIONS[index]
            val centerY = SharedData.displayHeight * CARD_SLOT_Y_FRACTION
            SupportCardSelection.ocrRegion(
                imageUtils,
                sourceBitmap,
                centerX,
                centerY,
                OCR_WIDTH_FRACTION,
                OCR_HEIGHT_FRACTION,
                "support_borrow_slot_$index",
            )
        }
    }

    private fun preferredNames(): List<String> =
        rotatedPreferredNames(
            SupportCardSelection.filterTraineeFromSupportNames(
                SupportCardSelection.readStringList(
                    SettingsHelper.getStringSetting("racing", "supportBorrowPreferredCards"),
                ),
            ),
        )

    private fun rotatedPreferredNames(names: List<String>): List<String> {
        if (names.isEmpty()) return names
        if (!SettingsHelper.getBooleanSetting("racing", "enableParentFarmingBorrowRotation", false)) return names
        val offset = ParentFarmingRunLoop.borrowRotationOffset() % names.size
        if (offset == 0) return names
        return names.drop(offset) + names.take(offset)
    }

    /** True when the friend slot on career selection already shows a preferred borrow card. */
    internal fun isFriendSupportSatisfied(game: Game, preferredNames: List<String>): Boolean {
        if (preferredNames.isEmpty()) return false
        val imageUtils = game.imageUtils
        val centerX = SharedData.displayWidth * FRIEND_SLOT_X_FRACTION
        val centerY = SharedData.displayHeight * FRIEND_SLOT_Y_FRACTION
        val ocrText =
            SupportCardSelection.ocrRegion(
                imageUtils,
                imageUtils.getSourceBitmap(),
                centerX,
                centerY,
                FRIEND_SLOT_OCR_WIDTH_FRACTION,
                FRIEND_SLOT_OCR_HEIGHT_FRACTION,
                "friend_support_slot",
            )
        return SupportCardSelection.firstMatchingPreferredName(ocrText, preferredNames) != null
    }
}
