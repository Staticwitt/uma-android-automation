package com.steve1316.uma_android_automation.bot.campaigns

import android.graphics.Bitmap
import android.util.Log
import com.steve1316.automation_library.utils.DiscordUtils
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.bot.AppDiscordNotifications
import com.steve1316.uma_android_automation.bot.Campaign
import com.steve1316.uma_android_automation.bot.DialogHandlerResult
import com.steve1316.uma_android_automation.bot.Game
import com.steve1316.uma_android_automation.bot.MainScreenAction
import com.steve1316.uma_android_automation.components.IconRaceDayRibbon
import com.steve1316.uma_android_automation.components.LabelScheduledRace
import com.steve1316.uma_android_automation.components.ButtonNext
import com.steve1316.uma_android_automation.components.ButtonNextRaceEnd
import com.steve1316.uma_android_automation.components.ButtonSelectOpponent
import com.steve1316.uma_android_automation.components.ButtonSkip
import com.steve1316.uma_android_automation.components.ButtonUnityCupRace
import com.steve1316.uma_android_automation.components.ButtonUnityCupRaceFinal
import com.steve1316.uma_android_automation.components.ButtonUnityCupSeeAllRaceResults
import com.steve1316.uma_android_automation.components.ButtonUnityCupWatchMainRace
import com.steve1316.uma_android_automation.components.DialogInterface
import com.steve1316.uma_android_automation.components.IconDoubleCircle
import com.steve1316.uma_android_automation.components.IconTrainingEventHorseshoe
import com.steve1316.uma_android_automation.components.IconUnityCupRaceEndLogo
import com.steve1316.uma_android_automation.components.IconUnityCupTutorialHeader
import com.steve1316.uma_android_automation.components.LabelUnityCupOpponentSelectionLaurel
import org.opencv.core.Point

/**
 * Handles the Unity Cup scenario with scenario-specific logic and handling.
 *
 * @property game The [Game] instance for interacting with the game state.
 */
class UnityCup(game: Game) : Campaign(game) {
    override val training = UnityCupTraining(game, this)

    /** Flag indicating if the tutorial has been disabled. */
    private var tutorialDisabled = false

    /** Flag indicating if the bot is currently in the finals. */
    private var bIsFinals: Boolean = false

    /** Counts Unity Cup rounds completed this career (incremented at each race-end exit). */
    private var unityCupRoundNumber: Int = 0

    /** Whether to send a Discord notification after each Unity Cup round completes. */
    private val enableScenarioProgressPings: Boolean = SettingsHelper.getBooleanSetting("discord", "enableScenarioProgressPings", false)

    /** The index of the currently selected opponent. */
    private var selectedOpponentIndex: Int = 0

    /** Flag indicating if the opponent selection should be overridden. */
    private var bOverrideOpponentSelection: Boolean = false

    /** Whether to deliberately seek out and challenge the pink-highlighted "Elite Team" opponent when one is offered, instead of the default race-prediction-favorability logic. */
    private val preferEliteTeamOpponent: Boolean = SettingsHelper.getBooleanSetting("training", "preferEliteTeamOpponent", false)

    /** Whether to tap Try Again on a lost Unity Cup race instead of accepting the loss. */
    private val enableRetryUnityCupRaces: Boolean = SettingsHelper.getBooleanSetting("racing", "enableRetryUnityCupRaces", false)

    /** Index of the opponent detected as the Elite Team on the current "Select Opponent" screen, or null if not found/not yet checked/disabled. Reset each time this screen is (re-)entered. */
    private var eliteTeamOpponentIndex: Int? = null

    /** Whether the opponent currently being confirmed is the deliberately-chosen Elite Team - bypasses the usual race-prediction gating in the confirmation dialog since Elite Teams are meant to be a harder, opt-in challenge. */
    private var bPickedEliteTeam: Boolean = false

    // //////////////////////////////////////////////////////////////////////////////////////////////////
    // //////////////////////////////////////////////////////////////////////////////////////////////////

    override fun decideNextAction(): MainScreenAction {
        if (!SettingsHelper.getBooleanSetting("training", "enableUnityCupTrainOnlyMode", false)) {
            return super.decideNextAction()
        }

        val sourceBitmap = game.imageUtils.getSourceBitmap()

        // Mandatory and scheduled race days always race.
        val bIsScheduledRaceDay = LabelScheduledRace.check(game.imageUtils, sourceBitmap = sourceBitmap)
        val bIsMandatoryRaceDay = IconRaceDayRibbon.check(game.imageUtils, sourceBitmap = sourceBitmap)
        if (bIsMandatoryRaceDay || bIsScheduledRaceDay) {
            val reason = if (bIsMandatoryRaceDay) "Mandatory race day" else "Scheduled race day"
            decisionTracer.recordActionChoice(MainScreenAction.RACE, "[UNITY_CUP_TRAIN_ONLY] $reason")
            return MainScreenAction.RACE
        }

        // A race popup already on screen must be resolved.
        if (racing.encounteredRacingPopup) {
            decisionTracer.recordActionChoice(MainScreenAction.RACE, "[UNITY_CUP_TRAIN_ONLY] Racing popup already on screen from prior turn")
            return MainScreenAction.RACE
        }

        // Maiden race is a required one-time event.
        if (!bHasCheckedForMaidenRaceToday && !date.bIsPreDebut && !trainee.bHasCompletedMaidenRace) {
            decisionTracer.recordActionChoice(MainScreenAction.RACE, "[UNITY_CUP_TRAIN_ONLY] Maiden race not yet completed")
            return MainScreenAction.RACE
        }

        // Fan/trophy requirements must be met.
        if (racing.hasFanRequirement || racing.hasTrophyRequirement) {
            decisionTracer.recordActionChoice(MainScreenAction.RACE, "[UNITY_CUP_TRAIN_ONLY] Racing requirement (fans or trophy) active")
            return MainScreenAction.RACE
        }

        // Injury and mood recovery still apply.
        val isFinals = checkFinals()
        val hasInjury = if (isFinals) false else checkInjury(sourceBitmap)
        if (hasInjury) {
            decisionTracer.recordActionChoice(MainScreenAction.NONE, "[UNITY_CUP_TRAIN_ONLY] Injury detected; turn aborted")
            return MainScreenAction.NONE
        }
        if (shouldRecoverMood(sourceBitmap)) {
            decisionTracer.recordActionChoice(MainScreenAction.RECOVER_MOOD, "[UNITY_CUP_TRAIN_ONLY] shouldRecoverMood returned true (mood ${trainee.mood})")
            return MainScreenAction.RECOVER_MOOD
        }

        // SmartRaceSolver and extra-race eligibility are intentionally skipped.

        // Energy banking before mandatory race still applies.
        if (enableEnergyBanking && !isFinals && trainee.energy < energyBankingThreshold) {
            val turnsRemaining = game.imageUtils.determineTurnsRemainingBeforeNextGoal()
            if (turnsRemaining in 1..energyBankingLookaheadTurns) {
                MessageLog.i(TAG, "[UNITY_CUP_TRAIN_ONLY] Energy banking: $turnsRemaining turn(s) remain and energy is ${trainee.energy}% (< $energyBankingThreshold%). Resting.")
                decisionTracer.recordActionChoice(MainScreenAction.REST, "[UNITY_CUP_TRAIN_ONLY] Energy banking ($turnsRemaining turns; energy ${trainee.energy}% < $energyBankingThreshold%)")
                return MainScreenAction.REST
            }
        }

        MessageLog.i(TAG, "[UNITY_CUP_TRAIN_ONLY] Train-only mode active — defaulting to training.")
        decisionTracer.recordActionChoice(MainScreenAction.TRAIN, "[UNITY_CUP_TRAIN_ONLY] Train-only mode: defaulting to training")
        return MainScreenAction.TRAIN
    }

    override fun handleDialogs(dialog: DialogInterface?, args: Map<String, Any>): DialogHandlerResult {
        val result: DialogHandlerResult = super.handleDialogs(dialog, args)
        if (result !is DialogHandlerResult.Unhandled) {
            return result
        }

        when (result.dialog.name) {
            "auto_fill" -> {
                result.dialog.close(game.imageUtils)
            }

            // A lost Unity Cup race pops the Try Again dialog. Previously no handler claimed it, so the race
            // loop tapped around it until the 30s "Race event took too long" timeout aborted the whole event.
            // Retry when the user opted in; otherwise Cancel (dialog.close falls back to the Cancel button)
            // to accept the loss and let the race flow finish normally.
            "try_again" -> {
                if (enableRetryUnityCupRaces) {
                    MessageLog.i(TAG, "[UNITY_CUP] Race was lost. Retrying it since Retry Unity Cup Races is enabled.")
                    result.dialog.ok(game.imageUtils)
                    game.waitForLoading()
                } else {
                    MessageLog.i(TAG, "[UNITY_CUP] Race was lost. Accepting the result and moving on.")
                    result.dialog.close(game.imageUtils)
                }
            }

            "unity_cup_confirmation" -> {
                if (bIsFinals) {
                    result.dialog.ok(game.imageUtils)
                } else if (bPickedEliteTeam) {
                    MessageLog.i(TAG, "[UNITY_CUP] Confirming the Elite Team challenge regardless of race prediction.")
                    result.dialog.ok(game.imageUtils)
                } else if (bOverrideOpponentSelection || analyzeOpponentRacePrediction()) {
                    result.dialog.ok(game.imageUtils)
                } else {
                    result.dialog.close(game.imageUtils)
                    if (selectedOpponentIndex >= 2) {
                        MessageLog.w(TAG, "[WARN] handleDialogs:: Could not determine any opponent with sufficient double circle predictions. Selecting the 2nd opponent as a fallback.")
                        selectedOpponentIndex = 1
                        bOverrideOpponentSelection = true
                    } else {
                        selectedOpponentIndex++
                    }
                }
                game.wait(0.5)
                return DialogHandlerResult.Handled(result.dialog)
            }

            else -> {
                Log.w(TAG, "[WARN] handleDialogs:: Unknown dialog \"${result.dialog.name}\" detected so it will not be handled.")
                return DialogHandlerResult.Unhandled(result.dialog)
            }
        }
        game.wait(0.5)
        return DialogHandlerResult.Handled(result.dialog)
    }

    override fun handleTrainingEvent() {
        if (!tutorialDisabled) {
            tutorialDisabled =
                if (IconUnityCupTutorialHeader.check(game.imageUtils)) {
                    // If the tutorial is detected, select the second option to close it.
                    MessageLog.i(TAG, "\n[UNITY_CUP] Detected tutorial for Unity Cup. Closing it now...")
                    val trainingOptionLocations: ArrayList<Point> = IconTrainingEventHorseshoe.findAll(game.imageUtils)
                    game.gestureUtils.tap(trainingOptionLocations[1].x, trainingOptionLocations[1].y, IconTrainingEventHorseshoe.template.path)
                    true
                } else {
                    MessageLog.i(TAG, "\n[UNITY_CUP] Tutorial must have already been dismissed.")
                    super.handleTrainingEvent()
                    true
                }
        } else {
            super.handleTrainingEvent()
        }
    }

    override fun handleRaceEvents(isScheduledRace: Boolean): Boolean {
        if (ButtonUnityCupRace.check(game.imageUtils)) {
            // Handle the Unity Cup race.
            MessageLog.i(TAG, "[UNITY_CUP] Will start the process for Unity Cup race handling.")
            handleRaceEventsUnityCup()
            return true
        }

        // Fall back to the regular race handling logic.
        return super.handleRaceEvents(isScheduledRace)
    }

    override fun checkCampaignSpecificConditions(): Boolean {
        return handleRaceEventsUnityCup()
    }

    /**
     * Analyzes the opponent race prediction images to determine if they are favorable.
     *
     * @return True if there are sufficient double circle predictions, false otherwise.
     */
    private fun analyzeOpponentRacePrediction(): Boolean {
        val doubleCircles = IconDoubleCircle.findAll(game.imageUtils, region = game.imageUtils.regionMiddle, confidence = 0.0)
        if (doubleCircles.size >= 3) {
            MessageLog.i(TAG, "[UNITY_CUP] Race #${selectedOpponentIndex + 1} has sufficient double circle predictions. Selecting it now...")
            return true
        } else {
            MessageLog.i(TAG, "[UNITY_CUP] Race #${selectedOpponentIndex + 1} only had ${doubleCircles.size} double predictions and falls short. Skipping this opponent.")
            return false
        }
    }

    /**
     * Handles the scenario-specific process for Unity Cup races.
     *
     * @return True if the race sequence was completed, false otherwise.
     */
    private fun handleRaceEventsUnityCup(): Boolean {
        MessageLog.i(TAG, "[UNITY_CUP] Starting process for handling the Unity Cup racing process.")

        // If none of these exist then we aren't in any Unity Cup screens at the moment. Abort.
        if (!ButtonUnityCupRace.check(game.imageUtils) && !ButtonUnityCupRaceFinal.check(game.imageUtils) && !ButtonUnityCupWatchMainRace.check(game.imageUtils)) {
            return false
        }

        // We use this as a means of exiting the loop if it runs too long.
        val executionTimeThresholdMs = 30000 // 30 seconds.
        val startTime = System.currentTimeMillis()

        while (true) {
            val sourceBitmap: Bitmap = game.imageUtils.getSourceBitmap()
            when {
                handleDialogs() is DialogHandlerResult.Handled -> {}

                // Go to opponent selection screen.
                ButtonUnityCupRace.click(game.imageUtils, sourceBitmap = sourceBitmap) -> {
                    selectedOpponentIndex = 0
                    bOverrideOpponentSelection = false
                    eliteTeamOpponentIndex = null
                    bPickedEliteTeam = false
                    game.waitForLoading()
                }

                ButtonUnityCupRaceFinal.click(game.imageUtils, sourceBitmap = sourceBitmap) -> {
                    MessageLog.i(TAG, "[UNITY_CUP] Final race detected with Team Zenith.")
                    bIsFinals = true
                    game.waitForLoading()
                }

                // Handle opponent selection.
                ButtonSelectOpponent.check(game.imageUtils, sourceBitmap = sourceBitmap) -> {
                    val opponents: ArrayList<Point> = LabelUnityCupOpponentSelectionLaurel.findAll(game.imageUtils, sourceBitmap = sourceBitmap)
                    if (opponents.size != 3) {
                        MessageLog.e(TAG, "[ERROR] handleRaceEventsUnityCup:: Failed to detect all three opponents on opponent selection screen.")
                        return false
                    }

                    if (preferEliteTeamOpponent && eliteTeamOpponentIndex == null) {
                        val foundIndex = opponents.indices.firstOrNull { i -> game.imageUtils.isEliteTeamHighlighted(sourceBitmap, opponents[i], i) }
                        eliteTeamOpponentIndex = foundIndex ?: -1
                        if (foundIndex != null) {
                            MessageLog.i(TAG, "[UNITY_CUP] Detected an Elite Team opponent at position #${foundIndex + 1}. Will challenge it directly.")
                            selectedOpponentIndex = foundIndex
                        } else {
                            MessageLog.i(TAG, "[UNITY_CUP] No Elite Team opponent detected this round.")
                        }
                    }

                    selectedOpponentIndex = selectedOpponentIndex.coerceIn(0, opponents.lastIndex)
                    bPickedEliteTeam = eliteTeamOpponentIndex != null && selectedOpponentIndex == eliteTeamOpponentIndex
                    val opponent = opponents[selectedOpponentIndex]
                    game.gestureUtils.tap(opponent.x, opponent.y, LabelUnityCupOpponentSelectionLaurel.template.path)
                    // Tiny delay to allow the opponent selection click to register fully.
                    game.wait(0.1, skipWaitingForLoading = true)
                    MessageLog.i(TAG, "[UNITY_CUP] Selecting opponent #${selectedOpponentIndex + 1} at $opponent.")
                    ButtonSelectOpponent.click(game.imageUtils, sourceBitmap = sourceBitmap)
                    // Clicking SelectOpponent requires connect to server. Don't skip waiting for loading otherwise we might miss handling a dialog.
                    game.wait(game.dialogWaitDelay)
                }

                // If the skip button is locked, need to manually run the race.
                ButtonUnityCupSeeAllRaceResults.check(game.imageUtils, sourceBitmap = sourceBitmap) -> {
                    when (ButtonUnityCupSeeAllRaceResults.checkDisabled(game.imageUtils, sourceBitmap)) {
                        // Manually run the race.
                        true -> {
                            MessageLog.d(TAG, "[DEBUG] handleRaceEventsUnityCup:: See All Race Results button is locked. Manually running race...")
                            if (ButtonUnityCupWatchMainRace.click(game.imageUtils, sourceBitmap = sourceBitmap)) {
                                MessageLog.i(TAG, "[INFO] Clicked Watch Main Race button.")
                                game.waitForLoading()
                                racing.runRaceWithRetries()
                            } else {
                                MessageLog.w(TAG, "[WARN] handleRaceEventsUnityCup:: Failed to click the Watch Main Race button.")
                            }
                        }

                        // Skip the race.
                        false -> {
                            if (ButtonUnityCupSeeAllRaceResults.click(game.imageUtils, sourceBitmap = sourceBitmap)) {
                                MessageLog.i(TAG, "[INFO] Clicked the See All Race Results button to skip the race.")
                                game.waitForLoading()
                            } else {
                                MessageLog.w(TAG, "[WARN] handleRaceEventsUnityCup:: Failed to click the See All Race Results button.")
                            }
                        }

                        // Shouldn't ever fail this since we already detected it once.
                        null -> {
                            MessageLog.e(TAG, "[ERROR] handleRaceEventsUnityCup:: Detected See All Race Results button, but then failed to check its disabled state.")
                        }
                    }
                }

                // This is our only natural exit point from this function.
                IconUnityCupRaceEndLogo.check(game.imageUtils, sourceBitmap = sourceBitmap) && ButtonNext.click(game.imageUtils, sourceBitmap = sourceBitmap) -> {
                    unityCupRoundNumber++
                    MessageLog.i(TAG, "[INFO] Race event completed (round $unityCupRoundNumber).")
                    if (enableScenarioProgressPings && DiscordUtils.enableDiscordNotifications) {
                        val label = if (bIsFinals) "Finals" else "Round $unityCupRoundNumber"
                        AppDiscordNotifications.sendInfo(
                            title = "Unity Cup $label Complete",
                            description = if (bIsFinals) "The final race against Team Zenith has been resolved." else "Unity Cup Round $unityCupRoundNumber is done.",
                        )
                    }
                    return true
                }

                ButtonNext.click(game.imageUtils, sourceBitmap = sourceBitmap) -> {}

                ButtonSkip.click(game.imageUtils, sourceBitmap = sourceBitmap) -> {}

                ButtonNextRaceEnd.click(game.imageUtils, sourceBitmap = sourceBitmap) -> {
                    // Clicking this button triggers connection to server.
                    game.waitForLoading()
                }

                // Exit from function if it runs too long.
                System.currentTimeMillis() - startTime > executionTimeThresholdMs -> {
                    MessageLog.w(TAG, "[WARN] handleRaceEventsUnityCup:: Race event took too long to complete. Aborting...")
                    return false
                }

                // Tap on the screen to skip past any intermediate screens.
                else -> {
                    game.tap(350.0, 750.0, taps = 3)
                }
            }
        }
    }
}
