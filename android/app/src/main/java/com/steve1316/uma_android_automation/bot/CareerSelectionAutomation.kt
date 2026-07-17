package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.data.SharedData
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.components.ButtonAutoSelect
import com.steve1316.uma_android_automation.components.ButtonBorrowSupportCard
import com.steve1316.uma_android_automation.components.ButtonNext
import com.steve1316.uma_android_automation.components.ButtonSelectLegacy
import com.steve1316.uma_android_automation.components.ButtonStartCareer
import com.steve1316.uma_android_automation.components.IconEmptySupportSlot

/** Detects career-selection screens, optional auto-borrow, and auto-start on final confirmation. */
object CareerSelectionAutomation {
    private const val TAG = "[CAREER_BORROW]"

    @Volatile private var autoBorrowAttemptedThisRun = false
    @Volatile private var autoEquipAttemptedThisRun = false
    @Volatile private var ownedDeckEquippedNames: MutableSet<String> = mutableSetOf()

    private const val MAX_START_CAREER_ATTEMPTS = 5
    private const val MAX_LEGACY_SELECT_NEXT_ATTEMPTS = 5
    private const val MAX_OWNED_DECK_SLOT_ATTEMPTS = 3

    private val startCareerGuard = RetryGuard(MAX_START_CAREER_ATTEMPTS)
    private val legacySelectNextGuard = RetryGuard(MAX_LEGACY_SELECT_NEXT_ATTEMPTS)
    private val ownedDeckSlotGuard = RetryGuard(MAX_OWNED_DECK_SLOT_ATTEMPTS)

    fun resetForNewRun() {
        autoBorrowAttemptedThisRun = false
        autoEquipAttemptedThisRun = false
        ownedDeckEquippedNames = mutableSetOf()
        startCareerGuard.reset()
        legacySelectNextGuard.reset()
        ownedDeckSlotGuard.reset()
    }

    fun isOnCareerSelectionScreen(game: Game): Boolean {
        val imageUtils = game.imageUtils
        return ButtonBorrowSupportCard.check(imageUtils) ||
            ButtonSelectLegacy.check(imageUtils) ||
            ButtonAutoSelect.check(imageUtils) ||
            ButtonStartCareer.check(imageUtils)
    }

    /**
     * True when the legacy parent picker is open over career selection.
     *
     * The picker also shows [ButtonAutoSelect], so [isOnCareerSelectionScreen] alone can't tell the picker apart
     * from the main career-selection screen. Owned-deck equip and borrow use the main screen's fixed slot
     * coordinates, which don't apply inside the picker, so they must skip this state instead of tapping into it.
     */
    fun isInsideLegacyPicker(game: Game): Boolean {
        val imageUtils = game.imageUtils
        return ButtonAutoSelect.check(imageUtils) &&
            !ButtonSelectLegacy.check(imageUtils) &&
            !ButtonBorrowSupportCard.check(imageUtils) &&
            !ButtonStartCareer.check(imageUtils)
    }

    /**
     * Presses Next to leave the Legacy Select screen once parent selection is done.
     *
     * The Legacy Select screen and the Support Formation (deck) screen show an identical
     * Auto-Select button, so nothing else in this flow can tell them apart on its own. This only
     * fires while [isInsideLegacyPicker] is true (Next visible, Start Career is not), so it never
     * fires on the deck screen. Without this, the bot gets stuck on Legacy Select forever — it has
     * no other code path that advances past it.
     */
    fun tryAdvancePastLegacyPicker(game: Game): Boolean {
        if (!isInsideLegacyPicker(game)) return false
        if (!ButtonNext.check(game.imageUtils)) return false
        if (ButtonNext.click(game.imageUtils)) {
            legacySelectNextGuard.reset()
            MessageLog.i(TAG, "Advancing past Legacy Select via Next.")
            game.wait(1.0)
            return true
        }
        if (legacySelectNextGuard.attempt()) {
            MessageLog.w(TAG, "Giving up on advancing past Legacy Select after $MAX_LEGACY_SELECT_NEXT_ATTEMPTS failed attempts.")
        }
        return false
    }

    private fun isAutoEquipSupportCardsEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableAutoEquipSupportCards", false)

    /** True when a confirmation dialog triggered by either auto-select flow should be confirmed rather than dismissed. */
    fun shouldConfirmAutoSelectDialog(): Boolean = LegacyParentSelector.isEnabled() || isAutoEquipSupportCardsEnabled()

    /**
     * Taps the Support Formation screen's own Auto-Select button to fill the owned support deck slots.
     *
     * Distinct from [LegacyParentSelector]'s Auto-Select: both screens share the same button graphic,
     * so this only fires when [ButtonStartCareer] is visible (the Support Formation / final
     * confirmation screen), never inside the Legacy Select picker.
     */
    fun tryTriggerAutoEquipSupportCards(game: Game): Boolean {
        if (!isAutoEquipSupportCardsEnabled() || autoEquipAttemptedThisRun) return false
        if (!ButtonStartCareer.check(game.imageUtils)) return false
        if (!ButtonAutoSelect.check(game.imageUtils)) return false

        autoEquipAttemptedThisRun = true
        if (ButtonAutoSelect.click(game.imageUtils)) {
            MessageLog.i(TAG, "Tapped Support Formation Auto-Select to fill owned deck slots.")
            game.wait(1.0)
            return true
        }
        MessageLog.w(TAG, "Support Formation Auto-Select button found but click failed.")
        return false
    }

    /** A single owned-deck slot's tap-target center, as a fraction of the full screen. */
    private data class SlotPosition(val xFraction: Double, val yFraction: Double)

    /**
     * Center fractions for the 5 owned support-card slots on the Support Formation screen, in reading order
     * (top row left-to-right, then bottom row left-to-right). Calibrated from a live 1080×2340 device
     * screenshot of this screen; expressed as fractions of [SharedData.displayWidth]/[SharedData.displayHeight]
     * so it scales to other device resolutions the same way every other fixed-position tap in this codebase
     * does (e.g. the URA Finale duel-confirm tap).
     *
     * The 6th grid position (bottom-right) is the pink-bordered "Friends" borrow slot - it is intentionally
     * excluded here since [tryTriggerAutoBorrow] already owns that slot via [ButtonBorrowSupportCard].
     */
    private val OWNED_DECK_SLOT_POSITIONS =
        listOf(
            SlotPosition(0.200, 0.348), // top-left
            SlotPosition(0.499, 0.348), // top-middle
            SlotPosition(0.798, 0.348), // top-right
            SlotPosition(0.200, 0.547), // bottom-left
            SlotPosition(0.499, 0.547), // bottom-middle
        )

    /** A small detection region around a slot's center, generous enough to tolerate minor per-device layout drift while still discriminating between adjacent slots. */
    private fun slotRegion(slot: SlotPosition): IntArray {
        val regionWidth = (SharedData.displayWidth * 0.14).toInt()
        val regionHeight = (SharedData.displayHeight * 0.10).toInt()
        val centerX = (SharedData.displayWidth * slot.xFraction).toInt()
        val centerY = (SharedData.displayHeight * slot.yFraction).toInt()
        return intArrayOf(centerX - regionWidth / 2, centerY - regionHeight / 2, regionWidth, regionHeight)
    }

    private fun isAutoEquipOwnedDeckEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableAutoEquipOwnedDeck", false)

    /**
     * Equips the planned owned deck ([Settings.racing.supportDeckOwnedCards]) slot-by-slot instead of relying
     * on the Support Formation screen's own Auto-Select. Fills one empty slot per call (matching this file's
     * one-action-per-tick convention, same as [tryTriggerAutoBorrow]) so the caller's loop can re-evaluate
     * screen state between taps rather than chaining several taps blind.
     *
     * Falls back to [tryTriggerAutoEquipSupportCards] for any slot left unfilled (planned list shorter than
     * 5 names, a name that never matches, or this being disabled) - callers should try this function first
     * and only fall through to the plain Auto-Select fallback when this one returns false.
     *
     * @return True when a slot-fill attempt was made this iteration (matched or not), so the caller re-enters next tick.
     */
    fun tryTriggerAutoEquipOwnedDeck(game: Game): Boolean {
        if (!isAutoEquipOwnedDeckEnabled() || ownedDeckSlotGuard.exceeded) return false
        if (!ButtonStartCareer.check(game.imageUtils)) return false
        if (!ButtonAutoSelect.check(game.imageUtils)) return false

        val plannedOrder =
            SupportCardSelection.filterTraineeFromSupportNames(
                SupportCardSelection.readStringList(
                    SettingsHelper.getStringSetting("racing", "supportDeckOwnedCards", "[]"),
                ),
            )
        val remaining = plannedOrder.filterNot { it in ownedDeckEquippedNames }
        if (remaining.isEmpty()) return false

        val sourceBitmap = game.imageUtils.getSourceBitmap()
        val emptySlot =
            OWNED_DECK_SLOT_POSITIONS.firstOrNull { slot ->
                IconEmptySupportSlot.check(game.imageUtils, region = slotRegion(slot), sourceBitmap = sourceBitmap)
            } ?: return false

        val centerX = SharedData.displayWidth * emptySlot.xFraction
        val centerY = SharedData.displayHeight * emptySlot.yFraction
        game.gestureUtils.tap(centerX, centerY, "empty_support_slot")
        game.wait(1.0)

        val matched = SupportCardSelection.findAndTapPreferredCardInList(game, remaining, TAG)
        if (matched != null) {
            ownedDeckEquippedNames.add(matched)
            ownedDeckSlotGuard.reset()
            MessageLog.i(TAG, "Auto-equipped owned support card \"$matched\".")
        } else if (ownedDeckSlotGuard.attempt()) {
            MessageLog.w(
                TAG,
                "Giving up on owned-deck auto-equip after $MAX_OWNED_DECK_SLOT_ATTEMPTS failed slot attempts; falling back to in-game Auto-Select for any remaining slots.",
            )
        } else {
            MessageLog.w(TAG, "Owned-deck auto-equip: no planned card matched this slot's picker; closed without equipping.")
        }
        return true
    }

    fun shouldAutoStartCareer(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableAutoStartCareer")

    /**
     * Taps Start Career when the final confirmation button is visible.
     *
     * Returns true on success. Returns false and increments the retry guard on button-click failure.
     * Does NOT check [shouldAutoStartCareer] — callers are responsible for that gate so they can
     * decide whether to close the dialog on the disabled path.
     */
    fun tryStartCareer(game: Game): Boolean {
        if (!ButtonStartCareer.check(game.imageUtils)) return false
        if (ButtonStartCareer.click(game.imageUtils)) {
            startCareerGuard.reset()
            MessageLog.i("[CAREER_START]", "Tapped Start Career on final confirmation.")
            game.waitForLoading()
            return true
        }
        if (startCareerGuard.attempt()) {
            MessageLog.w(TAG, "Giving up on auto-starting career after $MAX_START_CAREER_ATTEMPTS failed attempts.")
        }
        return false
    }

    /** True once [tryStartCareer] has failed [MAX_START_CAREER_ATTEMPTS] times in a row for the current final-confirmation dialog. */
    fun hasExceededStartCareerAttempts(): Boolean = startCareerGuard.exceeded

    fun resetStartCareerAttempts() { startCareerGuard.reset() }

    private fun isAutoBorrowEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableAutoBorrowSupportCard", false)

    /**
     * Opens the friend borrow picker and taps the first configured [supportBorrowPreferredCards] match,
     * rotating priority order by [ParentFarmingRunLoop.borrowRotationOffset] across multi-run sessions.
     *
     * @return True when a borrow attempt was made this iteration (matched or not).
     */
    fun tryTriggerAutoBorrow(game: Game): Boolean {
        if (!isAutoBorrowEnabled() || autoBorrowAttemptedThisRun) return false
        if (!ButtonBorrowSupportCard.check(game.imageUtils)) return false

        val preferredCards = readPreferredBorrowCards()
        if (preferredCards.isEmpty()) {
            autoBorrowAttemptedThisRun = true
            return false
        }

        if (!ButtonBorrowSupportCard.click(game.imageUtils)) return false
        game.wait(1.0)

        autoBorrowAttemptedThisRun = true
        val matched = SupportCardSelection.findAndTapPreferredCardInList(game, rotatedPreferredCards(preferredCards), TAG)
        if (matched != null) {
            MessageLog.i(TAG, "Auto-borrowed support card \"$matched\".")
            return true
        }
        MessageLog.w(TAG, "Auto-borrow: no preferred card matched the friend list; closed without borrowing.")
        return false
    }

    private fun readPreferredBorrowCards(): List<String> =
        SupportCardSelection.filterTraineeFromSupportNames(
            SupportCardSelection.readStringList(
                ParentFarmingGoalQueue.racingString("supportBorrowPreferredCards", "[]"),
            ),
        )

    private fun rotatedPreferredCards(cards: List<String>): List<String> {
        val offset = ParentFarmingRunLoop.borrowRotationOffset()
        if (offset <= 0 || cards.size <= 1) return cards
        val shift = offset % cards.size
        return cards.subList(shift, cards.size) + cards.subList(0, shift)
    }
}
