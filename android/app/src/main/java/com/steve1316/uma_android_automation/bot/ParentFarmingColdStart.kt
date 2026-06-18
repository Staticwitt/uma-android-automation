package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.data.SharedData
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.components.ButtonClose
import com.steve1316.uma_android_automation.components.ButtonConfirm
import com.steve1316.uma_android_automation.components.ButtonHomePresents
import com.steve1316.uma_android_automation.components.ButtonHomeSpecialMissions
import com.steve1316.uma_android_automation.components.ButtonMenuBarHomeSelected
import com.steve1316.uma_android_automation.components.ButtonMenuBarHomeUnselected
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

    /** Team-home Career hub (large button above the bottom nav, lower-right). */
    private const val TEAM_HOME_CAREER_X_FRACTION = 0.84
    private const val TEAM_HOME_CAREER_Y_FRACTION = 0.835

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

        if (ButtonStartCareer.check(game.imageUtils) || ButtonStartCareerOffset.check(game.imageUtils)) {
            coldStartComplete = true
            return false
        }

        when {
            isOnTeamHomeHub(game, campaign) -> {
                if (tryOpenCareerFromTeamHome(game)) return true
            }
            needsHomeTab(game) -> {
                if (ButtonMenuBarHomeUnselected.click(game.imageUtils)) {
                    MessageLog.i(TAG, "Switching to Home tab before opening Career.")
                    game.wait(0.8)
                    return true
                }
            }
            isLikelyScenarioSelectScreen(game) -> {
                if (trySelectScenario(game)) return true
            }
            else -> {
                if (selectCharacterFromList(game, character)) {
                    game.wait(1.0)
                    return true
                }
            }
        }

        when {
            ButtonConfirm.click(game.imageUtils) -> {
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

    /** Tracen team hub (not in-career training, not career selection). */
    internal fun isOnTeamHomeHub(game: Game, campaign: Campaign): Boolean {
        if (campaign.checkMainScreen()) return false
        if (CareerSelectionAutomation.isOnCareerSelectionScreen(game)) return false
        return ButtonMenuBarHomeSelected.check(game.imageUtils) ||
            ButtonHomeSpecialMissions.check(game.imageUtils) ||
            ButtonHomePresents.check(game.imageUtils)
    }

    /** Bottom nav visible but Home tab is not active yet. */
    internal fun needsHomeTab(game: Game): Boolean =
        ButtonMenuBarHomeUnselected.check(game.imageUtils) && !ButtonMenuBarHomeSelected.check(game.imageUtils)

    internal fun isLikelyScenarioSelectScreen(game: Game): Boolean = likelyScenarioSelectFromOcr(readScenarioPickerOcr(game))

    internal fun likelyScenarioSelectFromOcr(text: String): Boolean =
        listOf("trackblazer", "ura finale", "unity cup", "aoharu", "make a new start")
            .count { keyword -> text.contains(keyword) } >= 2

    internal fun scenarioKeywords(scenario: String): List<String> =
        when (scenario) {
            "URA Finale" -> listOf("ura finale", "ura")
            "Unity Cup" -> listOf("unity cup", "unity", "aoharu")
            else -> listOf("trackblazer", "make a new start")
        }

    internal fun scenarioTapFraction(scenario: String): Pair<Double, Double> =
        when (scenario) {
            "URA Finale" -> 0.50 to 0.52
            "Unity Cup" -> 0.74 to 0.52
            else -> 0.26 to 0.52
        }

    private fun tryOpenCareerFromTeamHome(game: Game): Boolean {
        val x = SharedData.displayWidth * TEAM_HOME_CAREER_X_FRACTION
        val y = SharedData.displayHeight * TEAM_HOME_CAREER_Y_FRACTION
        MessageLog.i(TAG, "Tapping team-home Career hub at (${x.toInt()}, ${y.toInt()}).")
        game.tap(x, y)
        game.waitForLoading()
        game.wait(1.0)
        return true
    }

    private fun trySelectScenario(game: Game): Boolean {
        val scenario = SettingsHelper.getStringSetting("general", "scenario", "Trackblazer")
        val ocrText = readScenarioPickerOcr(game)
        val keywords = scenarioKeywords(scenario)
        if (keywords.none { ocrText.contains(it) }) {
            MessageLog.w(TAG, "Scenario picker visible but \"$scenario\" not detected in OCR; using default card position.")
        }
        val (xFraction, yFraction) = scenarioTapFraction(scenario)
        val x = SharedData.displayWidth * xFraction
        val y = SharedData.displayHeight * yFraction
        MessageLog.i(TAG, "Selecting scenario \"$scenario\" at (${x.toInt()}, ${y.toInt()}).")
        game.tap(x, y)
        game.waitForLoading()
        game.wait(1.0)
        return true
    }

    private fun readScenarioPickerOcr(game: Game): String {
        val bitmap = game.imageUtils.getSourceBitmap()
        return game.imageUtils.performOCROnRegion(
            bitmap,
            0,
            (bitmap.height * 0.18).toInt(),
            bitmap.width,
            (bitmap.height * 0.62).toInt(),
            useThreshold = false,
            useGrayscale = true,
            scale = 2.0,
            ocrEngine = "mlkit",
            debugName = "cold_start_scenario_picker",
        ).lowercase()
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
