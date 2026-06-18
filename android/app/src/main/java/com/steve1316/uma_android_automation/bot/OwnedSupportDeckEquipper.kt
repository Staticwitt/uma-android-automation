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
        if (countSatisfiedSlots(imageUtils, sourceBitmap, ownedCards) >= ownedCards.size.coerceAtMost(4)) {
            equipAttemptedThisRun = true
            MessageLog.i(TAG, "Owned support slots already match saved deck.")
            return false
        }

        equipAttempts++
        MessageLog.i(
            TAG,
            "Equipping owned support deck (attempt $equipAttempts/$MAX_EQUIP_ATTEMPTS): ${ownedCards.joinToString(" · ")}",
        )

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

        val targetCount = ownedCards.size.coerceAtMost(4)
        MessageLog.i(TAG, "Owned support equip finished ($equippedCount/$targetCount slots).")

        if (equippedCount >= targetCount) {
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
    ): Int {
        var satisfied = 0
        for (index in ownedCards.indices.take(OWNED_SLOT_X_FRACTIONS.size)) {
            val cardName = ownedCards[index]
            if (SupportCardSelection.isTraineeCharacter(cardName)) continue
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
                satisfied++
            }
        }
        return satisfied
    }
}
