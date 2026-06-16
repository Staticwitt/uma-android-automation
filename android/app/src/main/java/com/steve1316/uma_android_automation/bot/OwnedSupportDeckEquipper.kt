package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.data.SharedData
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper

/**
 * Auto-equips the four owned support slots at career selection using OCR on slot labels
 * and scroll-list matching in the support picker.
 */
object OwnedSupportDeckEquipper {
    private const val TAG = "[OWNED_SUPPORT]"

    /** Horizontal centers for owned support slots on career selection (fraction of screen width). */
    private val OWNED_SLOT_X_FRACTIONS = doubleArrayOf(0.14, 0.32, 0.50, 0.68)

    /** Vertical center for owned slot OCR/taps (fraction of screen height). */
    private const val OWNED_SLOT_Y_FRACTION = 0.56

    private const val OCR_WIDTH_FRACTION = 0.16
    private const val OCR_HEIGHT_FRACTION = 0.08

    @Volatile private var equipAttemptedThisRun = false

    fun resetForNewRun() {
        equipAttemptedThisRun = false
    }

    fun isEnabled(): Boolean = SettingsHelper.getBooleanSetting("racing", "enableAutoEquipOwnedSupportDeck")

    /**
     * Equips configured owned supports when career-selection slots are visible.
     *
     * @return True when equipping was attempted or already done this run.
     */
    fun tryEquipOwnedDeck(game: Game): Boolean {
        if (!isEnabled() || equipAttemptedThisRun) return false

        val ownedCards =
            SupportCardSelection.filterTraineeFromSupportNames(
                SupportCardSelection.readStringList(
                    SettingsHelper.getStringSetting("racing", "supportDeckOwnedCards"),
                ),
            )
        if (ownedCards.isEmpty()) return false

        if (!CareerSelectionAutomation.isOnCareerSelectionScreen(game)) return false

        equipAttemptedThisRun = true
        MessageLog.i(TAG, "Equipping owned support deck: ${ownedCards.joinToString(" · ")}")

        val imageUtils = game.imageUtils
        val sourceBitmap = imageUtils.getSourceBitmap()
        var equippedCount = 0

        for (index in ownedCards.indices.take(OWNED_SLOT_X_FRACTIONS.size)) {
            val cardName = ownedCards[index]
            if (SupportCardSelection.isTraineeCharacter(cardName)) {
                MessageLog.w(TAG, "Skipping owned slot $index — \"$cardName\" matches the trainee.")
                continue
            }
            val centerX = SharedData.displayWidth * OWNED_SLOT_X_FRACTIONS[index]
            val centerY = SharedData.displayHeight * OWNED_SLOT_Y_FRACTION
            val ocrText =
                SupportCardSelection.ocrRegion(
                    imageUtils,
                    sourceBitmap,
                    centerX,
                    centerY,
                    OCR_WIDTH_FRACTION,
                    OCR_HEIGHT_FRACTION,
                    "owned_support_slot_$index",
                )
            if (SupportCardSelection.matchScore(ocrText, cardName) >= SupportCardSelection.MIN_NAME_MATCH_SCORE) {
                MessageLog.i(TAG, "Slot $index already shows \"$cardName\" (ocr=\"$ocrText\").")
                equippedCount++
                continue
            }

            game.tap(centerX, centerY)
            game.wait(1.0)
            if (SupportCardSelection.findAndTapCardInList(game, cardName, TAG)) {
                equippedCount++
            } else {
                MessageLog.w(TAG, "Could not select owned support \"$cardName\" for slot $index.")
            }
        }

        MessageLog.i(TAG, "Owned support equip finished ($equippedCount/${ownedCards.size.coerceAtMost(4)} slots).")
        return true
    }
}
