package com.steve1316.uma_android_automation.bot.solver

/**
 * Determines whether epithets can still be completed after confirmed race losses.
 *
 * Used by [SmartRaceSolverIntegration] to populate [SolverState.deadEpithets] when the bot
 * records a loss, so the solver re-plans around unreachable branches.
 */
internal object EpithetReachability {
    /**
     * Epithet names that can no longer be completed given wins, losses, and the race calendar.
     *
     * @param epithets Epithets in the active scenario / character context.
     * @param racesByTurn Full race calendar.
     * @param wins Confirmed wins so far.
     * @param lostRaceNames Race names that have been lost (each name can only be won once per career).
     * @param currentTurn Turn the bot is on; past calendar slots without a win are treated as missed.
     * @param completedEpithetNames Epithets already completed (including via [SolverState.completedEpithets]).
     * @param alreadyDead Epithets already marked dead before this evaluation.
     * @return Names newly identified as unreachable (not already in [alreadyDead]).
     */
    fun epithetsMadeUnreachable(
        epithets: List<Epithet>,
        racesByTurn: Map<TurnNumber, List<RaceCandidate>>,
        wins: List<RaceWin>,
        lostRaceNames: Set<String>,
        currentTurn: TurnNumber,
        completedEpithetNames: Set<String> = emptySet(),
        alreadyDead: Set<String> = emptySet(),
    ): Set<String> {
        if (epithets.isEmpty()) return emptySet()

        val dead = alreadyDead.toMutableSet()
        val newlyDead = mutableSetOf<String>()
        var changed = true
        while (changed) {
            changed = false
            for (epi in epithets) {
                if (epi.name in dead || epi.name in completedEpithetNames) continue
                if (EpithetTracker.isCompleted(epi, winsOnlyState(epi, epithets, wins, completedEpithetNames))) continue
                if (!isEpithetReachable(epi, epithets, wins, lostRaceNames, racesByTurn, currentTurn, completedEpithetNames, dead)) {
                    if (dead.add(epi.name)) {
                        newlyDead.add(epi.name)
                        changed = true
                    }
                }
            }
        }
        return newlyDead
    }

  private fun winsOnlyState(
        epithet: Epithet,
        allEpithets: List<Epithet>,
        wins: List<RaceWin>,
        completedEpithetNames: Set<String>,
    ): SolverState =
        SolverState(
            currentTurn = 1,
            scenario = "",
            characterPreset = null,
            aptitudes = Aptitudes.DEFAULT_A,
            racesByTurn = emptyMap(),
            epithets = allEpithets,
            raceHistory = wins,
            completedEpithets = completedEpithetNames,
        )

    private fun isEpithetReachable(
        epithet: Epithet,
        allEpithets: List<Epithet>,
        wins: List<RaceWin>,
        lostRaceNames: Set<String>,
        racesByTurn: Map<TurnNumber, List<RaceCandidate>>,
        currentTurn: TurnNumber,
        completedEpithetNames: Set<String>,
        deadEpithets: Set<String>,
    ): Boolean =
        epithet.matchers.all { matcher ->
            canMatcherStillBeSatisfied(
                matcher,
                allEpithets,
                wins,
                lostRaceNames,
                racesByTurn,
                currentTurn,
                completedEpithetNames,
                deadEpithets,
            )
        }

    private fun canMatcherStillBeSatisfied(
        matcher: EpithetMatcher,
        allEpithets: List<Epithet>,
        wins: List<RaceWin>,
        lostRaceNames: Set<String>,
        racesByTurn: Map<TurnNumber, List<RaceCandidate>>,
        currentTurn: TurnNumber,
        completedEpithetNames: Set<String>,
        deadEpithets: Set<String>,
    ): Boolean {
        return when (matcher) {
            is EpithetMatcher.WinRace ->
                maxWinsPossibleForRaceName(matcher.name, matcher.atClass, wins, lostRaceNames, racesByTurn, currentTurn) >= 1
            is EpithetMatcher.WinRaceTimes ->
                maxWinsPossibleForRaceName(matcher.name, null, wins, lostRaceNames, racesByTurn, currentTurn) >= matcher.times
            is EpithetMatcher.WinAnyOf ->
                maxWinsPossibleFromPool(matcher.names, matcher.atClass, wins, lostRaceNames, racesByTurn, currentTurn) >= matcher.count
            is EpithetMatcher.WinAtLeast ->
                maxDistinctWinsPossibleFromPool(matcher.names, wins, lostRaceNames, racesByTurn, currentTurn) >= matcher.count
            is EpithetMatcher.WinCount ->
                maxWinsPossibleForFilter(matcher.filter, wins, lostRaceNames, racesByTurn, currentTurn) >= matcher.count
            is EpithetMatcher.EpithetAnyOf ->
                matcher.names.any { dep ->
                    dep in completedEpithetNames ||
                        dep !in deadEpithets &&
                            allEpithets
                                .firstOrNull { it.name == dep }
                                ?.let {
                                    isEpithetReachable(
                                        it,
                                        allEpithets,
                                        wins,
                                        lostRaceNames,
                                        racesByTurn,
                                        currentTurn,
                                        completedEpithetNames,
                                        deadEpithets,
                                    )
                                } == true
                }
            is EpithetMatcher.EpithetAll ->
                matcher.names.all { dep ->
                    dep in completedEpithetNames ||
                        dep !in deadEpithets &&
                            allEpithets
                                .firstOrNull { it.name == dep }
                                ?.let {
                                    isEpithetReachable(
                                        it,
                                        allEpithets,
                                        wins,
                                        lostRaceNames,
                                        racesByTurn,
                                        currentTurn,
                                        completedEpithetNames,
                                        deadEpithets,
                                    )
                                } == true
                }
        }
    }

    private fun maxWinsPossibleForRaceName(
        name: String,
        atClass: String?,
        wins: List<RaceWin>,
        lostRaceNames: Set<String>,
        racesByTurn: Map<TurnNumber, List<RaceCandidate>>,
        currentTurn: TurnNumber,
    ): Int {
        val have = wins.count { win -> win.name == name && classMatches(win.classYear, atClass) }
        if (name in lostRaceNames) return have
        val futureSlots =
            calendarSlotsForName(name, atClass, racesByTurn).count { turn ->
                turn >= currentTurn && !wins.any { it.turnNumber == turn && it.name == name }
            }
        return have + futureSlots
    }

    private fun maxWinsPossibleFromPool(
        names: List<String>,
        atClass: String?,
        wins: List<RaceWin>,
        lostRaceNames: Set<String>,
        racesByTurn: Map<TurnNumber, List<RaceCandidate>>,
        currentTurn: TurnNumber,
    ): Int {
        val pool = names.toSet()
        val have =
            wins.count { win ->
                win.name in pool && classMatches(win.classYear, atClass)
            }
        val future =
            names.sumOf { name ->
                if (name in lostRaceNames) 0
                else calendarSlotsForName(name, atClass, racesByTurn).count { turn ->
                    turn >= currentTurn && !wins.any { it.turnNumber == turn && it.name == name }
                }
            }
        return have + future
    }

    private fun maxDistinctWinsPossibleFromPool(
        names: List<String>,
        wins: List<RaceWin>,
        lostRaceNames: Set<String>,
        racesByTurn: Map<TurnNumber, List<RaceCandidate>>,
        currentTurn: TurnNumber,
    ): Int {
        val pool = names.toSet()
        val wonNames = wins.map { it.name }.toSet().intersect(pool)
        val stillPossible =
            names.count { name ->
                name !in wonNames &&
                    name !in lostRaceNames &&
                    calendarSlotsForName(name, null, racesByTurn).any { turn ->
                        turn >= currentTurn && !wins.any { it.turnNumber == turn && it.name == name }
                    }
            }
        return wonNames.size + stillPossible
    }

    private fun maxWinsPossibleForFilter(
        filter: EpithetFilter,
        wins: List<RaceWin>,
        lostRaceNames: Set<String>,
        racesByTurn: Map<TurnNumber, List<RaceCandidate>>,
        currentTurn: TurnNumber,
    ): Int {
        val have = wins.count { win -> raceWinMatchesFilter(win, filter, racesByTurn) }
        val future =
            racesByTurn.entries.sumOf { (turn, races) ->
                if (turn < currentTurn) 0
                else races.count { race ->
                    race.name !in lostRaceNames &&
                        EpithetFilters.raceMatchesFilter(race, filter) &&
                        !wins.any { it.turnNumber == turn && it.name == race.name }
                }
            }
        return have + future
    }

    private fun calendarSlotsForName(
        name: String,
        atClass: String?,
        racesByTurn: Map<TurnNumber, List<RaceCandidate>>,
    ): List<TurnNumber> =
        racesByTurn.entries
            .filter { (_, races) -> races.any { race -> race.name == name && classMatches(race.classYear, atClass) } }
            .map { it.key }
            .sorted()

    private fun classMatches(classYear: String, atClass: String?): Boolean =
        atClass == null || classYear.equals(atClass, ignoreCase = true)

    private fun raceWinMatchesFilter(
        win: RaceWin,
        filter: EpithetFilter,
        racesByTurn: Map<TurnNumber, List<RaceCandidate>>,
    ): Boolean {
        val race =
            racesByTurn[win.turnNumber]?.firstOrNull { it.key == win.raceKey || it.name == win.name }
                ?: return false
        return EpithetFilters.raceMatchesFilter(race, filter)
    }
}
