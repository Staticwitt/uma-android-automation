package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.components.ButtonAutoSelect
import com.steve1316.uma_android_automation.components.ButtonBorrowSupportCard
import com.steve1316.uma_android_automation.components.ButtonSelectLegacy
import com.steve1316.uma_android_automation.components.ButtonStartCareer

/** Detects career-selection screens, optional auto-borrow, and auto-start on final confirmation. */
object CareerSelectionAutomation {
    private const val TAG = "[CAREER_BORROW]"

    @Volatile private var autoBorrowAttemptedThisRun = false

    private const val MAX_START_CAREER_ATTEMPTS = 5
    private val startCareerGuard = RetryGuard(MAX_START_CAREER_ATTEMPTS)

    fun resetForNewRun() {
        autoBorrowAttemptedThisRun = false
        startCareerGuard.reset()
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
