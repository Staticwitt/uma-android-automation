package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.components.ButtonAutoSelect
import com.steve1316.uma_android_automation.components.ButtonBorrowSupportCard
import com.steve1316.uma_android_automation.components.ButtonNext
import com.steve1316.uma_android_automation.components.ButtonSelectLegacy
import com.steve1316.uma_android_automation.components.ButtonStartCareer

/** Detects career-selection screens, optional auto-borrow, and auto-start on final confirmation. */
object CareerSelectionAutomation {
    private const val TAG = "[CAREER_BORROW]"

    @Volatile private var autoBorrowAttemptedThisRun = false
    @Volatile private var autoEquipAttemptedThisRun = false

    private const val MAX_START_CAREER_ATTEMPTS = 5
    private const val MAX_LEGACY_SELECT_NEXT_ATTEMPTS = 5

    private val startCareerGuard = RetryGuard(MAX_START_CAREER_ATTEMPTS)
    private val legacySelectNextGuard = RetryGuard(MAX_LEGACY_SELECT_NEXT_ATTEMPTS)

    fun resetForNewRun() {
        autoBorrowAttemptedThisRun = false
        autoEquipAttemptedThisRun = false
        startCareerGuard.reset()
        legacySelectNextGuard.reset()
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
