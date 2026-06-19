package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.data.SharedData
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper

/**
 * Auto-equips the owned support slots at career selection via a tap-and-pick pass over the
 * 3x2 owned-slot grid (the trailing grid cell is the friend slot and is never tapped here).
 *
 * The grid slots render card art with no name text, so there is no reliable OCR signal to
 * check whether a slot is already "satisfied" — every enabled slot is tapped and re-picked
 * each run, bounded by [MAX_EQUIP_ATTEMPTS] as a timing safety net only.
 */
object OwnedSupportDeckEquipper {
    private const val TAG = "[OWNED_SUPPORT]"
    private const val MAX_EQUIP_ATTEMPTS = 2

    /** Centers (x, y fractions of screen size) for the 5 owned-card slots in the 3x2 career-selection grid. */
    private val OWNED_SLOT_FRACTIONS =
        listOf(
            0.205 to 0.373,
            0.499 to 0.373,
            0.794 to 0.373,
            0.205 to 0.548,
            0.499 to 0.548,
        )

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

        val targetCount = ownedCards.size.coerceAtMost(OWNED_SLOT_FRACTIONS.size)

        equipAttempts++
        MessageLog.i(
            TAG,
            "Equipping owned support deck (attempt $equipAttempts/$MAX_EQUIP_ATTEMPTS): ${ownedCards.joinToString(" · ")}",
        )

        var equippedCount = 0
        for (index in ownedCards.indices.take(OWNED_SLOT_FRACTIONS.size)) {
            val cardName = ownedCards[index]
            if (SupportCardSelection.isTraineeCharacter(cardName)) {
                MessageLog.w(TAG, "Skipping owned slot $index — \"$cardName\" matches the trainee.")
                continue
            }

            val (xFraction, yFraction) = OWNED_SLOT_FRACTIONS[index]
            val centerX = SharedData.displayWidth * xFraction
            val centerY = SharedData.displayHeight * yFraction
            game.tap(centerX, centerY)
            game.wait(0.8)
            if (SupportCardSelection.findAndTapCardInList(game, cardName, TAG)) {
                equippedCount++
            } else {
                MessageLog.w(TAG, "Could not select owned support \"$cardName\" for slot $index.")
            }
        }

        MessageLog.i(TAG, "Owned support equip finished ($equippedCount/$targetCount slots).")

        if (equippedCount >= targetCount || equipAttempts >= MAX_EQUIP_ATTEMPTS) {
            equipAttemptedThisRun = true
            if (equippedCount < targetCount) {
                MessageLog.w(TAG, "Giving up on owned support equip after $MAX_EQUIP_ATTEMPTS attempts.")
            }
            return false
        }

        return true
    }
}
