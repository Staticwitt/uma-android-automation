package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.data.SharedData
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.components.ButtonClose
import com.steve1316.uma_android_automation.components.ButtonConfirm
import com.steve1316.uma_android_automation.components.ButtonEditTeam
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

    /** Team-home Career hub fallback (large button above the bottom nav, lower-right). */
    private const val TEAM_HOME_CAREER_X_FRACTION = 0.84
    private const val TEAM_HOME_CAREER_Y_FRACTION = 0.835

    /** Career hub sits roughly this fraction of screen height above the bottom nav anchor. */
    private const val CAREER_HUB_ABOVE_NAV_FRACTION = 0.12

    /** Explicit phases so character pick always precedes scenario pick. */
    internal enum class Phase {
        NAVIGATE_HOME,
        PICK_CHARACTER,
        PICK_SCENARIO,
    }

    @Volatile private var coldStartComplete = false
    @Volatile private var phase = Phase.NAVIGATE_HOME
    @Volatile private var scenarioTapAttempts = 0
    @Volatile private var idleIterations = 0

    fun resetSession() {
        coldStartComplete = false
        phase = Phase.NAVIGATE_HOME
        scenarioTapAttempts = 0
        idleIterations = 0
    }

    fun isEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMode", false) &&
            SettingsHelper.getBooleanSetting("racing", "enableParentFarmingColdStart", true)

    internal fun currentPhase(): Phase = phase

    /**
     * @return True when navigation or selection advanced this iteration (caller should return early).
     */
    fun tryAdvance(game: Game, campaign: Campaign): Boolean {
        if (!isEnabled() || coldStartComplete) return false
        if (campaign.checkMainScreen()) {
            markComplete("Already in career — skipping cold start.")
            return false
        }
        if (CareerSelectionAutomation.isOnCareerSelectionScreen(game)) {
            markComplete("Reached career selection — cold start complete.")
            return false
        }

        val character = SettingsHelper.getStringSetting("racing", "smartRaceSolverCharacterPreset").trim()
        if (character.isEmpty()) {
            MessageLog.w(TAG, "No character preset configured; skipping cold start.")
            markComplete(null)
            return false
        }

        if (ButtonStartCareer.check(game.imageUtils) || ButtonStartCareerOffset.check(game.imageUtils)) {
            markComplete("Start Career visible — cold start complete.")
            return false
        }

        val advanced =
            when {
                isOnTeamHomeHub(game, campaign) -> {
                    phase = Phase.NAVIGATE_HOME
                    if (tryOpenCareerFromTeamHome(game)) {
                        phase = Phase.PICK_CHARACTER
                        true
                    } else {
                        false
                    }
                }
                needsHomeTab(game) -> {
                    phase = Phase.NAVIGATE_HOME
                    if (ButtonMenuBarHomeUnselected.click(game.imageUtils)) {
                        MessageLog.i(TAG, "Switching to Home tab before opening Career.")
                        game.wait(0.8)
                        true
                    } else {
                        false
                    }
                }
                shouldPickCharacter(game, campaign) -> {
                    if (selectCharacterFromList(game, character)) {
                        MessageLog.i(TAG, "Trainee tapped — waiting for Confirm before scenario picker.")
                        game.wait(1.0)
                        true
                    } else {
                        false
                    }
                }
                shouldPickScenario() -> {
                    if (trySelectScenario(game)) true else false
                }
                else -> false
            }

        if (advanced) {
            idleIterations = 0
            return true
        }

        when {
            ButtonConfirm.click(game.imageUtils) -> {
                game.wait(0.8)
                advanceToScenarioPhaseIfNeeded("Confirm")
                return true
            }
            ButtonNext.click(game.imageUtils) -> {
                game.wait(0.8)
                advanceToScenarioPhaseIfNeeded("Next")
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

        logIdleProgress(game, campaign)
        return false
    }

    private fun advanceToScenarioPhaseIfNeeded(source: String) {
        if (phase == Phase.PICK_CHARACTER) {
            phase = Phase.PICK_SCENARIO
            scenarioTapAttempts = 0
            MessageLog.i(TAG, "Character confirmed via $source — advancing to scenario picker.")
        }
    }

    private fun markComplete(reason: String?) {
        coldStartComplete = true
        phase = Phase.NAVIGATE_HOME
        scenarioTapAttempts = 0
        idleIterations = 0
        if (reason != null) {
            MessageLog.i(TAG, reason)
        }
    }

    private fun shouldPickCharacter(game: Game, campaign: Campaign): Boolean {
        if (phase == Phase.PICK_SCENARIO) return false
        if (isOnTeamHomeHub(game, campaign) || needsHomeTab(game)) return false
        if (phase == Phase.NAVIGATE_HOME) {
            phase = Phase.PICK_CHARACTER
        }
        return phase == Phase.PICK_CHARACTER
    }

    /** Scenario picking is phase-gated only — OCR must not skip character confirmation. */
    internal fun shouldPickScenario(): Boolean = phase == Phase.PICK_SCENARIO

    /** Tracen team hub (not in-career training, not career selection). */
    internal fun isOnTeamHomeHub(game: Game, campaign: Campaign): Boolean {
        if (campaign.checkMainScreen()) return false
        if (CareerSelectionAutomation.isOnCareerSelectionScreen(game)) return false
        return ButtonMenuBarHomeSelected.check(game.imageUtils) ||
            ButtonEditTeam.check(game.imageUtils) ||
            ButtonHomeSpecialMissions.check(game.imageUtils) ||
            ButtonHomePresents.check(game.imageUtils)
    }

    /** Bottom nav visible but Home tab is not active yet. */
    internal fun needsHomeTab(game: Game): Boolean =
        ButtonMenuBarHomeUnselected.check(game.imageUtils) && !ButtonMenuBarHomeSelected.check(game.imageUtils)

    internal fun isLikelyScenarioSelectScreen(game: Game): Boolean = likelyScenarioSelectFromOcr(readScenarioPickerOcr(game))

    internal fun likelyScenarioSelectFromOcr(text: String): Boolean {
        val keywords =
            listOf(
                "trackblazer",
                "ura finale",
                "unity cup",
                "aoharu",
                "make a new start",
                "select scenario",
                "choose scenario",
            )
        return keywords.count { keyword -> text.contains(keyword) } >= 2
    }

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

    internal fun careerHubTapPoint(displayWidth: Int, displayHeight: Int, navAnchorY: Double?): Pair<Double, Double> {
        val x = displayWidth * TEAM_HOME_CAREER_X_FRACTION
        val y =
            if (navAnchorY != null) {
                (navAnchorY - displayHeight * CAREER_HUB_ABOVE_NAV_FRACTION)
                    .coerceIn(displayHeight * 0.65, displayHeight * 0.90)
            } else {
                displayHeight * TEAM_HOME_CAREER_Y_FRACTION
            }
        return x to y
    }

    private fun tryOpenCareerFromTeamHome(game: Game): Boolean {
        val navAnchorY =
            sequenceOf(
                ButtonMenuBarHomeSelected.find(game.imageUtils).first,
                ButtonMenuBarHomeUnselected.find(game.imageUtils).first,
                ButtonEditTeam.find(game.imageUtils).first,
            ).firstOrNull()?.y
        val (x, y) = careerHubTapPoint(SharedData.displayWidth, SharedData.displayHeight, navAnchorY)
        MessageLog.i(TAG, "Tapping team-home Career hub at (${x.toInt()}, ${y.toInt()}).")
        game.tap(x, y)
        game.waitForLoading()
        game.wait(1.0)
        return true
    }

    private fun trySelectScenario(game: Game): Boolean {
        if (scenarioTapAttempts >= 3) {
            MessageLog.w(TAG, "Scenario picker taps exhausted; waiting for career selection or dialogs.")
            return false
        }

        val scenario = SettingsHelper.getStringSetting("general", "scenario", "Trackblazer")
        val ocrText = readScenarioPickerOcr(game)
        val keywords = scenarioKeywords(scenario)
        if (keywords.none { ocrText.contains(it) }) {
            MessageLog.w(TAG, "Scenario picker step but \"$scenario\" not detected in OCR; using card position.")
        }
        val (xFraction, yFraction) = scenarioTapFraction(scenario)
        val x = SharedData.displayWidth * xFraction
        val y = SharedData.displayHeight * yFraction
        scenarioTapAttempts++
        MessageLog.i(TAG, "Selecting scenario \"$scenario\" at (${x.toInt()}, ${y.toInt()}) (attempt $scenarioTapAttempts).")
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

    private fun logIdleProgress(game: Game, campaign: Campaign) {
        idleIterations++
        if (idleIterations == 1 || idleIterations % 8 == 0) {
            val onHome = isOnTeamHomeHub(game, campaign)
            val needsHome = needsHomeTab(game)
            val scenarioOcr = readScenarioPickerOcr(game)
            MessageLog.i(
                TAG,
                "Waiting (phase=$phase, onHome=$onHome, needsHome=$needsHome, " +
                    "scenarioOcr=${scenarioOcr.take(48)}, idle=$idleIterations).",
            )
        }
    }
}
