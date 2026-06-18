package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.components.ButtonCareer
import com.steve1316.uma_android_automation.components.ButtonClose
import com.steve1316.uma_android_automation.components.ButtonMenuBarHome
import com.steve1316.uma_android_automation.components.ButtonNext
import com.steve1316.uma_android_automation.components.ButtonOk
import com.steve1316.uma_android_automation.components.ButtonStartCareer
import com.steve1316.uma_android_automation.components.ButtonStartCareerOffset
import com.steve1316.uma_android_automation.components.LabelEventProgress
import com.steve1316.uma_android_automation.utils.ScrollList
import com.steve1316.uma_android_automation.utils.ScrollListEntry
import com.steve1316.uma_android_automation.utils.ScrollListEntryDetectionConfig

/**
 * Navigates from the team home screen to career selection and picks the configured trainee
 * before the existing equip → borrow → parent → start automation chain runs.
 */
object ParentFarmingColdStart {
    private const val TAG = "[PF_COLD_START]"

    @Volatile private var coldStartComplete = false

    fun resetSession() {
        coldStartComplete = false
    }

    fun isEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMode", false) &&
            SettingsHelper.getBooleanSetting("racing", "enableParentFarmingColdStart", true)

    /**
     * @return True when navigation or selection advanced this iteration (caller should return early).
     */
    fun tryAdvance(game: Game, campaign: Campaign): Boolean {
        if (!isEnabled() || coldStartComplete) return false
        if (campaign.checkMainScreen()) {
            coldStartComplete = true
            return false
        }
        if (CareerSelectionAutomation.isOnCareerSelectionScreen(game)) {
            coldStartComplete = true
            MessageLog.i(TAG, "Reached career selection — cold start complete.")
            return false
        }

        val character = SettingsHelper.getStringSetting("racing", "smartRaceSolverCharacterPreset").trim()
        if (character.isEmpty()) {
            MessageLog.w(TAG, "No character preset configured; skipping cold start.")
            coldStartComplete = true
            return false
        }

        if (selectCharacterFromList(game, character)) {
            game.wait(1.0)
            return true
        }

        when {
            ButtonStartCareer.check(game.imageUtils) || ButtonStartCareerOffset.check(game.imageUtils) -> {
                coldStartComplete = true
                return false
            }
            ButtonCareer.click(game.imageUtils) -> {
                MessageLog.i(TAG, "Opened Career from home.")
                game.wait(1.0)
                return true
            }
            ButtonMenuBarHome.click(game.imageUtils) -> {
                MessageLog.i(TAG, "Returned to home menu.")
                game.wait(0.8)
                return true
            }
            ButtonNext.click(game.imageUtils) -> {
                game.wait(0.8)
                return true
            }
            ButtonOk.click(game.imageUtils) -> {
                game.wait(0.8)
                return true
            }
            ButtonClose.click(game.imageUtils) -> {
                game.wait(0.6)
                return true
            }
        }

        return false
    }

    private fun selectCharacterFromList(game: Game, characterName: String): Boolean {
        var tapped = false
        ScrollList.processWithFallback(
            game,
            fallbackComponent = LabelEventProgress,
            entryDetectionConfig = ScrollListEntryDetectionConfig(bUseGeneric = true),
            keyExtractor = { entry -> ocrEntry(game, entry) },
            onEntry = { _, entry ->
                val text = ocrEntry(game, entry)
                val score = SupportCardSelection.matchScore(text, characterName)
                if (score >= SupportCardSelection.MIN_NAME_MATCH_SCORE) {
                    MessageLog.i(TAG, "Selecting trainee \"$characterName\" from roster (score=$score, ocr=\"$text\").")
                    game.tap(entry.bbox.cx.toDouble(), entry.bbox.cy.toDouble())
                    game.wait(1.0)
                    tapped = true
                    true
                } else {
                    false
                }
            },
        )
        return tapped
    }

    private fun ocrEntry(game: Game, entry: ScrollListEntry): String =
        game.imageUtils.performOCROnRegion(
            entry.bitmap,
            0,
            0,
            entry.bitmap.width,
            entry.bitmap.height,
            useThreshold = false,
            useGrayscale = true,
            scale = 2.0,
            ocrEngine = "tesseract",
            debugName = "cold_start_character_entry",
        ).lowercase()
}
