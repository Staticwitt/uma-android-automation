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

        if (isFriendSupportSatisfied(game, preferredNames)) {
            borrowCompletedThisRun = true
            MessageLog.i(TAG, "Friend support already matches borrow list; skipping borrow dialog.")
            return false
        }

        if (!CareerSelectionAutomation.isOnCareerSelectionScreen(game)) return false

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
     * OCRs visible borrow slots and taps the best match from preferred names.
     *
     * @return True when a card was selected.
     */
    fun selectPreferredCard(game: Game, sourceBitmap: Bitmap): Boolean {
        val preferredNames = preferredNames()
        if (preferredNames.isEmpty()) {
            MessageLog.w(TAG, "No preferred support cards configured; skipping borrow selection.")
            return false
        }

        val imageUtils = game.imageUtils
        var bestSlot = -1
        var bestScore = 0.0
        var bestName = ""
        var bestText = ""

        for (index in CARD_SLOT_X_FRACTIONS.indices) {
            val centerX = SharedData.displayWidth * CARD_SLOT_X_FRACTIONS[index]
            val centerY = SharedData.displayHeight * CARD_SLOT_Y_FRACTION
            val ocrText =
                SupportCardSelection.ocrRegion(
                    imageUtils,
                    sourceBitmap,
                    centerX,
                    centerY,
                    OCR_WIDTH_FRACTION,
                    OCR_HEIGHT_FRACTION,
                    "support_borrow_slot_$index",
                )
            for (name in preferredNames) {
                if (SupportCardSelection.isTraineeCharacter(name)) continue
                val score = SupportCardSelection.matchScore(ocrText, name)
                if (score > bestScore) {
                    bestScore = score
                    bestSlot = index
                    bestName = name
                    bestText = ocrText
                }
            }
        }

        if (bestSlot < 0 || bestScore < SupportCardSelection.MIN_NAME_MATCH_SCORE) {
            MessageLog.w(
                TAG,
                "No borrow match above threshold (best=$bestScore for \"$bestText\"). Preferred: ${preferredNames.joinToString()}",
            )
            if (SettingsHelper.getBooleanSetting("racing", "enableParentFarmingBorrowIntelligence", true)) {
                for (name in preferredNames) {
                    if (SupportCardSelection.findAndTapCardInList(game, name, TAG)) {
                        return true
                    }
                }
                SupportCardSelection.dismissListPicker(game)
            }
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
            borrowCompletedThisRun = true
            MessageLog.i(TAG, "Confirmed support card borrow.")
            game.waitForLoading()
            return true
        }
        MessageLog.w(TAG, "Failed to confirm support card borrow.")
        return false
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
        return preferredNames.any { name ->
            SupportCardSelection.matchScore(ocrText, name) >= SupportCardSelection.MIN_NAME_MATCH_SCORE
        }
    }
}
