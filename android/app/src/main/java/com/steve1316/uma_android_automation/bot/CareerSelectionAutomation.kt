package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.components.ButtonAutoSelect
import com.steve1316.uma_android_automation.components.ButtonBorrowSupportCard
import com.steve1316.uma_android_automation.components.ButtonSelectLegacy
import com.steve1316.uma_android_automation.components.ButtonStartCareer

/** Detects career-selection screens and optional auto-start on final confirmation. */
object CareerSelectionAutomation {
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
        SettingsHelper.getBooleanSetting("racing", "enableAutoStartCareer") &&
            SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMode", false)

    /** Taps Start Career when the final confirmation button is visible. */
    fun tryStartCareer(game: Game): Boolean {
        if (!shouldAutoStartCareer()) return false
        if (!ButtonStartCareer.check(game.imageUtils)) return false
        if (ButtonStartCareer.click(game.imageUtils)) {
            com.steve1316.automation_library.utils.MessageLog.i(
                "[CAREER_START]",
                "Tapped Start Career on final confirmation.",
            )
            game.waitForLoading()
            return true
        }
        return false
    }
}
