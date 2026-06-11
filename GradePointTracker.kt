// =============================================================================
//  GradePointTracker — integration guide for Game.kt
//
//  Search for each "STEP N" comment and add the corresponding line(s).
//  Nothing else in your existing code needs to change.
// =============================================================================


// ── STEP 1 ───────────────────────────────────────────────────────────────────
// Declare the tracker as a property on your Game class (or wherever you keep
// per-run state like statTargets, currentYear, etc.).
//
// Place this near the top of the Game class body:

val gpTracker = GradePointTracker(
    isDirtCharacter = gameData.character.hasDirtAptitude, // use your existing flag
    catchUpThresholdTurns = 8                             // tune if needed
)


// ── STEP 2 ───────────────────────────────────────────────────────────────────
// Reset the tracker at the start of each new career run.
//
// Add to wherever you reset stats targets, turn counters, etc.:

fun startNewCareerRun() {
    // ... your existing reset code ...
    if (currentScenario == Scenario.TRACKBLAZER) {
        gpTracker.reset()
    }
}


// ── STEP 3 ───────────────────────────────────────────────────────────────────
// Update the tracker's turn counter each loop iteration, after your existing
// OCR reads the current month/turn from the screen.
//
// In your main game loop, right after you update `currentTurnInYear`:

if (currentScenario == Scenario.TRACKBLAZER) {
    gpTracker.onTurnAdvanced(currentTurnInYear)
    // Log the summary so it appears in the Remote Log Viewer each turn:
    MessageLog.print(gpTracker.statusSummary())
}


// ── STEP 4 ───────────────────────────────────────────────────────────────────
// Record GP earned after every race result is read from the screen.
//
// In your race-completion handler (wherever you read placement from the result
// screen and log it), add:

if (currentScenario == Scenario.TRACKBLAZER) {
    val grade = detectRaceGrade()           // your existing grade-detection logic
    val placement = detectRacePlacement()   // your existing placement-reading logic
    gpTracker.onRaceCompleted(grade, placement)
}


// ── STEP 5 ───────────────────────────────────────────────────────────────────
// Advance the phase when Late December passes.
//
// In your year-end / phase-transition handler (wherever you increment
// currentYear or handle the end-of-year screen):

if (currentScenario == Scenario.TRACKBLAZER) {
    gpTracker.onPhaseCompleted()
}


// ── STEP 6 ───────────────────────────────────────────────────────────────────
// Inject into the decision engine's action-scoring logic.
//
// In your decideAction() / selectBestAction() function, modify the race
// scoring section.  The tracker slots in cleanly around your existing score:

fun decideAction(): Action {

    // ── Hard override: must race or the deadline will be missed ──────────────
    if (currentScenario == Scenario.TRACKBLAZER && gpTracker.mustRaceThisTurn) {
        val minGrade = gpTracker.recommendedMinGrade
        Log.d(TAG, "[UAA] GradePointTracker: HARD RACE OVERRIDE " +
                "(minGrade=${minGrade.name}, boost=${gpTracker.racePriorityBoost})")
        return Action.RACE  // the race-selection logic will then pick the best available race
    }

    // ── Normal scoring ───────────────────────────────────────────────────────
    var raceScore    = calculateBaseRaceScore()      // your existing function
    var trainScore   = calculateBestTrainingScore()  // your existing function

    // Trackblazer: add urgency boost to the race option
    if (currentScenario == Scenario.TRACKBLAZER) {
        // Weight of 40 is tunable — matches roughly "one good training turn's worth" of value
        val RACE_BOOST_WEIGHT = 40f
        raceScore += gpTracker.racePriorityBoost * RACE_BOOST_WEIGHT
    }

    return if (raceScore >= trainScore) Action.RACE else Action.TRAIN
}


// ── STEP 7 (optional but recommended) ────────────────────────────────────────
// Filter available races in race-selection logic to prefer the minimum grade
// the tracker recommends.
//
// In your selectRace() / pickBestRace() function:

fun selectRace(availableRaces: List<Race>): Race {
    val filtered = if (currentScenario == Scenario.TRACKBLAZER && gpTracker.isCatchUpModeActive) {
        val minGrade = gpTracker.recommendedMinGrade
        // Prefer races at or above the minimum grade; fall back to all races if none qualify
        availableRaces.filter { it.grade <= minGrade }.takeIf { it.isNotEmpty() }
            ?: availableRaces
    } else {
        availableRaces
    }

    // ... rest of your existing race selection logic (stat fit, aptitude, etc.) ...
    return filtered.maxByOrNull { scoreRace(it) } ?: availableRaces.first()
}