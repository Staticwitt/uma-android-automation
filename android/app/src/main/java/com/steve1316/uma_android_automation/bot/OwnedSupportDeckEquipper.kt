package com.steve1316.uma_android_automation.bot

import android.graphics.Bitmap
import com.steve1316.automation_library.data.SharedData
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.utils.CustomImageUtils

/**
 * Auto-equips the four owned support slots at career selection using OCR on slot labels
 * and scroll-list matching in the support picker.
 */
object OwnedSupportDeckEquipper {
    private const val TAG = "[OWNED_SUPPORT]"
    private const val MAX_EQUIP_ATTEMPTS = 2

    /** Horizontal centers for owned support slots on career selection (fraction of screen width). */
    private val OWNED_SLOT_X_FRACTIONS = doubleArrayOf(0.14, 0.32, 0.50, 0.68)

    /** Vertical center for owned slot OCR/taps (fraction of screen height). */
    private const val OWNED_SLOT_Y_FRACTION = 0.56

    private const val OCR_WIDTH_FRACTION = 0.16
    private const val OCR_HEIGHT_FRACTION = 0.08

    @Volatile private var equipAttemptedThisRun = false
    @Volatile private var equipAttempts = 0

    fun resetForNewRun() {
        equipAttemptedThisRun = false
        equipAttempts = 0
    }

    fun isEnabled(): Boolean = SettingsHelper.getBooleanSetting("racing", "enableAutoEquipOwnedSupportDeck")

    /**
     * Equips configured owned supports when career-selection slots are visible.
     *
     * Runs after legacy parent selection so parent changes do not invalidate equipped supports.
     *
     * @return True when equipping advanced this iteration and should retry on the next loop.
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

        val imageUtils = game.imageUtils
        val sourceBitmap = imageUtils.getSourceBitmap()
        var slotTexts = ocrOwnedSlotTexts(imageUtils, sourceBitmap)
        val targetCount = ownedCards.size.coerceAtMost(4)
        if (countSatisfiedSlotsFromTexts(slotTexts, ownedCards) >= targetCount) {
            equipAttemptedThisRun = true
            MessageLog.i(TAG, "Owned support slots already match saved deck.")
            return false
        }

        equipAttempts++
        MessageLog.i(
            TAG,
            "Equipping owned support deck (attempt $equipAttempts/$MAX_EQUIP_ATTEMPTS): ${ownedCards.joinToString(" · ")}",
        )

        for (index in ownedCards.indices.take(OWNED_SLOT_X_FRACTIONS.size)) {
            val cardName = ownedCards[index]
            if (SupportCardSelection.isTraineeCharacter(cardName)) {
                MessageLog.w(TAG, "Skipping owned slot $index — \"$cardName\" matches the trainee.")
                continue
            }
            if (slotMatchesCard(slotTexts.getOrNull(index).orEmpty(), cardName)) {
                MessageLog.i(TAG, "Slot $index already shows \"$cardName\".")
                continue
            }

            val centerX = SharedData.displayWidth * OWNED_SLOT_X_FRACTIONS[index]
            val centerY = SharedData.displayHeight * OWNED_SLOT_Y_FRACTION
            game.tap(centerX, centerY)
            game.wait(0.8)
            if (SupportCardSelection.findAndTapCardInList(game, cardName, TAG)) {
                slotTexts =
                    slotTexts.toMutableList().also { texts ->
                        texts[index] = ocrOwnedSlotText(imageUtils, imageUtils.getSourceBitmap(), index)
                    }
            } else {
                MessageLog.w(TAG, "Could not select owned support \"$cardName\" for slot $index.")
            }
        }

        slotTexts = ocrOwnedSlotTexts(imageUtils, imageUtils.getSourceBitmap())
        val satisfiedAfterPass = countSatisfiedSlotsFromTexts(slotTexts, ownedCards)
        MessageLog.i(TAG, "Owned support equip finished ($satisfiedAfterPass/$targetCount slots).")

        if (satisfiedAfterPass >= targetCount) {
            equipAttemptedThisRun = true
            return false
        }

        if (equipAttempts >= MAX_EQUIP_ATTEMPTS) {
            equipAttemptedThisRun = true
            MessageLog.w(TAG, "Giving up on owned support equip after $MAX_EQUIP_ATTEMPTS attempts.")
            return false
        }

        return true
    }

    internal fun countSatisfiedSlots(
        imageUtils: CustomImageUtils,
        sourceBitmap: Bitmap,
        ownedCards: List<String>,
    ): Int = countSatisfiedSlotsFromTexts(ocrOwnedSlotTexts(imageUtils, sourceBitmap), ownedCards)

    internal fun countSatisfiedSlotsFromTexts(slotTexts: List<String>, ownedCards: List<String>): Int {
        var satisfied = 0
        for (index in ownedCards.indices.take(OWNED_SLOT_X_FRACTIONS.size)) {
            val cardName = ownedCards[index]
            if (SupportCardSelection.isTraineeCharacter(cardName)) continue
            if (slotMatchesCard(slotTexts.getOrNull(index).orEmpty(), cardName)) {
                satisfied++
            }
        }
        return satisfied
    }

    internal fun ocrOwnedSlotTexts(imageUtils: CustomImageUtils, sourceBitmap: Bitmap): List<String> =
        OWNED_SLOT_X_FRACTIONS.indices.map { index -> ocrOwnedSlotText(imageUtils, sourceBitmap, index) }

    internal fun ocrOwnedSlotText(imageUtils: CustomImageUtils, sourceBitmap: Bitmap, index: Int): String {
        val centerX = SharedData.displayWidth * OWNED_SLOT_X_FRACTIONS[index]
        val centerY = SharedData.displayHeight * OWNED_SLOT_Y_FRACTION
        return SupportCardSelection.ocrRegion(
            imageUtils,
            sourceBitmap,
            centerX,
            centerY,
            OCR_WIDTH_FRACTION,
            OCR_HEIGHT_FRACTION,
            "owned_support_slot_$index",
        )
    }

    internal fun slotMatchesCard(ocrText: String, cardName: String): Boolean = SupportCardSelection.matchesName(ocrText, cardName)
}
