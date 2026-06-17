package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.bot.solver.Decision
import com.steve1316.uma_android_automation.types.MainScreenAction

/**
 * Shared Smart Race Solver main-screen gate for non-Trackblazer scenarios.
 */
object SmartRaceSolverMainScreenGate {
    private const val TAG = "[SOLVER_GATE]"

    /**
     * When the solver planned a race or rest for this turn, return that action.
     * Returns null when the solver has no opinion or force-racing overrides apply.
     */
    fun maybeSolverMainScreenAction(campaign: Campaign, scenario: String, turn: Int): MainScreenAction? {
        if (!SettingsHelper.getBooleanSetting("racing", "enableSmartRaceSolver", false)) return null
        if (SettingsHelper.getBooleanSetting("racing", "enableForceRacing", false)) return null

        return when (val solverDecision = SmartRaceSolverIntegration.peekDecisionForTurn(currentTurn = turn, scenario = scenario)) {
            is Decision.RaceDecision -> {
                MessageLog.i(TAG, "Smart Race Solver has \"${solverDecision.raceKey}\" planned for turn $turn; deferring to racing flow.")
                campaign.decisionTracer.recordActionChoice(
                    MainScreenAction.RACE,
                    "Smart Race Solver planned race \"${solverDecision.raceKey}\" for this turn",
                )
                MainScreenAction.RACE
            }
            Decision.Rest -> {
                MessageLog.i(TAG, "Smart Race Solver planned Rest for turn $turn.")
                campaign.decisionTracer.recordActionChoice(MainScreenAction.REST, "Smart Race Solver planned Rest for this turn")
                MainScreenAction.REST
            }
            else -> null
        }
    }
}
