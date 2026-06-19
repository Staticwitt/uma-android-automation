package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.data.SharedData
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.components.ButtonConfirm
import com.steve1316.uma_android_automation.components.ButtonEditTeam
import com.steve1316.uma_android_automation.components.ButtonHomePresents
import com.steve1316.uma_android_automation.components.ButtonHomeSpecialMissions
import com.steve1316.uma_android_automation.components.ButtonMenuBarHomeSelected
import com.steve1316.uma_android_automation.components.ButtonMenuBarHomeUnselected
import com.steve1316.uma_android_automation.components.ButtonMenuBarRaceSelected
import com.steve1316.uma_android_automation.components.ButtonNext
import com.steve1316.uma_android_automation.components.ButtonOk
import com.steve1316.uma_android_automation.components.LabelEventProgress
import com.steve1316.uma_android_automation.utils.ScrollList
import com.steve1316.uma_android_automation.utils.ScrollListEntry
import com.steve1316.uma_android_automation.utils.ScrollListEntryDetectionConfig

/**
 * Generation-farm gate and auto-navigation for multi-generation breeding plans.
 * Goal-queue patches advance settings between multi-run careers; this drives the
 * home → Career hub → trainee → scenario flow so the user does not have to.
 */
object ParentFarmingGenerationFarm {
    private const val TAG = "[PF_GEN_FARM]"
    private const val WARN_EVERY_ITERATIONS = 30

    /** Team-home Career hub fallback (large button above the bottom nav, lower-right). */
    private const val TEAM_HOME_CAREER_X_FRACTION = 0.84
    private const val TEAM_HOME_CAREER_Y_FRACTION = 0.835

    /** Career hub sits roughly this fraction of screen height above the bottom nav anchor. */
    private const val CAREER_HUB_ABOVE_NAV_FRACTION = 0.12

    private const val CHARACTER_LIST_OCR_SCALE = 1.5

    private const val MAX_SCENARIO_TAP_ATTEMPTS = 3
    private const val MAX_CHARACTER_PICK_ATTEMPTS = 5

    /** Explicit phases so character pick always precedes scenario pick. */
    internal enum class NavPhase {
        NAVIGATE_HOME,
        PICK_CHARACTER,
        PICK_SCENARIO,
    }

    @Volatile private var iteration = 0
    @Volatile private var lastWarnIteration = 0

    @Volatile private var navPhase = NavPhase.NAVIGATE_HOME
    @Volatile private var scenarioTapAttempts = 0
    @Volatile private var characterPickAttempts = 0
    @Volatile private var navigationFailed = false

    fun resetSession() {
        iteration = 0
        lastWarnIteration = 0
        resetNavigation()
    }

    fun resetNavigation() {
        navPhase = NavPhase.NAVIGATE_HOME
        scenarioTapAttempts = 0
        characterPickAttempts = 0
        navigationFailed = false
    }

    /** True once auto-navigation has given up on the trainee/scenario pick for this generation. */
    fun hasFailed(): Boolean = navigationFailed

    fun isEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMode", false) &&
            SettingsHelper.getBooleanSetting("racing", "enableParentFarmingBreedingPlan", false)

    /**
     * Drives the same home → Career hub → trainee → scenario navigation used between generations
     * (see [tryAdvanceNavigation]) when generation farm is active but the screen is not career
     * selection — e.g. before the very first generation, when the user hasn't navigated there yet.
     * Falls back to a throttled reminder once auto-navigation has nothing to do (no resolved target
     * trainee, or [hasFailed] already gave up for this generation).
     */
    fun tryGate(game: Game, campaign: Campaign) {
        if (!isEnabled()) return
        if (campaign.checkMainScreen()) return
        if (CareerSelectionAutomation.isOnCareerSelectionScreen(game)) {
            iteration = 0
            return
        }

        val pendingPatch = ParentFarmingGoalQueue.peekPatchForRunIndex(ParentFarmingRunLoop.sessionRunsCompleted())
        val targetCharacter = pendingPatch?.characterPreset ?: ""
        val targetScenario =
            pendingPatch?.scenario?.ifEmpty { null } ?: SettingsHelper.getStringSetting("general", "scenario", "Trackblazer")

        if (targetCharacter.isNotEmpty() && !hasFailed() && tryAdvanceNavigation(game, campaign, targetCharacter, targetScenario)) {
            iteration = 0
            return
        }

        iteration++
        if (iteration - lastWarnIteration < WARN_EVERY_ITERATIONS) return
        lastWarnIteration = iteration
        val runLabel = ParentFarmingGoalQueue.activeLabel().let { if (it.isNotEmpty()) " ($it)" else "" }
        MessageLog.w(
            TAG,
            "Generation farm: start on career selection$runLabel — pick trainee and scenario manually, " +
                "then equip/borrow/parent automation runs. Goal queue advances between careers.",
        )
    }

    /**
     * Attempts one step of home → Career hub → trainee → scenario navigation for the next generation.
     * @return True if a navigation action was taken this call (caller should keep looping); false if idle/stuck.
     */
    fun tryAdvanceNavigation(game: Game, campaign: Campaign, targetCharacter: String, targetScenario: String): Boolean {
        if (targetCharacter.isEmpty()) return false
        if (navigationFailed) return false
        if (campaign.checkMainScreen()) return false
        if (CareerSelectionAutomation.isOnCareerSelectionScreen(game)) return false

        val onTeamHome = isOnTeamHomeHub(game, campaign)

        val advanced =
            when {
                needsHomeTab(game) && navPhase == NavPhase.NAVIGATE_HOME -> {
                    if (ButtonMenuBarHomeUnselected.click(game.imageUtils)) {
                        MessageLog.i(TAG, "Switching to Home tab before opening Career.")
                        game.wait(0.8)
                        true
                    } else {
                        false
                    }
                }
                onTeamHome && navPhase == NavPhase.NAVIGATE_HOME -> {
                    tryOpenCareerFromTeamHome(game)
                    navPhase = NavPhase.PICK_CHARACTER
                    true
                }
                onTeamHome && navPhase == NavPhase.PICK_CHARACTER -> {
                    MessageLog.w(TAG, "Still on team home during character pick — retrying Career hub.")
                    tryOpenCareerFromTeamHome(game)
                }
                navPhase == NavPhase.PICK_CHARACTER && !onTeamHome -> {
                    if (selectCharacterFromList(game, targetCharacter)) {
                        MessageLog.i(TAG, "Trainee \"$targetCharacter\" tapped — waiting for Confirm before scenario picker.")
                        game.wait(1.0)
                        true
                    } else {
                        characterPickAttempts++
                        if (characterPickAttempts >= MAX_CHARACTER_PICK_ATTEMPTS) {
                            navigationFailed = true
                            MessageLog.w(
                                TAG,
                                "Trainee \"$targetCharacter\" not found in roster after $characterPickAttempts attempts " +
                                    "— giving up on auto-navigation for this generation.",
                            )
                        }
                        false
                    }
                }
                navPhase == NavPhase.PICK_SCENARIO -> trySelectScenario(game, targetScenario)
                else -> false
            }

        if (advanced) return true

        return when {
            ButtonConfirm.click(game.imageUtils) -> {
                game.wait(0.8)
                advanceToScenarioPhaseIfNeeded("Confirm")
                true
            }
            ButtonNext.click(game.imageUtils) -> {
                game.wait(0.8)
                advanceToScenarioPhaseIfNeeded("Next")
                true
            }
            ButtonOk.click(game.imageUtils) -> {
                game.wait(0.8)
                true
            }
            else -> false
        }
    }

    private fun advanceToScenarioPhaseIfNeeded(source: String) {
        if (navPhase == NavPhase.PICK_CHARACTER) {
            navPhase = NavPhase.PICK_SCENARIO
            scenarioTapAttempts = 0
            MessageLog.i(TAG, "Character confirmed via $source — advancing to scenario picker.")
        }
    }

    /** Tracen team hub (not in-career training, not career selection). */
    internal fun isOnTeamHomeHub(game: Game, campaign: Campaign): Boolean {
        if (campaign.checkMainScreen()) return false
        if (CareerSelectionAutomation.isOnCareerSelectionScreen(game)) return false
        return ButtonMenuBarHomeSelected.check(game.imageUtils) ||
            ButtonEditTeam.check(game.imageUtils) ||
            ButtonHomeSpecialMissions.check(game.imageUtils) ||
            ButtonHomePresents.check(game.imageUtils)
    }

    /** Bottom nav visible but Home tab is not active yet (includes Race tab). */
    internal fun needsHomeTab(game: Game): Boolean {
        if (ButtonMenuBarHomeSelected.check(game.imageUtils)) return false
        return ButtonMenuBarHomeUnselected.check(game.imageUtils) ||
            ButtonMenuBarRaceSelected.check(game.imageUtils)
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

    private fun trySelectScenario(game: Game, targetScenario: String): Boolean {
        if (scenarioTapAttempts >= MAX_SCENARIO_TAP_ATTEMPTS) {
            if (!navigationFailed) {
                navigationFailed = true
                MessageLog.w(
                    TAG,
                    "Scenario picker taps exhausted for \"$targetScenario\" after $scenarioTapAttempts attempts " +
                        "— giving up on auto-navigation for this generation.",
                )
            }
            return false
        }

        val ocrText = readScenarioPickerOcr(game)
        val keywords = scenarioKeywords(targetScenario)
        if (keywords.none { ocrText.contains(it) }) {
            MessageLog.w(TAG, "Scenario picker step but \"$targetScenario\" not detected in OCR; using card position.")
        }
        val (xFraction, yFraction) = scenarioTapFraction(targetScenario)
        val x = SharedData.displayWidth * xFraction
        val y = SharedData.displayHeight * yFraction
        scenarioTapAttempts++
        MessageLog.i(TAG, "Selecting scenario \"$targetScenario\" at (${x.toInt()}, ${y.toInt()}) (attempt $scenarioTapAttempts).")
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
            debugName = "gen_farm_scenario_picker",
        ).lowercase()
    }

    private fun selectCharacterFromList(game: Game, characterName: String): Boolean {
        var tapped = false
        ScrollList.processWithFallback(
            game,
            fallbackComponent = LabelEventProgress,
            entryDetectionConfig = ScrollListEntryDetectionConfig(bUseGeneric = true),
            keyExtractor = { entry -> SupportCardSelection.entryDedupeKey(entry) },
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
            scale = CHARACTER_LIST_OCR_SCALE,
            ocrEngine = "tesseract",
            debugName = "gen_farm_character_entry",
        ).lowercase()
}
