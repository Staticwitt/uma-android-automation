package com.steve1316.uma_android_automation.bot

import android.graphics.Bitmap
import android.util.Log
import com.steve1316.automation_library.data.SharedData
import com.steve1316.automation_library.utils.BotService
import com.steve1316.automation_library.utils.DiscordUtils
import com.steve1316.automation_library.utils.ImageUtils.ScaleConfidenceResult
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.bot.solver.SmartRaceSolverIntegration
import com.steve1316.uma_android_automation.bot.AppDiscordNotifications
import com.steve1316.uma_android_automation.bot.ParentRunArchive
import com.steve1316.uma_android_automation.bot.ParentRunSummary
import com.steve1316.uma_android_automation.bot.ParentDiscordNotifier
import com.steve1316.uma_android_automation.components.ButtonBack
import com.steve1316.uma_android_automation.components.ButtonCancel
import com.steve1316.uma_android_automation.components.ButtonCareerEndSkills
import com.steve1316.uma_android_automation.components.ButtonChangeRunningStyle
import com.steve1316.uma_android_automation.components.ButtonClose
import com.steve1316.uma_android_automation.components.ButtonCompleteCareer
import com.steve1316.uma_android_automation.components.ButtonCraneGame
import com.steve1316.uma_android_automation.components.ButtonCraneGameOk
import com.steve1316.uma_android_automation.components.ButtonDetails
import com.steve1316.uma_android_automation.components.ButtonEventProgressChevron
import com.steve1316.uma_android_automation.components.ButtonHomeFansInfo
import com.steve1316.uma_android_automation.components.ButtonHomeFullStats
import com.steve1316.uma_android_automation.components.ButtonInfirmary
import com.steve1316.uma_android_automation.components.ButtonInheritance
import com.steve1316.uma_android_automation.components.ButtonNext
import com.steve1316.uma_android_automation.components.ButtonNextRaceEnd
import com.steve1316.uma_android_automation.components.ButtonOk
import com.steve1316.uma_android_automation.components.ButtonRaceStrategyEnd
import com.steve1316.uma_android_automation.components.ButtonRaceStrategyFront
import com.steve1316.uma_android_automation.components.ButtonRaceStrategyLate
import com.steve1316.uma_android_automation.components.ButtonRaceStrategyPace
import com.steve1316.uma_android_automation.components.ButtonRecreation
import com.steve1316.uma_android_automation.components.ButtonRest
import com.steve1316.uma_android_automation.components.ButtonRestAndRecreation
import com.steve1316.uma_android_automation.components.ButtonSkills
import com.steve1316.uma_android_automation.components.ButtonSkip
import com.steve1316.uma_android_automation.components.ButtonTraining
import com.steve1316.uma_android_automation.components.ButtonTryAgain
import com.steve1316.uma_android_automation.components.ButtonUnityCupRace
import com.steve1316.uma_android_automation.components.DialogInterface
import com.steve1316.uma_android_automation.components.DialogUtils
import com.steve1316.uma_android_automation.components.IconGoalRibbon
import com.steve1316.uma_android_automation.components.IconInfirmaryEventHeader
import com.steve1316.uma_android_automation.components.IconOneFreePerDayTooltip
import com.steve1316.uma_android_automation.components.IconRaceDayRibbon
import com.steve1316.uma_android_automation.components.IconRaceNotEnoughFans
import com.steve1316.uma_android_automation.components.IconRecreationDate
import com.steve1316.uma_android_automation.components.IconRecreationDateOpen
import com.steve1316.uma_android_automation.components.IconTazuna
import com.steve1316.uma_android_automation.components.IconTrainingEventHorseshoe
import com.steve1316.uma_android_automation.components.LabelCareerRankTitle
import com.steve1316.uma_android_automation.components.LabelEnergy
import com.steve1316.uma_android_automation.components.LabelEventProgress
import com.steve1316.uma_android_automation.components.LabelOrdinaryCuties
import com.steve1316.uma_android_automation.components.LabelRecreationDateComplete
import com.steve1316.uma_android_automation.components.LabelRecreationUmamusume
import com.steve1316.uma_android_automation.components.LabelScheduledRace
import com.steve1316.uma_android_automation.components.LabelStatTableHeaderSkillPoints
import com.steve1316.uma_android_automation.components.LabelUmamusumeClassFans
import com.steve1316.uma_android_automation.types.Aptitude
import com.steve1316.uma_android_automation.types.BoundingBox
import com.steve1316.uma_android_automation.types.ConditionList
import com.steve1316.uma_android_automation.types.DateMonth
import com.steve1316.uma_android_automation.types.DatePhase
import com.steve1316.uma_android_automation.types.DateYear
import com.steve1316.uma_android_automation.types.FanCountClass
import com.steve1316.uma_android_automation.types.GameDate
import com.steve1316.uma_android_automation.types.Mood
import com.steve1316.uma_android_automation.types.RaceGrade
import com.steve1316.uma_android_automation.types.RunningStyle
import com.steve1316.uma_android_automation.types.SkillList
import com.steve1316.uma_android_automation.types.StatName
import com.steve1316.uma_android_automation.types.TrackDistance
import com.steve1316.uma_android_automation.types.TrackSurface
import com.steve1316.uma_android_automation.types.Trainee
import com.steve1316.uma_android_automation.utils.LogStreamServer
import com.steve1316.uma_android_automation.utils.ScrollList
import com.steve1316.uma_scoring.RankAptitudes
import com.steve1316.uma_scoring.SkillScoreInput
import com.steve1316.uma_scoring.estimateRank
import org.opencv.core.Point
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/** Defines an exception for breaking from the main loop when conditions are met.
 *
 * @param message A helpful message describing what breakpoint we hit.
 */
class CampaignBreakpointException(message: String, val abandonedRun: Boolean = false) : Exception(message)

/**
 * Whether a would-be training turn should become a rest turn because energy is under the configured floor.
 * A floor of 0 disables the check so it never blocks. Pure so it is unit-testable without a live Campaign.
 */
fun shouldRestForEnergyFloor(energy: Int, minimumEnergyToTrain: Int): Boolean = minimumEnergyToTrain > 0 && energy < minimumEnergyToTrain

/** Defines an enum representing the various actions the bot can take when at the Main screen.
 */
enum class MainScreenAction {
    /** Indicates a racing action. */
    RACE,

    /** Indicates a training action. */
    TRAIN,

    /** Indicates a resting action. */
    REST,

    /** Indicates a mood recovery action. */
    RECOVER_MOOD,

    /** Indicates a recreation/dating outing action. */
    DATE,

    /** Indicates no action. */
    NONE,
}

// Position of the "Group Event Progress X/Y" text relative to the right edge of the matched "Group Event Progress" pill ([LabelEventProgress]), for OCR. Tune if the "GroupEventProgress" debug crop misses the digits.
private const val GROUP_PROGRESS_GAP_X = 15
private const val GROUP_PROGRESS_WIDTH = 120

// Number of half-second polls to wait for the Try Again dialog to leave the screen after clicking it.
// It normally goes within a poll or two, so this is just headroom for a slow tap or a laggy transition.
private const val TRY_AGAIN_DIALOG_CLOSE_ATTEMPTS = 20

/**
 * Whether mood recovery should be skipped because the finale is underway. Recovering mood with at most three turns left wastes one of them, so from the first finale turn (day 73, the
 * same boundary as GameDate.bIsFinaleSeason's day > 72) the bot should train or race instead. Pure so it is unit-testable without a live Campaign.
 *
 * @param day The current turn (1-75).
 * @return True when the finale has started and mood recovery should be skipped.
 */
internal fun shouldSkipMoodRecoveryForFinale(day: Int): Boolean = day >= 73

/**
 * Parses a mood-recovery-floor setting name into a [Mood]. The floor is the mood the trainee must be below before recovery is attempted, so a higher floor recovers more eagerly.
 * Unknown values fall back to [Mood.GOOD], which matches the default recover-below-Good behavior. Pure so it is unit-testable without a live Campaign.
 *
 * @param name The setting string ("GOOD", "NORMAL", or "BAD").
 * @return The parsed floor, or [Mood.GOOD] when the name is not recognized.
 */
internal fun parseMoodRecoveryFloor(name: String): Mood =
    when (name.uppercase()) {
        "NORMAL" -> Mood.NORMAL
        "BAD" -> Mood.BAD
        else -> Mood.GOOD
    }

/**
 * Resolves the pre-summer preparation action. Before summer training the trainee wants full energy and a Great mood, so this rests when energy is low, recovers mood when it is not yet
 * Great, and otherwise trains (Wit). Pure so the priority is unit-testable without a live Campaign.
 *
 * @param energy The trainee's current energy percentage.
 * @param mood The trainee's current mood.
 * @param firstTrainingCheck Whether this is the first training check of the turn, which defers mood recovery in favor of training.
 * @return The chosen pre-summer action.
 */
internal fun resolvePreSummerAction(energy: Int, mood: Mood, firstTrainingCheck: Boolean): MainScreenAction =
    when {
        energy < 70 -> MainScreenAction.REST
        mood < Mood.GREAT && !firstTrainingCheck -> MainScreenAction.RECOVER_MOOD
        else -> MainScreenAction.TRAIN
    }

/**
 * Whether the G1-day preference should peek at the training screen this turn. On a G1 race day the bot would normally take the free race, so this runs only when the feature is enabled,
 * the trainee is past Junior year, it is not summer or the finale, energy clears the extra-racing floor, and a G1 race is actually available. Pure so the gate is unit-testable.
 *
 * @param enabled Whether the G1-day preference setting is turned on.
 * @param year The trainee's current career year.
 * @param isSummer Whether it is currently a summer turn (trainings differ and racing is skipped).
 * @param isFinals Whether the finale is underway.
 * @param energy The trainee's current energy percentage.
 * @param minEnergy The extra-racing energy floor the trainee must clear to bother evaluating trainings.
 * @param hasG1Race Lazily whether a G1 race is scheduled for the current turn. Evaluated last so the SQLite race lookup only runs once the cheap gates (enabled/year/summer/finale/energy) pass.
 * @return True when the pre-screen should enter the training screen to compare a rainbow training against the race.
 */
internal fun shouldRunG1DayPreScreen(enabled: Boolean, year: DateYear, isSummer: Boolean, isFinals: Boolean, energy: Int, minEnergy: Int, hasG1Race: () -> Boolean): Boolean =
    enabled && year > DateYear.JUNIOR && !isSummer && !isFinals && energy >= minEnergy && hasG1Race()

/**
 * Whether a rainbow training is strong enough to stay and train instead of taking the G1 race. The best training's rainbow count must meet the configured threshold. Pure and testable.
 *
 * @param bestNumRainbow The highest rainbow count across the analyzed trainings this turn.
 * @param minRainbowCount The minimum rainbow count that justifies training over racing.
 * @return True when the best training should be trained rather than skipping to the race.
 */
internal fun g1DayPrefersTraining(bestNumRainbow: Int, minRainbowCount: Int): Boolean = bestNumRainbow >= minRainbowCount

/**
 * Defines the base campaign class that contains all shared logic for campaign automation.
 *
 * Campaign-specific logic should be implemented in subclasses by overriding the appropriate methods.
 *
 * @property game The [Game] instance for interacting with the game state.
 */
abstract class Campaign(game: Game) : Task(game) {
    /** Required instance of the Racing class. */
    protected val racing: Racing = Racing(game, this)

    /** Required instance of the SkillPlan class. */
    protected val skillPlan: SkillPlan = SkillPlan(game, this)

    /** Required instance of the Trainee class. */
    val trainee: Trainee = Trainee()

    /** Required instance of the Training class. Override to provide a scenario-specific Training subclass. */
    open val training: Training = Training(game, this)

    /** Required instance of the TrainingEvent class. */
    protected val trainingEvent: TrainingEvent = TrainingEvent(game, this)

    /** Required instance of the GameDate class. */
    var date: GameDate = GameDate(day = 1)

    /** Per-turn structured decision logger. Subclasses populate snapshots and reasoning via the various record... methods; the consolidated block is emitted at the end of `executeAction`. */
    val decisionTracer: DecisionTracer = DecisionTracer()

    /** Flag to track whether the bot should force Wit training during the pre-summer turn. */
    var bForcedWitTraining: Boolean = false

    /** Flag to track if the bot should force a specific target mood during recovery. */
    var forcedTargetMood: Mood? = null

    /** Whether the bot should attempt the crane game. */
    protected val enableCraneGameAttempt: Boolean = SettingsHelper.getBooleanSetting("general", "enableCraneGameAttempt")

    /** Whether the bot should check for a skill point threshold. */
    protected val enableSkillPointCheck: Boolean = SettingsHelper.getBooleanSetting("skills", "enableSkillPointCheck")

    /** Whether the bot should stop at a specified date. */
    protected val enableStopAtDate: Boolean = SettingsHelper.getBooleanSetting("general", "enableStopAtDate")

    /** Whether the bot should stop before the final race. */
    protected val enableStopBeforeFinals: Boolean = SettingsHelper.getBooleanSetting("general", "enableStopBeforeFinals")

    /** Whether the bot must rest before Summer. */
    protected val mustRestBeforeSummer: Boolean = SettingsHelper.getBooleanSetting("training", "mustRestBeforeSummer")

    /** Whether the bot should rest to bank energy ahead of an upcoming mandatory race, generalizing [mustRestBeforeSummer] beyond the Summer-prep window. */
    protected val enableEnergyBanking: Boolean = SettingsHelper.getBooleanSetting("training", "enableEnergyBanking", false)

    /** Minimum energy floor for training: on a would-be training turn below this, the bot rests instead. 0 disables the floor. */
    protected val minimumEnergyToTrain: Int = SettingsHelper.getIntSetting("training", "minimumEnergyToTrain", 0)

    /** When the energy floor triggers, try Wit training (which consumes no energy) before falling back to resting. */
    protected val enableWitOverRest: Boolean = SettingsHelper.getBooleanSetting("training", "enableWitOverRest", false)

    /** Set when the energy floor chose Wit-over-rest, so executeAction runs a viability-gated Wit training instead of the normal analyzer flow. */
    private var bWitOverRestTraining: Boolean = false

    /** Energy percentage below which [enableEnergyBanking] forces rest instead of training ahead of an upcoming mandatory race. */
    protected val energyBankingThreshold: Int = SettingsHelper.getIntSetting("training", "energyBankingThreshold", 50)

    /** Number of turns before the next mandatory race within which [enableEnergyBanking] applies. */
    protected val energyBankingLookaheadTurns: Int = SettingsHelper.getIntSetting("training", "energyBankingLookaheadTurns", 2)

    /** Minimum mood at or above which the bot will train through without forcing a mood-recovery outing. Below this threshold, mood recovery is forced. Defaults to [Mood.GOOD] to preserve prior hardcoded behavior. */
    protected val minimumMoodForTraining: Mood = Mood.fromName(SettingsHelper.getStringSetting("training", "minimumMoodForTraining", "GOOD")) ?: Mood.GOOD

    /** When enabled, at high energy the mood-recovery floor is relaxed one level so the bot trains through a one-step mood dip instead of spending the turn on recovery. Off by default. */
    protected val enableHighEnergyMoodTolerance: Boolean = SettingsHelper.getBooleanSetting("training", "enableHighEnergyMoodTolerance", false)

    /** The energy percentage at or above which [enableHighEnergyMoodTolerance] relaxes the mood-recovery floor. */
    protected val highEnergyMoodToleranceThreshold: Int = SettingsHelper.getIntSetting("training", "highEnergyMoodToleranceThreshold", 80)

    /** Projection-driven auto-abandon config: when enabled, a run whose projected final grade is below [autoAbandonTargetGrade] after turn [autoAbandonMinTurn] is stopped so an unattended farm can restart on a fresher run. Disabled by default. */
    private val autoAbandonConfig: AbandonConfig =
        AbandonConfig(
            enabled = SettingsHelper.getBooleanSetting("training", "enableAutoAbandon", false),
            minTurn = SettingsHelper.getIntSetting("training", "autoAbandonMinTurn", 36),
            targetGrade = SettingsHelper.getStringSetting("training", "autoAbandonTargetGrade", "A").ifBlank { "A" },
            minObservations = SettingsHelper.getIntSetting("training", "autoAbandonMinObservations", 8),
        )

    /** What to do when the run is projected below target: STOP the run (default) or NOTIFY once and keep running (a heads-up for an attended run instead of losing it). */
    private val autoAbandonAction: AbandonAction = AbandonAction.fromName(SettingsHelper.getStringSetting("training", "autoAbandonAction", "stop"))

    /** Latch so notify-mode sends the below-target heads-up only once per run instead of every turn after the trust turn. */
    private var bAutoAbandonNotified: Boolean = false

    /**
     * Resolves the [TrackDistance] of the upcoming mandatory/scheduled race for [GoalRaceStatBias],
     * or null when the feature is disabled, the race is outside its configured lookahead window, the
     * turns-remaining OCR check fails, or the race's distance can't be uniquely determined from the
     * race database (no match, or multiple races at that turn with conflicting distances).
     *
     * Lives here rather than on [GoalRaceStatBias] itself since it needs access to [racing], which is
     * intentionally not exposed outside of [Campaign].
     */
    fun resolveGoalRaceDistance(): TrackDistance? {
        if (!GoalRaceStatBias.isEnabled()) return null

        val turnsRemaining = game.imageUtils.determineTurnsRemainingBeforeNextGoal()
        if (turnsRemaining !in 1..GoalRaceStatBias.lookaheadTurns()) return null

        val targetTurn = date.day + turnsRemaining
        val distances = racing.lookupRacesForTurn(targetTurn).map { it.trackDistance }.distinct()
        return distances.singleOrNull()
    }

    /** The number of skill points required to trigger a check. */
    protected val skillPointsRequired: Int = SettingsHelper.getIntSetting("skills", "skillPointCheck")

    /** The list of date strings at which the bot should stop. */
    protected val stopAtDates: List<String> =
        run {
            val json = SettingsHelper.getStringSetting("general", "stopAtDates", "[]")
            try {
                org.json.JSONArray(json).let { arr ->
                    (0 until arr.length()).map { arr.getString(it) }
                }
            } catch (_: Exception) {
                listOf()
            }
        }

    /** Whether the support-card recreation ("dating") schedule is enabled. */
    protected val enableDatingSchedule: Boolean = SettingsHelper.getBooleanSetting("general", "enableDatingSchedule", false)

    /** Whether a scheduled recreation outing that got pre-empted (a race, or recreation not yet available) should be made up on the next available turn. */
    protected val enableRecreationCatchUp: Boolean = SettingsHelper.getBooleanSetting("general", "enableRecreationCatchUp", true)

    /** Per-card recreation schedules (name to match via OCR in the partner dialog, pinned turns, Pure Passion turn, and chain length), parsed from the JSON array setting. */
    protected val datingCards: List<DatingSchedule.DatingCardConfig> =
        run {
            val json = SettingsHelper.getStringSetting("general", "datingCards", "[]")
            try {
                val arr = org.json.JSONArray(json)
                (0 until arr.length()).map { i ->
                    val obj = arr.getJSONObject(i)
                    val turnsArr = obj.optJSONArray("recreationTurns")
                    val turns = if (turnsArr == null) setOf() else (0 until turnsArr.length()).map { turnsArr.getInt(it) }.toSet()
                    DatingSchedule.DatingCardConfig(
                        cardName = obj.optString("cardName", ""),
                        recreationTurns = turns,
                        purePassionTurn = obj.optInt("purePassionTurn", -1),
                        totalOutings = obj.optInt("totalOutings", 1),
                    )
                }
            } catch (_: Exception) {
                listOf()
            }
        }

    /** The first configured card, or a blank/inert default when none are configured. Used by call sites that predate multi-card support (e.g. the legacy no-dialog recreation path). */
    protected val primaryDatingCard: DatingSchedule.DatingCardConfig = datingCards.firstOrNull() ?: DatingSchedule.DatingCardConfig("", emptySet(), -1, 1)

    /** Whether the recreation chain is complete for this run - no more dates are available. Latched true once done (from the in-game complete label) and never reset. */
    protected var recreationDateCompleted: Boolean = false

    /**
     * Set true when a recreation attempt this turn backs out without completing an outing (e.g. no configured card's name matched any row in the partner
     * dialog, or every matched card was holding its final outing). Backing out doesn't advance the turn, so without this guard [shouldDoRecreationToday]
     * would immediately re-trigger the same failing attempt forever. Cleared as soon as the turn actually advances.
     */
    protected var recreationAttemptFailedThisTurn: Boolean = false

    /** Whether the end-of-career Career Rank screen has already been captured this run, to avoid repeating the OCR check every frame. */
    private var hasCapturedCareerRank: Boolean = false

    /** Number of recreation outings started this run, keyed by [DatingSchedule.DatingCardConfig.cardName]. Used to hold each card's final outing for its Pure Passion turn. */
    protected val recreationOutingsStartedByCard: MutableMap<String, Int> = mutableMapOf()

    /** Each card's group-event chain length as last read from the game's "X/Y" progress, keyed by card name, or its configured fallback until first read. */
    protected val recreationTotalOutingsKnownByCard: MutableMap<String, Int> = mutableMapOf()

    /** Number of outings started this run for [card]. */
    protected fun outingsStarted(card: DatingSchedule.DatingCardConfig): Int = recreationOutingsStartedByCard[card.cardName] ?: 0

    /** [card]'s chain length, as last read from the game or its configured fallback. */
    protected fun totalOutingsKnown(card: DatingSchedule.DatingCardConfig): Int = recreationTotalOutingsKnownByCard[card.cardName] ?: card.totalOutings

    /** The turn number when the stop-at-date check first started. */
    protected var stopAtDateInitialTurnNumber: Int = -1

    /** The turn number when the pre-finals stop check first started. */
    protected var stopBeforeFinalsInitialTurnNumber: Int = -1

    /** Fan thresholds that trigger a Discord notification when crossed for the first time this run. Parsed once; empty list = disabled. */
    private val fanMilestoneList: List<Int> =
        run {
            val raw = SettingsHelper.getStringSetting("discord", "fanMilestones", "")
            raw.split(",").mapNotNull { it.trim().toIntOrNull() }.filter { it > 0 }.sorted()
        }

    /** Set of fan milestones already notified this run (prevents re-firing on re-read). */
    private val notifiedFanMilestones: MutableSet<Int> = mutableSetOf()

    /** Whether the race momentum Discord notification is enabled. */
    private val enableRaceMomentumNotifications: Boolean = SettingsHelper.getBooleanSetting("discord", "enableRaceMomentumNotifications", false)

    /** Running count of consecutive race wins for the momentum tracker. */
    private var momentumWinStreak: Int = 0

    /** Running count of consecutive race losses for the momentum tracker. */
    private var momentumLossStreak: Int = 0

    /** Flag indicating if the bot needs to check its fan count. */
    protected var bNeedToCheckFans: Boolean = true

    /** Flag indicating if the bot has already tried checking fans today. */
    protected var bHasTriedCheckingFansToday: Boolean = false

    /** Flag indicating if the skill point threshold has been handled.
     * This is necessary since the user may have enabled the skill point check
     * skill spending plan. If their plan ends up not purchasing many skills,
     * then it is possible that we could get stuck in a loop of hitting the
     * skill point threshold and attempting to buy skills every single turn.
     * To resolve this, we only allow the skill point check to be handled
     * once per run.
     */
    protected var bHasHandledSkillPointCheck: Boolean = false

    /** Flag indicating if the pre-finals check has been handled. */
    protected var bHasHandledPreFinalsCheck: Boolean = false

    /** Flag indicating if the bot has checked for a maiden race today. */
    var bHasCheckedForMaidenRaceToday: Boolean = false

    /** Flag indicating if the date has been checked during the current turn.
     * This is necessary to prevent redundant date checks when no game-advancing action was taken.
     * Reset to false when training, resting, racing, or other game-advancing actions complete.
     */
    protected var bHasCheckedDateThisTurn: Boolean = false

    /**
     * Counts consecutive [performMiscChecks] iterations where [ButtonCancel] matched. The bot only
     * exits on a confirmed warning popup once this reaches [WARNING_POPUP_CONFIRM_THRESHOLD], so a
     * single-frame template miss against an unrelated UI element no longer trips a false-positive exit.
     * Reset to 0 on any iteration that does not match.
     */
    private var consecutiveButtonCancelMatches: Int = 0

    /** Number of consecutive [ButtonCancel] matches required to confirm a real warning popup. */
    private val WARNING_POPUP_CONFIRM_THRESHOLD: Int = 5

    /** Matches valid Career Rank tiers (e.g. "S+", "SS", "UG") detected via OCR on the Career Rank screen. */
    private val CAREER_RANK_PATTERN: Regex = Regex("^(UG|SS\\+?|S\\+?|A\\+?|B\\+?|C\\+?|D\\+?|E\\+?|F\\+?|G\\+?)$")

    /**
     * Fires a Discord notification for any configured fan milestone that was just crossed.
     * Only fires once per milestone per run and only when Discord notifications are enabled.
     *
     * @param newFans The newly-read fan count.
     */
    private fun checkFanMilestones(newFans: Int) {
        if (fanMilestoneList.isEmpty()) return
        for (milestone in fanMilestoneList) {
            if (newFans >= milestone && notifiedFanMilestones.add(milestone)) {
                val formatted = "%,d".format(milestone)
                MessageLog.i(TAG, "[FAN_MILESTONE] Reached $formatted fans — sending Discord notification.")
                AppDiscordNotifications.sendInfo(
                    title = "Fan milestone reached: $formatted",
                    description = "The trainee now has ${"%,d".format(newFans)} fans.",
                )
            }
        }
    }

    /**
     * Called by [Racing] after each race result is committed.
     * Sends a Discord momentum notification if enabled and tracks win/loss streaks.
     *
     * @param won True if the trainee placed 1st, false otherwise.
     */
    open fun onRaceResult(won: Boolean) {
        if (won) {
            momentumWinStreak++
            momentumLossStreak = 0
        } else {
            momentumLossStreak++
            momentumWinStreak = 0
        }
        MomentumRaceSelection.onRaceResult(won)

        if (!enableRaceMomentumNotifications || !DiscordUtils.enableDiscordNotifications) return

        if (won) {
            val streakStr = if (momentumWinStreak > 1) " ($momentumWinStreak in a row)" else ""
            AppDiscordNotifications.sendInfo(
                title = "Race won$streakStr",
                description = "The trainee placed 1st.",
            )
        } else {
            val streakStr = if (momentumLossStreak > 1) " ($momentumLossStreak in a row)" else ""
            AppDiscordNotifications.sendInfo(
                title = "Race lost$streakStr",
                description = "The trainee did not place 1st.",
            )
        }
    }

    // //////////////////////////////////////////////////////////////////////////////////////////////////
    // //////////////////////////////////////////////////////////////////////////////////////////////////
    // Debug Tests

    /**
     * Starts the automated tests for the campaign.
     *
     * @return True if any tests were run, false otherwise.
     */
    override fun startTests(): Boolean {
        val fnMap: Map<String, () -> Unit> =
            mapOf(
                "debugMode_startTemplateMatchingTest" to ::startTemplateMatchingTest,
                "debugMode_startSingleTrainingOCRTest" to training::startSingleTrainingOCRTest,
                "debugMode_startComprehensiveTrainingOCRTest" to training::startComprehensiveTrainingOCRTest,
                "debugMode_startRaceListDetectionTest" to racing::startRaceListDetectionTest,
                "debugMode_startMainScreenUpdateTest" to this::startMainScreenUpdateTest,
                "debugMode_startScrollBarDetectionTest" to ::startScrollBarDetectionTest,
                "debugMode_startSkillListBuyTest" to skillPlan::startSkillListBuyTest,
                "debugMode_startRainbowDetectionTest" to ::startRainbowDetectionTest,
                "debugMode_startSupportCardScanTest" to ::startSupportCardScanTest,
            )

        var bDidAnyTestsRun = false
        for ((settingName, fn) in fnMap) {
            if (SettingsHelper.getBooleanSetting("debug", settingName)) {
                fn()
                bDidAnyTestsRun = true
            }
        }

        return bDidAnyTestsRun
    }

    /**
     * Debug test for rainbow-training detection. Run this while on the Training screen: it repeatedly detects the rainbow glow ring on each support face circle for ~5 seconds (several
     * animation frames), logging the per-support metrics and the derived rainbow count, and saves an annotated crop each pass so the face-circle geometry and hue thresholds can be
     * calibrated. The main-screen "is any training rainbow?" gate is a separate multi-frame detector and is not covered here yet.
     */
    open fun startRainbowDetectionTest() {
        MessageLog.i(TAG, "\n[TEST] Now beginning the Rainbow Detection test. Point the game at the Training screen so the support face circles are visible.")
        val passes = 5
        for (pass in 1..passes) {
            MessageLog.i(TAG, "[TEST] Rainbow detection pass $pass/$passes:")
            game.imageUtils.debugRainbowDetection()
            if (pass < passes) game.wait(1.0)
        }
        MessageLog.i(TAG, "[TEST] Rainbow Detection test complete. Check the logged metrics and the saved debugRainbowDetection.png crop to calibrate geometry/thresholds.")
    }

    /**
     * Debug scan of the Support Card List screen. Point the game at the Support Card List (Enhance tab) and run this: it lays the
     * 5-column tile grid over the screen and logs each tile's detected type / rarity / limit-break / level plus the raw
     * measurements, and saves an annotated crop, so the grid geometry and hue bands can be calibrated before the results feed the
     * deck recommender.
     */
    open fun startSupportCardScanTest() {
        MessageLog.i(TAG, "\n[TEST] Now beginning the Support Card Scan test. Point the game at the Support Card List (Enhance tab) so the card grid is visible.")
        val cards = game.imageUtils.scanSupportCardList()
        MessageLog.i(TAG, "[TEST] Support Card Scan test complete. Detected ${cards.size} tiles. Check the logged per-tile metrics and the saved debugSupportCardScan.png crop to calibrate geometry/hue bands.")
    }

    /**
     * Performs a basic template matching test on the Home screen to determine the best scale for the device.
     */
    open fun startTemplateMatchingTest() {
        MessageLog.i(TAG, "\n[TEST] Now beginning basic template match test on the Home screen.")
        MessageLog.i(TAG, "[TEST] Template match confidence setting will be overridden for the test.\n")
        var results =
            mutableMapOf<String, MutableList<ScaleConfidenceResult>>(
                LabelEnergy.template.path to mutableListOf(),
                IconTazuna.template.path to mutableListOf(),
                LabelStatTableHeaderSkillPoints.template.path to mutableListOf(),
            )
        results = game.imageUtils.startTemplateMatchingTest(results)
        MessageLog.i(TAG, "\n[TEST] Basic template match test complete.")

        // Print all scale/confidence combinations that worked for each template.
        for ((templateName, scaleConfidenceResults) in results) {
            if (scaleConfidenceResults.isNotEmpty()) {
                MessageLog.i(TAG, "[TEST] All working scale/confidence combinations for $templateName:")
                for (result in scaleConfidenceResults) {
                    MessageLog.i(TAG, "[TEST]\tScale: ${result.scale}, Confidence: ${result.confidence}")
                }
            } else {
                MessageLog.w(TAG, "[WARN] startTemplateMatchingTest:: No working scale/confidence combinations found for $templateName")
            }
        }

        // Then print the median scales and confidences.
        val medianScales = mutableListOf<Double>()
        val medianConfidences = mutableListOf<Double>()
        for ((templateName, scaleConfidenceResults) in results) {
            if (scaleConfidenceResults.isNotEmpty()) {
                val sortedScales = scaleConfidenceResults.map { it.scale }.sorted()
                val sortedConfidences = scaleConfidenceResults.map { it.confidence }.sorted()
                val medianScale = sortedScales[sortedScales.size / 2]
                val medianConfidence = sortedConfidences[sortedConfidences.size / 2]
                medianScales.add(medianScale)
                medianConfidences.add(medianConfidence)
                MessageLog.i(TAG, "[TEST] Median scale for $templateName: $medianScale")
                MessageLog.i(TAG, "[TEST] Median confidence for $templateName: $medianConfidence")
            }
        }

        if (medianScales.isNotEmpty()) {
            MessageLog.i(TAG, "\n[TEST] The following are the recommended scales to set: $medianScales.")
            MessageLog.i(TAG, "[TEST] The following are the recommended confidences to set: $medianConfidences.")
        } else {
            MessageLog.e(TAG, "\n[ERROR] startTemplateMatchingTest:: No median scale/confidence can be found.")
        }
    }

    /**
     * Performs a comprehensive update test on the Main screen and perform all Main screen updates.
     */
    open fun startMainScreenUpdateTest() {
        MessageLog.i(TAG, "\n[TEST] Now beginning the Main Screen update test.")

        // Update the date.
        updateDate()

        // Perform parallel turn-start updates (stats, mood, energy, skill points, etc.).
        val sourceBitmap = game.imageUtils.getSourceBitmap()
        performTurnStartUpdates(sourceBitmap)

        // Update the aptitudes.
        openAptitudesDialog()
        handleDialogs()

        // Update the fan count.
        openFansDialog()
        handleDialogs()

        trainee.logInfo()
        MessageLog.i(TAG, "\n[TEST] Main Screen update test complete.")
    }

    /**
     * Performs a scrollbar detection and functionality test on the current screen.
     *
     * Detects the scrollbar and attempts to scroll it up and down.
     */
    fun startScrollBarDetectionTest() {
        MessageLog.i(TAG, "\n[TEST] Now beginning scrollbar detection test on the current screen.")

        // Initial detection pass.
        val scrollList = ScrollList.create(game)
        if (scrollList == null) {
            MessageLog.i(TAG, "[TEST] Could not detect a list on the current screen.")
            return
        }

        val scrollBarRegion = scrollList.getListScrollBarBoundingRegion()
        if (scrollBarRegion.first != null) {
            MessageLog.i(TAG, "[TEST] Scrollbar detected at: ${scrollBarRegion.first}")
            if (scrollBarRegion.second != null) {
                MessageLog.i(TAG, "[TEST] Scrollbar thumb detected at: ${scrollBarRegion.second}")
            } else {
                MessageLog.i(TAG, "[TEST] No scrollbar thumb detected.")
            }

            // Try scrolling down.
            MessageLog.i(TAG, "[TEST] Attempting to scroll DOWN...")
            scrollList.scrollDown()
            MessageLog.i(TAG, "[TEST] Scroll DOWN attempted.")

            game.wait(1.0)

            // Try scrolling up.
            MessageLog.i(TAG, "[TEST] Attempting to scroll UP...")
            scrollList.scrollUp()
            MessageLog.i(TAG, "[TEST] Scroll UP attempted.")

            MessageLog.i(TAG, "[TEST] Scrollbar detection test complete.")
        } else {
            MessageLog.i(TAG, "[TEST] No scrollbar detected on the current screen.")
        }
    }

    // //////////////////////////////////////////////////////////////////////////////////////////////////
    // //////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Handles game dialogs by identifying them and performing the appropriate responses.
     *
     * @param dialog The optional dialog interface to handle.
     * @param args Additional arguments for dialog handling logic.
     * @return The result of the dialog handling operation.
     */
    override fun handleDialogs(dialog: DialogInterface?, args: Map<String, Any>): DialogHandlerResult {
        val result: DialogHandlerResult = super.handleDialogs(dialog, args)
        if (result !is DialogHandlerResult.Unhandled) {
            return result
        }

        when (result.dialog.name) {
            "consecutive_race_warning" -> {
                return handleConsecutiveRaceWarning(result.dialog, args)
            }

            "insufficient_goal_race_result_pts" -> {
                if (!bHasCheckedDateThisTurn) {
                    MessageLog.i(TAG, "[RACE] Insufficient Goal Race Result Pts dialog detected before turn-start updates. Closing it to perform checks first.")
                    result.dialog.close(game.imageUtils)
                } else {
                    MessageLog.i(TAG, "[RACE] Insufficient Goal Race Result Pts dialog! Forced to race...")
                    racing.hasInsufficientGoalRacePtsRequirement = true
                    result.dialog.ok(game.imageUtils)
                    game.wait(2.0)
                }
            }

            "goal_not_reached" -> {
                // We are handling the logic for when to race on our own. Thus, we just close this warning.
                racing.encounteredRacingPopup = true
                result.dialog.close(game.imageUtils)
            }

            "insufficient_fans" -> {
                // We are handling the logic for when to race on our own. Thus, we just close this warning.
                racing.encounteredRacingPopup = true
                result.dialog.close(game.imageUtils)
            }

            "scheduled_race_available" -> {
                MessageLog.i(TAG, "[INFO] There is a scheduled race today. Closing to perform turn-start updates...")
                result.dialog.close(game.imageUtils)
                game.waitForLoading()
            }

            "strategy" -> {
                if (!trainee.bHasUpdatedAptitudes) {
                    trainee.bTemporaryRunningStyleAptitudesUpdated = racing.updateRaceScreenRunningStyleAptitudes()
                }

                if (date.day == 1) {
                    MessageLog.i(TAG, "[DIALOG] Unknown date. Using Original race strategy.")
                }

                var runningStyle: RunningStyle?
                val runningStyleString: String =
                    when {
                        // Special case for when the bot has not been able to check the date i.e. when the bot starts at the race screen.
                        date.day == 1 -> racing.resolveStrategyForCurrentRace(isJuniorYear = false)

                        date.year == DateYear.JUNIOR -> racing.resolveStrategyForCurrentRace(isJuniorYear = true)

                        else -> racing.resolveStrategyForCurrentRace(isJuniorYear = false)
                    }
                when (runningStyleString.uppercase()) {
                    // Do not select a strategy. Use what is already selected.
                    "DEFAULT" -> {
                        MessageLog.i(TAG, "[DIALOG] Using the default running style.")
                        result.dialog.ok(game.imageUtils)
                        // Confirming this dialog triggers connection to server.
                        game.waitForLoading()
                        // If date is unknown we want to set style next time we're at race prep screen.
                        trainee.bHasSetRunningStyle = date.day != 1
                        racing.bHasSetTemporaryRunningStyle = true
                        return DialogHandlerResult.Handled(result.dialog)
                    }

                    // Auto-select the optimal running style based on trainee aptitudes.
                    "AUTO" -> {
                        MessageLog.i(TAG, "[DIALOG] Auto-selecting the trainee's optimal running style.")
                        runningStyle = trainee.runningStyle
                    }

                    else -> {
                        MessageLog.i(TAG, "[DIALOG] Using user-specified running style: $runningStyleString")
                        runningStyle = RunningStyle.fromShortName(runningStyleString)
                    }
                }

                when (runningStyle) {
                    RunningStyle.FRONT_RUNNER -> {
                        ButtonRaceStrategyFront.click(game.imageUtils)
                    }

                    RunningStyle.PACE_CHASER -> {
                        ButtonRaceStrategyPace.click(game.imageUtils)
                    }

                    RunningStyle.LATE_SURGER -> {
                        ButtonRaceStrategyLate.click(game.imageUtils)
                    }

                    RunningStyle.END_CLOSER -> {
                        ButtonRaceStrategyEnd.click(game.imageUtils)
                    }

                    null -> {
                        // This indicates programmer error.
                        MessageLog.e(TAG, "[ERROR] handleDialogs:: Invalid running style: $runningStyle")
                        result.dialog.close(game.imageUtils)
                        trainee.bHasSetRunningStyle = false
                        return DialogHandlerResult.Handled(result.dialog)
                    }
                }

                // We only want to set this flag if the date has been checked.
                // Otherwise, if the day is still 1, that means we probably started the bot at the racing screen.
                // In this case, we still want to set the running style the next time we get back to the race selection screen after verifying the date.
                if (date.day != 1) {
                    trainee.bHasSetRunningStyle = true
                }
                racing.bHasSetTemporaryRunningStyle = true
                result.dialog.ok(game.imageUtils)
            }

            "try_again" -> {
                return handleTryAgainDialog(result.dialog, args)
            }

            "umamusume_class" -> {
                val bitmap: Bitmap = game.imageUtils.getSourceBitmap()
                val templateBitmap: Bitmap? = game.imageUtils.getBitmaps(LabelUmamusumeClassFans.template.path).second
                if (templateBitmap == null) {
                    MessageLog.e(TAG, "[ERROR] handleDialogs:: Could not get template bitmap for LabelUmamusumeClassFans: ${LabelUmamusumeClassFans.template.path}.")
                    result.dialog.close(game.imageUtils)
                    return DialogHandlerResult.Handled(result.dialog)
                }
                val point: Point? = LabelUmamusumeClassFans.find(game.imageUtils).first
                if (point == null) {
                    MessageLog.w(TAG, "[WARN] handleDialogs:: Could not find LabelUmamusumeClassFans.")
                    result.dialog.close(game.imageUtils)
                    return DialogHandlerResult.Handled(result.dialog)
                }

                // Add a small 8px buffer to vertical component.
                val bbox =
                    BoundingBox(
                        x = game.imageUtils.relX(0.0, (point.x + (templateBitmap.width / 2)).toInt()),
                        y = game.imageUtils.relY(0.0, (point.y - (templateBitmap.height / 2) - 4).toInt()),
                        w = game.imageUtils.relWidth(300),
                        h = game.imageUtils.relHeight(templateBitmap.height + 4),
                    )

                val croppedBitmap =
                    game.imageUtils.createSafeBitmap(
                        bitmap,
                        bbox.x,
                        bbox.y,
                        bbox.w,
                        bbox.h,
                        "dialog::umamusume_class: Cropped bitmap.",
                    )
                if (croppedBitmap == null) {
                    MessageLog.e(TAG, "[ERROR] handleDialogs:: Failed to crop bitmap.")
                    result.dialog.close(game.imageUtils)
                    return DialogHandlerResult.Handled(result.dialog)
                }
                val fans = game.imageUtils.getUmamusumeClassDialogFanCount(croppedBitmap)
                if (fans != null) {
                    trainee.fans = fans
                    SmartRaceSolverIntegration.updateCurrentFans(trainee.fans)
                    checkFanMilestones(trainee.fans)
                    bNeedToCheckFans = false
                    MessageLog.i(TAG, "[INFO] Updated fan count: ${trainee.fans}")
                } else {
                    MessageLog.w(TAG, "[WARN] handleDialogs:: getUmamusumeClassDialogFanCount returned null.")
                }

                result.dialog.close(game.imageUtils)
            }

            "auto_select" -> {
                if (CareerSelectionAutomation.shouldConfirmAutoSelectDialog()) {
                    val confirmed = LegacyParentSelector.confirmAutoSelectDialog(game, result.dialog)
                    if (!confirmed && LegacyParentSelector.hasExceededAutoSelectDialogAttempts()) {
                        result.dialog.close(game.imageUtils)
                        LegacyParentSelector.resetAutoSelectDialogAttempts()
                    }
                } else {
                    result.dialog.close(game.imageUtils)
                }
            }

            "confirm_auto_select" -> {
                if (CareerSelectionAutomation.shouldConfirmAutoSelectDialog()) {
                    val confirmed = LegacyParentSelector.confirmConfirmAutoSelectDialog(game, result.dialog)
                    if (!confirmed && LegacyParentSelector.hasExceededConfirmAutoSelectDialogAttempts()) {
                        result.dialog.close(game.imageUtils)
                        LegacyParentSelector.resetConfirmAutoSelectDialogAttempts()
                    }
                } else {
                    result.dialog.close(game.imageUtils)
                }
            }

            "final_confirmation" -> {
                if (CareerSelectionAutomation.shouldAutoStartCareer()) {
                    val started = CareerSelectionAutomation.tryStartCareer(game)
                    if (!started && CareerSelectionAutomation.hasExceededStartCareerAttempts()) {
                        result.dialog.close(game.imageUtils)
                        CareerSelectionAutomation.resetStartCareerAttempts()
                    }
                } else {
                    result.dialog.close(game.imageUtils)
                }
            }

            "umamusume_details" -> {
                val prevRunningStyle = trainee.runningStyle
                trainee.updateAptitudes(game.imageUtils)
                trainee.updateStats(game.imageUtils, isAptitudeDialog = true)
                trainee.bTemporaryRunningStyleAptitudesUpdated = false
                SmartRaceSolverIntegration.maybeReplanForTraineeAptitudes(trainee, "umamusume details")

                // Read the trainee's name once per run while the dialog is still open.
                if (trainee.name.isEmpty()) {
                    trainee.readName(game.imageUtils)
                    if (trainee.name.isNotEmpty()) {
                        SmartRaceSolverIntegration.applyOcrDetectedCharacterPreset(trainee.name)
                    }
                }

                if (trainee.runningStyle != prevRunningStyle) {
                    // Reset this flag since our preferred running style has changed.
                    trainee.bHasSetRunningStyle = false
                }

                // Read the trainee's active conditions from the Conditions sublist (default tab) before switching to the Skills tab.
                val conditions = ConditionList(game).parseDetailsConditionsTab()
                trainee.setConditions(conditions.positive, conditions.negative)

                // Read the currently-owned skills from the Skills tab to feed the estimated rank.
                val ownedSkills = SkillList(game, this).parseDetailsSkillsTab()
                trainee.ownedSkillNames.clear()
                trainee.ownedSkillNames.addAll(ownedSkills.skillNames)
                trainee.uniqueSkillLevel = ownedSkills.uniqueLevel
                broadcastOwnedSkills()

                // Recompute the estimated rank from the final stats, aptitudes, and owned skills so the end-of-run log reflects the completed career.
                updateEstimatedRank()

                result.dialog.close(game.imageUtils)
            }

            "choose_recreation_partner" -> {
                // The recreation was opened but the outing is being held (reserved for the Pure Passion turn), leaving this dialog up. Close it.
                MessageLog.i(TAG, "[RECREATION_DATE] Choose Recreation Partner dialog left open. Closing it.")
                result.dialog.close(game.imageUtils)
            }

            else -> {
                Log.w(TAG, "[WARN] handleDialogs:: Unknown dialog \"${result.dialog.name}\" detected so it will not be handled.")
                return DialogHandlerResult.Unhandled(result.dialog)
            }
        }

        game.wait(0.5)
        return DialogHandlerResult.Handled(result.dialog)
    }

    /**
     * Performs campaign-specific checks for special screens or conditions.
     *
     * @return True if the conditions are met, false otherwise.
     */
    open fun checkCampaignSpecificConditions(): Boolean {
        return false
    }

    /**
     * Handles campaign-specific Training Events.
     */
    open fun handleTrainingEvent() {
        trainingEvent.handleTrainingEvent()
    }

    /**
     * Handles campaign-specific race events.
     *
     * @param isScheduledRace True if the race is scheduled, false otherwise.
     * @return True if the race was handled successfully, false otherwise.
     */
    open fun handleRaceEvents(isScheduledRace: Boolean = false): Boolean {
        val bDidRace: Boolean = racing.handleRaceEvents(isScheduledRace)
        bNeedToCheckFans = bDidRace
        return bDidRace
    }

    /**
     * Performs campaign-specific logic to handle a race win.
     */
    open fun onRaceWin() {
        return
    }

    /**
     * Whether to handle a close button as a post-race popup during race retries.
     * Override this to return true for scenarios that show popups (e.g. Rival popups) after races.
     *
     * @return True to handle close button as a post-race popup, false otherwise.
     */
    open fun hasPostRacePopups(): Boolean = false

    /**
     * Whether to bypass smart racing and interval checks for extra race eligibility.
     * Override this to return true for scenarios that race as often as possible.
     *
     * @return True to bypass smart racing checks, false to use default logic.
     */
    open fun shouldBypassSmartRacing(): Boolean = false

    /**
     * Returns the maximum number of retries allowed per individual race.
     *
     * @return The maximum retries per race.
     */
    open fun getMaxRetriesPerRace(): Int = 1

    /**
     * Returns the total pool of race retries for the entire run.
     *
     * @return The maximum total race retries.
     */
    open fun getMaxRaceRetries(): Int = 3

    /**
     * Returns the list of race grades that are eligible for retries.
     *
     * @return The list of eligible [RaceGrade] values, or empty if no retries are allowed.
     */
    open fun getRetryEligibleGrades(): List<RaceGrade> = emptyList()

    /**
     * Executes logic at the very beginning of [handleMainScreen].
     */
    open fun onBeforeMainScreenUpdate() {
        return
    }

    /**
     * Resets any scenario-specific daily flags when a new day is detected.
     */
    open fun resetDailyFlags() {
        return
    }

    /**
     * Called when a consecutive race warning dialog is first detected, before any decision is made.
     *
     * Subclasses can override this to perform pre-processing such as OCR reads.
     * This is called regardless of whether force-race flags are active.
     *
     * @param dialog The detected dialog.
     * @param args Additional arguments from dialog handling.
     */
    open fun onConsecutiveRaceWarningDetected(dialog: DialogInterface, args: Map<String, Any>) {
        return
    }

    /**
     * Determines whether to proceed with a consecutive race despite the warning.
     *
     * Called after [onConsecutiveRaceWarningDetected] and after force-race flags have been checked.
     * This is only called when force-race flags are NOT active — if they are, the race proceeds unconditionally.
     *
     * @param args Additional arguments from dialog handling.
     * @return True to proceed with the race, false to abort and clear racing requirement flags.
     */
    open fun shouldAllowConsecutiveRace(args: Map<String, Any>): Boolean {
        // Default behavior: if force-race flags are not active, abort.
        return false
    }

    /**
     * Determines whether to retry a race after failing.
     *
     * Called when [Racing.disableRaceRetries] is false (non-mandatory race retries).
     * The implementation should handle clicking the retry button if returning true.
     *
     * @param dialog The Try Again dialog.
     * @param args Additional arguments from dialog handling.
     * @return True if the retry was initiated (button clicked), false to close the dialog without retrying.
     */
    open fun shouldRetryRace(dialog: DialogInterface, args: Map<String, Any>): Boolean {
        if (racing.raceRetries >= 0) {
            MessageLog.i(TAG, "[RACE] Retrying the race. Retries remaining: ${racing.raceRetries}")
            racing.raceRetries--
            game.wait(0.5)
            ButtonTryAgain.click(game.imageUtils)
            waitForTryAgainDialogToClose()
            return true
        }
        if (racing.attemptCaratFundedRetry(dialog)) {
            return true
        }
        return false
    }

    /**
     * Waits for the Try Again dialog to leave the screen after its button was clicked.
     *
     * The dialog-handling loop re-checks for dialogs at the start of every iteration, and the dialog does not vanish the instant it is tapped.
     * Returning while it is still up lets the same dialog get handled a second time, which closes it and cancels the retry that was just started.
     */
    private fun waitForTryAgainDialogToClose() {
        repeat(TRY_AGAIN_DIALOG_CLOSE_ATTEMPTS) {
            game.wait(0.5)
            if (!ButtonTryAgain.check(game.imageUtils)) return
        }
        MessageLog.w(TAG, "[WARN] waitForTryAgainDialogToClose:: The Try Again dialog is still on screen after clicking it.")
    }

    /**
     * Confirms a carat-funded Alarm Clock purchase when [Racing.canUseCaratRaceRetry] is enabled.
     *
     * @return True when the dialog was handled (including a failed OK click that closed the dialog).
     */
    fun handlePurchaseAlarmClockDialog(dialog: DialogInterface): Boolean {
        if (!racing.canUseCaratRaceRetry()) return false
        MessageLog.i(TAG, "[RACE] Confirming carat purchase for Alarm Clock (race retry)...")
        if (dialog.ok(game.imageUtils)) {
            racing.recordCaratRaceRetrySpend()
            game.wait(1.0)
            return true
        }
        MessageLog.w(TAG, "[WARN] handlePurchaseAlarmClockDialog:: Failed to confirm carat Alarm Clock purchase. Closing dialog.")
        dialog.close(game.imageUtils)
        return true
    }

    /**
     * Handles the consecutive race warning dialog using hook methods for extensibility.
     *
     * @param dialog The detected dialog.
     * @param args Additional arguments from dialog handling.
     * @return The result of the dialog handling operation.
     */
    private fun handleConsecutiveRaceWarning(dialog: DialogInterface, args: Map<String, Any>): DialogHandlerResult {
        val overrideIgnoreConsecutiveRaceWarning = args["overrideIgnoreConsecutiveRaceWarning"] as? Boolean ?: false

        // Pre-processing hook (e.g. Trackblazer OCR).
        onConsecutiveRaceWarningDetected(dialog, args)

        val forceRace = overrideIgnoreConsecutiveRaceWarning || racing.enableForceRacing || racing.ignoreConsecutiveRaceWarning

        val shouldProceed = forceRace || shouldAllowConsecutiveRace(args)

        if (shouldProceed) {
            // Proceeding with the race must not block later solver-planned races the same day.
            racing.raceRepeatWarningCheck = false
            // If the bot hasn't checked the date yet, it usually means it started on the prep screen or it is the Finale season.
            // If we are explicitly overriding the warning (mandatory race), we should proceed even if the date check hasn't finished.
            if (!bHasCheckedDateThisTurn && !overrideIgnoreConsecutiveRaceWarning && !date.bIsFinaleSeason) {
                MessageLog.i(TAG, "[RACE] Consecutive race warning detected before turn-start updates. Closing it to perform checks first.")
                dialog.close(game.imageUtils)
            } else {
                val isScheduledRace = args["isScheduledRace"] as? Boolean ?: false
                val isMandatoryRace = args["isMandatoryRace"] as? Boolean ?: false

                when {
                    isScheduledRace -> MessageLog.i(TAG, "[RACE] Consecutive race warning! Racing anyway as this is a scheduled race...")
                    isMandatoryRace -> MessageLog.i(TAG, "[RACE] Consecutive race warning! Racing anyway as this is a required race...")
                    else -> MessageLog.i(TAG, "[RACE] Consecutive race warning! Racing anyway...")
                }

                dialog.ok(game.imageUtils)
                game.wait(2.0)
            }
        } else {
            MessageLog.i(TAG, "[RACE] Consecutive race warning! Aborting racing...")
            racing.raceRepeatWarningCheck = true
            racing.clearRacingRequirementFlags()
            dialog.close(game.imageUtils)
        }

        game.wait(0.5)
        return DialogHandlerResult.Handled(dialog)
    }

    /**
     * Handles the Try Again dialog using a hook method for the retry decision.
     *
     * The mandatory-race-failure path (disableRaceRetries == true) is handled here as shared logic.
     * The non-mandatory retry decision is delegated to [shouldRetryRace].
     *
     * @param dialog The Try Again dialog.
     * @param args Additional arguments from dialog handling.
     * @return The result of the dialog handling operation.
     */
    private fun handleTryAgainDialog(dialog: DialogInterface, args: Map<String, Any>): DialogHandlerResult {
        // All branches need a slight delay to allow the dialog to close since the runRaceWithRetries() loop handles dialogs at the start of each iteration.
        // Can cause problem where we handle one branch then immediately handle dialogs again and handle a second branch for the same dialog instance.
        if (racing.disableRaceRetries) {
            if (racing.enableFreeRaceRetry && IconOneFreePerDayTooltip.check(game.imageUtils)) {
                MessageLog.i(TAG, "[RACE] Failed mandatory race. Using daily free race retry...")
                racing.raceRetries--
                dialog.ok(game.imageUtils)
                game.wait(0.5)
                return DialogHandlerResult.Handled(dialog)
            }
            if (racing.enableCompleteCareerOnFailure) {
                MessageLog.i(TAG, "[RACE] Failed a mandatory race and no retries remaining. Completing career...")
                // Manually set retries to -1 to break the race retry loop.
                racing.raceRetries = -1
                dialog.close(game.imageUtils)
                game.wait(0.5)
                return DialogHandlerResult.Handled(dialog)
            }
            if (racing.attemptCaratFundedRetry(dialog)) {
                MessageLog.i(TAG, "[RACE] Failed mandatory race. Attempting carat-funded retry...")
                game.wait(0.5)
                return DialogHandlerResult.Handled(dialog)
            }
            MessageLog.v(TAG, "\n[END] Stopping the bot due to failing a mandatory race.")
            MessageLog.v(TAG, "********************")
            game.notificationMessage = "Stopping the bot due to failing a mandatory race."
            if (DiscordUtils.enableDiscordNotifications) {
                AppDiscordNotifications.sendError("Stopping the bot due to failing a mandatory race.")
            }
            throw IllegalStateException()
        }

        if (shouldRetryRace(dialog, args)) {
            // Retry was initiated by the hook.
        } else {
            MessageLog.w(TAG, "[WARN] handleDialogs:: No retries remaining but Try Again dialog detected. Closing dialog...")
            dialog.close(game.imageUtils)
        }

        game.wait(0.5)
        return DialogHandlerResult.Handled(dialog)
    }

    /**
     * Executes logic after the parallel turn-start updates (stat, mood, energy, etc.) have completed.
     */
    open fun onAfterTurnStartUpdates() {
        return
    }

    /**
     * Executes logic after all updates and global checks have completed, but before decision-making.
     */
    open fun onMainScreenEntry() {
        return
    }

    /**
     * Decision-relevant inventory snapshot for the current turn, grouped by category label (e.g. `Megaphones`, `Race Items`) then mapped to item-name -> count. Subclasses with inventory tracking
     * (e.g. Trackblazer) should override to return the items that drive their decisions. Use `LinkedHashMap` so the category order is preserved when rendered. Empty map by default for campaigns
     * without inventory.
     */
    open fun gatherDecisionInventory(): Map<String, Map<String, Int>> = emptyMap()

    /**
     * Decision-relevant settings snapshot for the current turn. Covers the knobs generic to every scenario (mood/energy thresholds,
     * failure-chance limits, auto-abandon, race agenda). Subclasses with scenario-specific mechanics (e.g. Trackblazer's megaphones and
     * charms) should call `super.gatherDecisionSettings()` and chain further `.add(...)` calls onto the returned snapshot.
     */
    open fun gatherDecisionSettings(): DecisionTracer.SettingsSnapshot {
        val snapshot =
            DecisionTracer
                .SettingsSnapshot()
                .add("Minimum Mood for Training", minimumMoodForTraining)
                .add("Must Rest Before Summer", mustRestBeforeSummer)
                .add("Stop Before Finals", enableStopBeforeFinals)
                .add(
                    "Energy Banking",
                    if (enableEnergyBanking) "on (below $energyBankingThreshold% within $energyBankingLookaheadTurns turn(s) of a mandatory race)" else "off",
                )
                .add(
                    "Minimum Energy to Train",
                    if (minimumEnergyToTrain > 0) "$minimumEnergyToTrain%${if (enableWitOverRest) " (Wit-over-rest)" else ""}" else "off",
                )
                .add("High-Energy Mood Tolerance", if (enableHighEnergyMoodTolerance) "on (at or above $highEnergyMoodToleranceThreshold% energy)" else "off")
                .add("Enable In-Game Race Agenda", racing.enableUserInGameRaceAgenda)
                .add("Max Failure Chance", "${SettingsHelper.getIntSetting("training", "maximumFailureChance")}%")

        val riskyTrainingEnabled = SettingsHelper.getBooleanSetting("training", "enableRiskyTraining")
        val riskyMaxFail = SettingsHelper.getIntSetting("training", "riskyTrainingMaxFailureChance")
        val riskyMinGain = SettingsHelper.getIntSetting("training", "riskyTrainingMinStatGain")
        val riskySummary =
            if (SettingsHelper.getBooleanSetting("training", "enableTurnAdaptiveRiskyTraining", false)) {
                val riskyEarly = SettingsHelper.getIntSetting("training", "riskyTrainingMaxFailureChanceEarly", 45)
                "on (max fail $riskyEarly% at turn 1 tapering to $riskyMaxFail% by turn 72, min main $riskyMinGain)"
            } else {
                "on (max fail $riskyMaxFail%, min main $riskyMinGain)"
            }
        snapshot.add("Riskier Training", if (riskyTrainingEnabled) riskySummary else "off")

        val autoAbandonSummary = "on (action=${autoAbandonAction.name.lowercase()}, target=${autoAbandonConfig.targetGrade}, from turn ${autoAbandonConfig.minTurn})"
        snapshot.add("Auto-Abandon", if (autoAbandonConfig.enabled) autoAbandonSummary else "off")

        return snapshot
    }

    /**
     * Campaign-specific extra state that does not live on `Trainee` itself (for example Trackblazer's `consecutiveRaceCount`). Returned as
     * a display-friendly key/value map appended to the State section of the Decision Report.
     */
    open fun gatherDecisionExtraState(): Map<String, String> = emptyMap()

    /**
     * Determines whether item-based mood recovery should override the default mood recovery logic.
     *
     * Called when mood is below Good and the firstTrainingCheck guard has passed.
     * Subclasses can override this to make item-aware mood recovery decisions.
     *
     * @param sourceBitmap Current screen bitmap.
     * @return True to proceed with rest/recreation recovery, false to skip recovery (items will handle it),
     *         or null to fall through to the default Campaign behavior.
     */
    open fun shouldRecoverMoodFromItems(sourceBitmap: Bitmap): Boolean? {
        return null
    }

    /**
     * The mood the trainee must be strictly below before mood recovery is attempted. The base campaigns recover whenever mood is below the user-configured Minimum Mood For Training
     * (default Good). Subclasses can lower the floor to spend fewer turns on mood and more on training or racing.
     *
     * @return The recovery floor, defaulting to the Minimum Mood For Training setting.
     */
    open fun moodRecoveryFloor(): Mood =
        MoodRecoveryPolicy.relaxedMoodFloor(minimumMoodForTraining, trainee.energy, enableHighEnergyMoodTolerance, highEnergyMoodToleranceThreshold)

    /**
     * Determines if mood recovery should be attempted.
     *
     * @param sourceBitmap Current screen bitmap.
     * @return True if mood recovery is needed and possible, false otherwise.
     */
    open fun shouldRecoverMood(sourceBitmap: Bitmap): Boolean {
        // Finale: recovering mood with at most three turns left wastes a turn, so skip it once the finale starts (mirrors the finale injury-check skip).
        if (shouldSkipMoodRecoveryForFinale(date.day)) {
            MessageLog.i(TAG, "[MOOD] Finale underway (day ${date.day}). Skipping mood recovery to preserve the remaining turns for training or racing.")
            return false
        }

        // Guard: During the first training check, skip mood recovery for Normal mood to allow training analysis first.
        if (training.firstTrainingCheck && trainee.mood == Mood.NORMAL && !ButtonRestAndRecreation.check(game.imageUtils, sourceBitmap = sourceBitmap)) {
            MessageLog.i(
                TAG,
                "[MOOD] Current mood is Normal. Not recovering mood due to firstTrainingCheck flag being active. Will need to complete a training first before being allowed to recover mood.",
            )
            return false
        }

        // Allow subclasses to make item-aware mood recovery decisions, but only when the mood is already below the recovery floor.
        val floor = moodRecoveryFloor()
        if (trainee.mood < floor) {
            val itemDecision = shouldRecoverMoodFromItems(sourceBitmap)
            if (itemDecision != null) {
                return itemDecision
            }
        }

        return (trainee.mood < floor)
    }

    /**
     * Performs mood recovery for the trainee.
     *
     * @param sourceBitmap Current screen bitmap.
     * @param targetMood The mood level to recover to. Defaults to GOOD.
     * @return True if mood was successfully recovered, false otherwise.
     */
    open fun performMoodRecovery(sourceBitmap: Bitmap, targetMood: Mood = Mood.GOOD): Boolean {
        return recoverMood(sourceBitmap, targetMood = targetMood)
    }

    /**
     * Checks if the bot is currently at the Main screen or the screen with available options.
     *
     * This also ensures that the Main screen does not contain the option to select a race.
     *
     * @return True if the bot is at the Main screen, false otherwise.
     */
    open fun checkMainScreen(): Boolean {
        // If there is a dialog on the screen, then we are not directly on the Main screen.
        if (DialogUtils.check(game.imageUtils)) {
            return false
        }

        return ButtonHomeFullStats.check(game.imageUtils) && IconTazuna.check(game.imageUtils) && ButtonTraining.check(game.imageUtils)
    }

    /**
     * Checks if the bot is currently at the Training Event screen with an active event.
     *
     * @return True if the bot is at the Training Event screen, false otherwise.
     */
    open fun checkTrainingEventScreen(): Boolean {
        MessageLog.i(TAG, "\n[INFO] Checking if the bot is sitting on the Training Event screen.")
        return if (IconTrainingEventHorseshoe.check(game.imageUtils)) {
            MessageLog.v(TAG, "[INFO] Bot is at the Training Event screen.")
            true
        } else {
            MessageLog.i(TAG, "[INFO] Bot is not at the Training Event screen.")
            false
        }
    }

    /**
     * Checks if the bot is currently at the preparation screen for a mandatory race.
     *
     * @return True if the bot is at the Race Preparation screen for a mandatory race, false otherwise.
     */
    open fun checkMandatoryRacePrepScreen(): Boolean {
        MessageLog.i(TAG, "\n[INFO] Checking if the bot is sitting on the Race Preparation screen for a mandatory race.")
        val sourceBitmap = game.imageUtils.getSourceBitmap()
        return if (IconRaceDayRibbon.check(game.imageUtils, sourceBitmap = sourceBitmap)) {
            MessageLog.v(TAG, "[INFO] Bot is at the preparation screen with a mandatory race ready to be completed.")
            if (game.scenario == "Unity Cup") game.wait(1.0)
            true
        } else if (IconGoalRibbon.check(game.imageUtils, sourceBitmap = sourceBitmap)) {
            // Most likely the user started the bot here so a delay will need to be placed to allow the start banner of the Service to disappear.
            game.wait(2.0)
            MessageLog.v(TAG, "[INFO] Bot is at the Race Selection screen with a mandatory race needing to be selected.")
            // Walk back to the preparation screen.
            ButtonBack.click(game.imageUtils, sourceBitmap = sourceBitmap)
            game.wait(1.0)
            true
        } else if (game.scenario == "Unity Cup" && ButtonUnityCupRace.check(game.imageUtils, sourceBitmap = sourceBitmap)) {
            MessageLog.v(TAG, "[INFO] Bot is awaiting opponent selection for a Unity Cup race.")
            true
        } else {
            MessageLog.i(TAG, "[INFO] Bot is not at the Race Preparation screen for a mandatory race.")
            false
        }
    }

    /**
     * Refreshes the date before a mandatory race when the Main screen was skipped on the way in.
     *
     * A training or rest action advances the game into the mandatory race screens, bypassing the Main screen where [updateDate] normally runs.
     * Without this, the race name is looked up against the previous turn, which matches the wrong race and gets the wrong per-distance running style.
     */
    private fun refreshDateForMandatoryRace() {
        if (bHasCheckedDateThisTurn) return

        // Only the date is refreshed, so bHasCheckedDateThisTurn is left alone and the remaining turn-start updates still run at the Main screen.
        // Passing isOnMainScreen = false makes the OCR try the Race List anchor before falling back to the Main screen one.
        updateDate(isOnMainScreen = false)
    }

    /**
     * Checks if the bot is currently at the Racing screen.
     *
     * @return True if the bot is at the Racing screen, false otherwise.
     */
    open fun checkRacingScreen(): Boolean {
        MessageLog.i(TAG, "\n[INFO] Checking if the bot is sitting on the Racing screen.")
        return if (ButtonChangeRunningStyle.check(game.imageUtils)) {
            MessageLog.v(TAG, "[INFO] Bot is at the Racing screen waiting to be skipped or done manually.")
            true
        } else {
            MessageLog.i(TAG, "[INFO] Bot is not at the Racing screen.")
            false
        }
    }

    /**
     * Checks if the bot is currently at the Ending screen detailing overall results.
     *
     * @return True if the bot is at the Ending screen, false otherwise.
     */
    open fun checkEndScreen(): Boolean {
        MessageLog.i(TAG, "\n[INFO] Checking if the bot is sitting on the End screen.")
        return if (ButtonCompleteCareer.check(game.imageUtils)) {
            MessageLog.v(TAG, "[INFO] Bot is at the End screen.")
            true
        } else {
            MessageLog.i(TAG, "[INFO] Bot is not at the End screen and can keep going.")
            false
        }
    }

    /**
     * Checks if the bot should stop before the finals on turn 72.
     *
     * @return True if the bot should stop, false otherwise.
     */
    open fun checkFinalsStop(): Boolean {
        if (!enableStopBeforeFinals) {
            Log.d(TAG, "\n[DEBUG] checkFinalsStop:: Flag is false so skipping Finals check.")
            return false
        } else if (date.day > 72) {
            // If already past turn 72, skip the check to prevent re-checking.
            Log.d(TAG, "\n[DEBUG] checkFinalsStop:: Turn is greater than 72 so skipping Finals check.")
            return false
        }

        MessageLog.i(TAG, "\n[FINALS] Checking if bot should stop before the finals.")

        // Check if turn is 72, but only stop if we progressed to turn 72 during this run.
        if (date.day == 72 && stopBeforeFinalsInitialTurnNumber != -1) {
            MessageLog.v(TAG, "\n[END] Detected turn 72. Stopping bot before the finals.")
            game.notificationMessage = "Stopping bot before the finals on turn 72."
            return true
        }

        // Track initial turn number on first check to avoid stopping if bot starts on turn 72.
        if (stopBeforeFinalsInitialTurnNumber == -1) {
            stopBeforeFinalsInitialTurnNumber = date.day
        }

        return false
    }

    /**
     * Checks if the bot should stop at any of the user-specified dates.
     *
     * @return True if the bot should stop, false otherwise.
     */
    open fun checkStopAtDate(): Boolean {
        if (!enableStopAtDate) {
            Log.d(TAG, "\n[DEBUG] checkStopAtDate:: Flag is false so skipping Stop at Date check.")
            return false
        }

        MessageLog.i(TAG, "\n[DATE] Checking if bot should stop at any specified date. Current date: $date.")

        // Track initial turn number on first check to avoid stopping immediately if bot starts after the target date
        if (stopAtDateInitialTurnNumber == -1) {
            stopAtDateInitialTurnNumber = date.day
        }

        for (stopAtDate in stopAtDates) {
            val parts = stopAtDate.split(" ")
            if (parts.size != 3) {
                MessageLog.e(TAG, "[ERROR] checkStopAtDate:: Invalid Stop at Date format for '$stopAtDate'. Expected 'YEAR MONTH PHASE'")
                continue
            }

            val targetYear =
                try {
                    DateYear.valueOf(parts[0].uppercase())
                } catch (_: IllegalArgumentException) {
                    null
                }
            val targetMonth =
                try {
                    DateMonth.valueOf(parts[1].uppercase())
                } catch (_: IllegalArgumentException) {
                    null
                }
            val targetPhase =
                try {
                    DatePhase.valueOf(parts[2].uppercase())
                } catch (_: IllegalArgumentException) {
                    null
                }

            if (targetYear == null || targetMonth == null || targetPhase == null) {
                MessageLog.e(TAG, "[ERROR] checkStopAtDate:: Invalid Stop at Date components for '$stopAtDate'.")
                continue
            }

            val targetDay = GameDate.toDay(targetYear, targetMonth, targetPhase)

            if (date.day >= targetDay && stopAtDateInitialTurnNumber <= targetDay) {
                MessageLog.v(TAG, "\n[END] Reached target date: $stopAtDate (Turn $targetDay). Stopping bot.")
                game.notificationMessage = "Stopping bot at the specified date: $stopAtDate (Turn $targetDay)"
                return true
            }
        }

        return false
    }

    /**
     * Checks if the trainee has an injury and attempts to heal it.
     *
     * @param sourceBitmap Optional pre-captured bitmap to analyze.
     * @return True if an injury was detected and healing was attempted, false otherwise.
     */
    open fun checkInjury(sourceBitmap: Bitmap? = null): Boolean {
        MessageLog.i(TAG, "\n[INJURY] Checking if there is an injury that needs healing on $date.")
        val sourceBitmap = sourceBitmap ?: game.imageUtils.getSourceBitmap()

        return when (ButtonInfirmary.checkDisabled(game.imageUtils, sourceBitmap)) {
            true -> {
                MessageLog.i(TAG, "[INJURY] No injury detected.")
                false
            }

            false -> {
                MessageLog.v(TAG, "[INJURY] Injury detected. Attempting to heal...")
                if (ButtonInfirmary.click(game.imageUtils, sourceBitmap = sourceBitmap)) {
                    game.wait(game.dialogWaitDelay)
                    ButtonOk.click(game.imageUtils, region = game.imageUtils.regionMiddle)
                    game.wait(game.dialogWaitDelay)

                    if (IconInfirmaryEventHeader.check(game.imageUtils)) {
                        MessageLog.v(TAG, "[INJURY] Injury detected and attempted to heal.")
                    } else {
                        MessageLog.v(TAG, "[INJURY] Injury detected and no follow-up Infirmary event appeared.")
                    }
                    true
                } else {
                    MessageLog.w(TAG, "[WARN] checkInjury:: Injury detected but failed to click Infirmary button.")
                    false
                }
            }

            null -> {
                MessageLog.w(TAG, "[WARN] checkInjury:: Failed to detect the Infirmary button.")
                false
            }
        }
    }

    /**
     * Returns whether the trainee is currently in the finale season.
     *
     * @return True if in the finale season, false otherwise.
     */
    open fun checkFinals(): Boolean {
        return date.bIsFinaleSeason
    }

    /**
     * Updates the current date by detecting it on screen.
     *
     * @param isOnMainScreen If true, checks the Main screen for the date directly. Defaults to true.
     * @return True if the date changed, false otherwise.
     */
    open fun updateDate(isOnMainScreen: Boolean = true): Boolean {
        MessageLog.i(TAG, "[DATE] Attempting to update the current date.")
        val prevDay: Int = date.day
        if (!date.update(game.imageUtils, scenario = game.scenario, isOnMainScreen = isOnMainScreen)) {
            MessageLog.e(TAG, "[ERROR] updateDate:: date.update() failed to update date.")
            return false
        }

        if (date.day == prevDay) {
            Log.d(TAG, "[DEBUG] updateDate:: Date did not change.")
            return false
        } else {
            recreationAttemptFailedThisTurn = false
            MessageLog.v(TAG, "[DATE] New date: $date")
            return true
        }
    }

    /**
     * Handles the Inheritance event if detected on the screen.
     *
     * @return True if the Inheritance event occurred and was accepted, false otherwise.
     */
    open fun handleInheritanceEvent(): Boolean {
        // Stop checking after Senior Year Early Apr.
        return if (date.day <= 56) {
            if (ButtonInheritance.check(game.imageUtils)) {
                val (_, sourceBitmap) = ButtonInheritance.find(game.imageUtils)
                SparkSelector.selectAndTapBestSpark(game, sourceBitmap)
                if (ButtonInheritance.click(game.imageUtils)) {
                    MessageLog.v(TAG, "\n[INFO] Claimed an inheritance on $date.")
                    trainee.bHasUpdatedAptitudes = false
                    bHasCheckedDateThisTurn = false
                    game.waitForLoading()
                    if (SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMode", false)) {
                        openAptitudesDialog()
                        tryHandleAllDialogs()
                    }
                    true
                } else {
                    false
                }
            } else {
                false
            }
        } else {
            false
        }
    }

    /**
     * Attempts to recover the trainee's energy.
     *
     * @param sourceBitmap Optional pre-captured bitmap to analyze.
     * @return True if energy was successfully recovered, false otherwise.
     */
    open fun recoverEnergy(sourceBitmap: Bitmap? = null): Boolean {
        MessageLog.v(TAG, "\n[ENERGY] Now starting attempt to recover energy on $date.")
        val sourceBitmap: Bitmap = sourceBitmap ?: game.imageUtils.getSourceBitmap()

        // First, try to handle recreation date which also recovers energy if a date is available.
        // Skip recreation date if it's already completed (will only be used for mood recovery).
        // While the schedule is active, a pending date is reserved for it and trainee recreation does not restore energy, so skip straight to resting.
        // Once the schedule is abandoned, resting here advances the date chain again.
        if (
            !isScheduleActive() &&
            !recreationDateCompleted &&
            IconRecreationDate.check(game.imageUtils, sourceBitmap = sourceBitmap) &&
            handleRecreationDate(recoverMoodIfCompleted = false)
        ) {
            MessageLog.v(TAG, "[ENERGY] Successfully recovered energy via recreation date.")
            return true
        }

        // Otherwise, fall back to the regular energy recovery logic.
        return when {
            ButtonRest.click(game.imageUtils, sourceBitmap = sourceBitmap) -> {
                ButtonOk.click(game.imageUtils, region = game.imageUtils.regionMiddle)
                // Another OK tap for the possibility of a scheduled race warning popup.
                game.wait(game.dialogWaitDelay)
                ButtonOk.click(game.imageUtils, region = game.imageUtils.regionMiddle)
                game.waitForLoading()
                MessageLog.v(TAG, "[ENERGY] Successfully recovered energy via rest.")
                true
            }

            ButtonRestAndRecreation.click(game.imageUtils, sourceBitmap = sourceBitmap) -> {
                ButtonOk.click(game.imageUtils, region = game.imageUtils.regionMiddle)
                // Another OK tap for the possibility of a scheduled race warning popup.
                game.wait(game.dialogWaitDelay)
                ButtonOk.click(game.imageUtils, region = game.imageUtils.regionMiddle)
                game.waitForLoading()
                MessageLog.v(TAG, "[ENERGY] Successfully recovered energy via Summer rest.")
                true
            }

            else -> {
                MessageLog.w(TAG, "[WARN] recoverEnergy:: Failed to recover energy. Moving on...")
                false
            }
        }
    }

    /**
     * Attempts to recover mood to maintain at least "Above Normal" status.
     *
     * @param sourceBitmap Optional pre-captured bitmap to analyze.
     * @param targetMood The mood level to recover to. Defaults to GREAT.
     * @return True if mood was successfully recovered, false otherwise.
     */
    open fun recoverMood(sourceBitmap: Bitmap? = null, targetMood: Mood = Mood.GOOD): Boolean {
        MessageLog.v(TAG, "\n[MOOD] Detecting current mood on $date.")

        val sourceBitmap = sourceBitmap ?: game.imageUtils.getSourceBitmap()

        // Make sure the trainee's mood is up to date.
        trainee.updateMood(game.imageUtils, sourceBitmap)

        MessageLog.v(TAG, "[MOOD] Detected mood to be ${trainee.mood}.")

        // Only recover mood if its below target mood and it's not Summer.
        return if (training.firstTrainingCheck && trainee.mood == Mood.NORMAL && !ButtonRestAndRecreation.check(game.imageUtils, sourceBitmap = sourceBitmap)) {
            MessageLog.v(
                TAG,
                "[MOOD] Current mood is Normal. Not recovering mood due to firstTrainingCheck flag being active. Will need to complete a training first before being allowed to recover mood.",
            )
            false
        } else if ((trainee.mood < targetMood) &&
            (
                ButtonRecreation.check(game.imageUtils, sourceBitmap = sourceBitmap) ||
                    ButtonRestAndRecreation.check(
                        game.imageUtils,
                        sourceBitmap = sourceBitmap,
                    )
            )
        ) {
            MessageLog.v(TAG, "[MOOD] Current mood is not good (${trainee.mood}). Recovering mood now.")

            // Check if a date is available.
            if (!recreationDateCompleted && IconRecreationDate.check(game.imageUtils, sourceBitmap = sourceBitmap)) {
                if (handleRecreationDate(recoverMoodIfCompleted = true, doDateRecreation = !isScheduleActive())) {
                    MessageLog.v(TAG, "[MOOD] Successfully recovered mood via recreation date.")
                }
            } else {
                // Otherwise, recover mood as normal.
                // Note that if a date was already completed, the Recreation popup will still show so it will require an additional step to recover mood.
                recreationDateCompleted = true
                if (!ButtonRecreation.click(game.imageUtils, sourceBitmap = sourceBitmap)) {
                    ButtonRestAndRecreation.click(game.imageUtils, sourceBitmap = sourceBitmap)
                }

                // Tap OK for the possibility of a scheduled race warning popup.
                game.wait(game.dialogWaitDelay)
                if (ButtonOk.click(game.imageUtils, region = game.imageUtils.regionMiddle)) {
                    game.waitForLoading()
                }

                // The Recreation popup is now open so an additional step is required to recover mood.
                if (LabelRecreationUmamusume.click(game.imageUtils)) {
                    MessageLog.v(TAG, "[MOOD] Recreation date is already completed. Recovering mood with the Umamusume now...")
                    game.waitForLoading()
                } else {
                    // Otherwise, dismiss the popup that says to confirm recreation if the user has not set it to skip the confirmation in their in-game settings.
                    ButtonOk.click(game.imageUtils, region = game.imageUtils.regionMiddle)
                    game.waitForLoading()
                }
                if (ButtonRestAndRecreation.check(game.imageUtils, sourceBitmap = sourceBitmap)) {
                    MessageLog.v(TAG, "[MOOD] Successfully recovered mood via Summer rest.")
                } else {
                    MessageLog.v(TAG, "[MOOD] Successfully recovered mood.")
                }
            }
            true
        } else {
            MessageLog.i(TAG, "[MOOD] Current mood is good enough or its the Summer event. Moving on...")
            false
        }
    }

    /**
     * Whether the bot should spend this turn on a scheduled recreation outing. True only when the dating schedule is enabled, the chain is not yet
     * complete, a recreation date is on screen, the current turn is pinned (regular or Pure Passion), and no mandatory career-goal race is present.
     * Scheduled (in-game agenda) and Smart Race Solver races do NOT block it - a pinned recreation outranks them.
     *
     * @param sourceBitmap An already-captured screen frame to reuse, or null to capture lazily only after the cheap pinned-turn checks pass.
     * @return True if the bot should perform a recreation outing this turn.
     */
    open fun shouldDoRecreationToday(sourceBitmap: Bitmap? = null): Boolean {
        if (!isScheduleActive() || recreationDateCompleted || recreationAttemptFailedThisTurn) return false
        // Proceed only when some card is BOTH due today (pinned, or - with catch-up on - behind its own schedule) AND not itself holding its final outing back for a later Pure Passion turn.
        // Each check must apply to the same card - a due-but-holding card A must not be waved through by an unrelated, unpinned-today card B that merely happens not to be holding.
        val anyCardDueAndReady =
            datingCards.any { card ->
                val started = outingsStarted(card)
                val dueToday =
                    DatingSchedule.isPinnedRecreationTurn(date.day, card.recreationTurns, card.purePassionTurn) ||
                        (enableRecreationCatchUp && DatingSchedule.isBehindSchedule(date.day, card.recreationTurns, started))
                dueToday && !DatingSchedule.shouldHoldFinalOuting(started, totalOutingsKnown(card), allowFinalOutingNow(card))
            }
        if (!anyCardDueAndReady) return false
        val bitmap = sourceBitmap ?: game.imageUtils.getSourceBitmap()
        // Mandatory career-goal races cannot be skipped, so they still outrank a recreation. Scheduled (in-game agenda) and Smart Race Solver races do not - the recreation overrides them.
        if (IconRaceDayRibbon.check(game.imageUtils, sourceBitmap = bitmap) || IconGoalRibbon.check(game.imageUtils, sourceBitmap = bitmap)) {
            return false
        }
        if (!IconRecreationDate.check(game.imageUtils, sourceBitmap = bitmap)) return false
        return true
    }

    /**
     * Reads the in-game "Group Event Progress X/Y" (e.g. "3/4") from the open Choose Recreation Partner dialog by OCR-ing just to the right of the [LabelEventProgress] label.
     * This is the authoritative chain position - unlike the per-run counter it survives a bot restart and any dates done manually. The offset region is display-dependent,
     * so it may need on-device calibration. The debugName dumps the cropped region for tuning.
     *
     * @param sourceBitmap The current screen capture with the partner dialog open.
     * @return The (completed, total) outing counts, or null when the label or the numbers could not be read.
     */
    open fun getGroupEventProgress(sourceBitmap: Bitmap): Pair<Int, Int>? {
        val templateBitmap = LabelEventProgress.template.getBitmap(game.imageUtils) ?: return null
        val point = LabelEventProgress.findImageWithBitmap(game.imageUtils, sourceBitmap = sourceBitmap) ?: return null
        // The "X/Y" sits just right of the "Group Event Progress" pill, so anchor to the pill's right edge and match its height. This survives scrolling and resolution changes.
        val text =
            game.imageUtils.performOCROnRegion(
                sourceBitmap,
                game.imageUtils.relX(0.0, (point.x + (templateBitmap.width / 2)).toInt() + GROUP_PROGRESS_GAP_X),
                game.imageUtils.relY(0.0, (point.y - (templateBitmap.height / 2) - 4).toInt()),
                game.imageUtils.relWidth(GROUP_PROGRESS_WIDTH),
                game.imageUtils.relHeight(templateBitmap.height + 8),
                useThreshold = true,
                useGrayscale = true,
                scale = 2.0,
                ocrEngine = "tesseract",
                debugName = "GroupEventProgress",
            )
        val numbers = Regex("\\d+").findAll(text).mapNotNull { it.value.toIntOrNull() }.toList()
        if (numbers.size < 2) {
            MessageLog.w(TAG, "[WARN] getGroupEventProgress:: Could not read an X/Y progress from \"$text\".")
            return null
        }
        val completed = numbers[0]
        val total = numbers[1]
        if (total < 1 || completed < 0 || completed > total) {
            MessageLog.w(TAG, "[WARN] getGroupEventProgress:: Implausible progress $completed/$total from \"$text\".")
            return null
        }
        return Pair(completed, total)
    }

    /**
     * Backs out of the open Choose Recreation Partner dialog and waits for the screen to settle.
     *
     * @return Always false, so a caller can return it directly as the "did not start an outing" result.
     */
    private fun cancelPartnerDialog(): Boolean {
        ButtonCancel.click(game.imageUtils)
        game.waitForLoading()
        return false
    }

    /** Whether [card]'s final chain outing may be taken right now - only on its Pure Passion turn (or when the schedule or that card's Pure Passion turn is off). */
    private fun allowFinalOutingNow(card: DatingSchedule.DatingCardConfig): Boolean = DatingSchedule.allowFinalOuting(enableDatingSchedule, card.purePassionTurn, date.day)

    /** Whether the recreation schedule is actively driving decisions: enabled and at least one configured card is not abandoned (its Pure Passion window has not passed with its chain unfinished). */
    private fun isScheduleActive(): Boolean =
        enableDatingSchedule && datingCards.any { card -> !DatingSchedule.isScheduleAbandoned(card.purePassionTurn, date.day, recreationDateCompleted) }

    /**
     * Handles the Recreation date event if detected on the screen.
     *
     * @param recoverMoodIfCompleted If true, recovers mood if the date was already completed.
     * @param doDateRecreation If true, advance the support-card date chain (tap the group event). If false, recreate with the trainee instead - used for opportunistic mood / energy recovery so the schedule alone drives the date chain.
     * @return True if the Recreation date event was successfully completed, false otherwise.
     */
    open fun handleRecreationDate(recoverMoodIfCompleted: Boolean = false, doDateRecreation: Boolean = true): Boolean {
        return if (ButtonRecreation.click(game.imageUtils)) {
            // Tap OK for the possibility of a scheduled race warning popup.
            game.wait(game.dialogWaitDelay)
            ButtonOk.click(game.imageUtils, region = game.imageUtils.regionMiddle)

            MessageLog.v(TAG, "\n[RECREATION_DATE] Recreation has a possible date available.")
            game.wait(1.0)
            // Check if all of the possible dates have been completed.
            if (LabelRecreationDateComplete.check(game.imageUtils)) {
                MessageLog.v(TAG, "[RECREATION_DATE] Recreation date is already completed.")
                recreationDateCompleted = true
                if (recoverMoodIfCompleted) {
                    MessageLog.v(TAG, "[RECREATION_DATE] Mood requires recovery. Recovering mood with the Umamusume now...")
                    LabelRecreationUmamusume.click(game.imageUtils)
                    game.waitForLoading()
                    true
                } else {
                    MessageLog.i(TAG, "[RECREATION_DATE] Mood does not require recovery. Moving on...")
                    ButtonCancel.click(game.imageUtils)
                    true
                }
            } else {
                // If not complete, handle both regular support dates and Group Support Card dates.
                // Group Support Cards open a "Choose Recreation Partner" dialog.
                if (IconRecreationDateOpen.click(game.imageUtils)) {
                    game.wait(1.0)
                    MessageLog.v(TAG, "[RECREATION_DATE] Choose Recreation Partner dialog opened.")

                    if (!doDateRecreation) {
                        // The schedule drives the date chain, so an opportunistic recovery recreation goes to the trainee (normal recreation) and leaves the chain alone.
                        if (LabelRecreationUmamusume.click(game.imageUtils)) {
                            MessageLog.v(TAG, "[RECREATION_DATE] Recreating with the trainee (normal recreation), leaving the date chain for the schedule.")
                            game.waitForLoading()
                            true
                        } else {
                            // The trainee option was not found, so back out of the partner dialog rather than leave it open to desync the next turn.
                            MessageLog.w(TAG, "[WARN] handleRecreationDate:: Could not find the trainee recreation option. Backing out of the partner dialog.")
                            cancelPartnerDialog()
                        }
                    } else if (datingCards.size <= 1) {
                        // Exactly one card configured (the common case): identical to the original single-card flow, just reading through the map accessors.
                        handleSingleCardRecreationDate()
                    } else {
                        // Multiple cards configured: OCR each row's name to work out which card it belongs to.
                        handleMultiCardRecreationDate()
                    }
                } else if (LabelEventProgress.click(game.imageUtils)) {
                    // Legacy support cards or situations where the dialog doesn't apply. No partner-selection dialog exists here to disambiguate cards, so this always advances the primary (first configured) card.
                    recreationOutingsStartedByCard[primaryDatingCard.cardName] = outingsStarted(primaryDatingCard) + 1
                    game.waitForLoading()
                    MessageLog.v(TAG, "[RECREATION_DATE] Recreation date can be done.")
                    true
                } else {
                    MessageLog.e(TAG, "[ERROR] handleRecreationDate:: Failed to find a way to start the recreation date.")
                    game.waitForLoading()
                    false
                }
            }
        } else {
            false
        }
    }

    /**
     * Handles the "Choose Recreation Partner" dialog when exactly one card is configured - identical to the original single-card behavior: read the
     * authoritative in-game group-event progress once for the (only) visible chain, then tap the first available row.
     *
     * @return True if a date was successfully started (or correctly held back), false if the dialog had to be backed out of due to an error.
     */
    private fun handleSingleCardRecreationDate(): Boolean {
        val card = primaryDatingCard
        // Read the in-game group-event progress (e.g. "3/4"). This is the authoritative chain position, so it holds correctly even after a bot restart or manual play.
        getGroupEventProgress(game.imageUtils.getSourceBitmap())?.let { (completed, total) ->
            recreationOutingsStartedByCard[card.cardName] = completed
            recreationTotalOutingsKnownByCard[card.cardName] = total
            MessageLog.i(TAG, "[RECREATION_DATE] Group event progress read as $completed/$total.")
        }

        if (DatingSchedule.shouldHoldFinalOuting(outingsStarted(card), totalOutingsKnown(card), allowFinalOutingNow(card))) {
            // The next outing would complete the chain and trigger Pure Passion. This is not the Pure Passion turn, so back out and leave the final for that turn.
            MessageLog.i(TAG, "[RECREATION_DATE] Next outing is the final one. Holding it for the Pure Passion turn. Backing out.")
            return cancelPartnerDialog()
        }

        // Use the ScrollList processor to find and click the first available date progress label.
        val bResult =
            ScrollList.processWithFallback(
                game,
                fallbackComponent = ButtonEventProgressChevron,
                bForceComponentDetection = true,
                onEntry = { _, entry ->
                    MessageLog.i(TAG, "[INFO] Found entry: $entry at ${entry.bbox.cx}, ${entry.bbox.cy}")
                    game.tap(entry.bbox.cx.toDouble(), entry.bbox.cy.toDouble())
                    game.waitForLoading()
                    true
                },
            )

        return if (bResult) {
            recreationOutingsStartedByCard[card.cardName] = outingsStarted(card) + 1
            MessageLog.v(TAG, "[RECREATION_DATE] Started a date from the partner selection dialog. Outings started this run: ${outingsStarted(card)}.")
            game.waitForLoading()
            true
        } else {
            MessageLog.e(TAG, "[ERROR] handleRecreationDate:: Failed to find any date progress labels in the partner selection dialog. Backing out.")
            cancelPartnerDialog()
        }
    }

    /**
     * Handles the "Choose Recreation Partner" dialog when multiple cards are configured. OCRs each row's name (reusing the same fuzzy matching used for the
     * career-selection support-card list) to work out which configured card it belongs to, and taps the first row whose matched card is ready for an outing
     * (not holding its final one for a later Pure Passion turn). Rows that match no configured card, or whose matched card is holding, are skipped rather than
     * tapped, and the scan continues to the next row.
     *
     * Unlike the single-card path, this does not attempt to re-read each row's own "X/Y" progress via OCR - only the bot's own per-card outing counter is
     * used here, since reliably cropping a specific row's progress region from a multi-row dialog needs on-device calibration this could not verify.
     *
     * @return True if a date was successfully started, false if the dialog had to be backed out of (no configured card claimed a ready row, or no rows were found at all).
     */
    private fun handleMultiCardRecreationDate(): Boolean {
        var matchedCard: DatingSchedule.DatingCardConfig? = null
        var sawAnyRow = false
        val unclaimedRowOcrTexts = mutableListOf<String>()

        ScrollList.processWithFallback(
            game,
            fallbackComponent = ButtonEventProgressChevron,
            bForceComponentDetection = true,
            onEntry = { _, entry ->
                sawAnyRow = true
                val ocrText = SupportCardSelection.ocrEntry(game.imageUtils, entry)
                val card = DatingSchedule.matchCardForRow(ocrText, datingCards, SupportCardSelection::matchesName)
                when {
                    card == null -> {
                        unclaimedRowOcrTexts.add(ocrText)
                        MessageLog.d(TAG, "[DEBUG] handleRecreationDate:: No configured card claims this row (ocr=\"$ocrText\"). Skipping.")
                        false
                    }
                    DatingSchedule.shouldHoldFinalOuting(outingsStarted(card), totalOutingsKnown(card), allowFinalOutingNow(card)) -> {
                        MessageLog.i(
                            TAG,
                            "[RECREATION_DATE] Card \"${card.cardName}\" (ocr=\"$ocrText\") next outing is the final one. Holding it for the Pure Passion turn. Skipping row.",
                        )
                        false
                    }
                    else -> {
                        MessageLog.i(TAG, "[RECREATION_DATE] Matched card \"${card.cardName}\" (ocr=\"$ocrText\"). Tapping row.")
                        game.tap(entry.bbox.cx.toDouble(), entry.bbox.cy.toDouble())
                        game.waitForLoading()
                        matchedCard = card
                        true
                    }
                }
            },
        )

        val matched = matchedCard
        if (matched == null) {
            if (!sawAnyRow) {
                MessageLog.e(TAG, "[ERROR] handleRecreationDate:: Failed to find any date progress labels in the partner selection dialog. Backing out.")
            } else {
                MessageLog.w(
                    TAG,
                    "[WARN] handleRecreationDate:: No configured card's name matched any row in the partner dialog (or the matched card is holding its final " +
                        "outing). Backing out for this turn. If this keeps happening, double check that each card's \"Card Name\" is the actual support card's " +
                        "name shown in-game (e.g. \"Kitasan Black\") - not the preset label (e.g. \"Team Sirius\" / \"Heirs to the Throne\"), which never appears in " +
                        "the dialog. Unclaimed row OCR text this attempt: ${unclaimedRowOcrTexts.joinToString("; ") { "\"$it\"" }}.",
                )
            }
            return cancelPartnerDialog()
        }

        recreationOutingsStartedByCard[matched.cardName] = outingsStarted(matched) + 1
        MessageLog.v(TAG, "[RECREATION_DATE] Started a date for \"${matched.cardName}\". Outings started this run: ${outingsStarted(matched)}.")
        return true
    }

    /**
     * Handles the Crane Game event by attempting to complete it with three long-press attempts.
     *
     * @return True if the crane game was successfully completed, false otherwise.
     */
    open fun handleCraneGame(): Boolean {
        MessageLog.v(TAG, "\n[CRANE_GAME] Starting Crane Game attempt...")

        // Find the Crane Game button location.
        val buttonLocation = ButtonCraneGame.find(game.imageUtils)
        val buttonPoint = buttonLocation.first
        if (buttonPoint == null) {
            MessageLog.w(TAG, "[WARN] handleCraneGame:: Could not find the Crane Game button. Aborting.")
            return false
        }

        val imageName = ButtonCraneGame.template.path
        val pressDurations = listOf(1.90, 1.00, 0.65)

        // Perform three attempts with different press durations.
        for (attempt in 1..3) {
            val pressDuration = pressDurations[attempt - 1]
            MessageLog.i(TAG, "[CRANE_GAME] Attempt $attempt: Long pressing for ${pressDuration}s...")

            // Perform long press on the button.
            game.gestureUtils.tap(buttonPoint.x, buttonPoint.y, imageName, longPress = true, pressDuration = pressDuration)

            if (attempt < 3) {
                // After attempts 1 and 2, wait for the button to reappear.
                MessageLog.i(TAG, "[CRANE_GAME] Waiting for the Crane Game button to reappear after attempt $attempt...")
                var buttonReappeared = false
                val maxWaitTime = 30.0
                val checkInterval = 1.0
                var elapsedTime = 0.0

                while (elapsedTime < maxWaitTime) {
                    if (ButtonCraneGame.check(game.imageUtils)) {
                        buttonReappeared = true
                        break
                    }
                    game.wait(checkInterval, skipWaitingForLoading = true)
                    elapsedTime += checkInterval
                }

                if (!buttonReappeared) {
                    MessageLog.w(TAG, "[WARN] handleCraneGame:: The Crane Game button did not reappear within $maxWaitTime seconds after attempt $attempt.")
                }

                game.wait(1.0)
            } else {
                MessageLog.v(TAG, "[CRANE_GAME] Final attempt completed.")
                return true
            }
        }

        return false
    }

    /**
     * Handles the skill list screen to purchase skills.
     *
     * This function initiates the skill purchasing process using the specified
     * skill plan. If no plan name is provided, the default skill plan is used.
     *
     * @param skillPlanName The optional name of the skill plan to use.
     * @return True if the skill purchasing process was successful, false otherwise.
     */
    open fun handleSkillListScreen(skillPlanName: String? = null): Boolean {
        MessageLog.v(TAG, "[SKILLS] Beginning process to purchase skills...")
        return skillPlan.start(skillPlanName)
    }

    /**
     * Opens the Umamusume Details dialog to update trainee aptitudes.
     *
     * This function only opens the dialog - the actual aptitude update is performed
     * by [handleDialogs] when it processes the "umamusume_details" dialog.
     */
    open fun openAptitudesDialog() {
        MessageLog.d(TAG, "[DEBUG] openAptitudesDialog:: Opening aptitudes dialog...")
        ButtonHomeFullStats.click(game.imageUtils)
        game.wait(game.dialogWaitDelay, skipWaitingForLoading = true)
    }

    /**
     * Computes the trainee's estimated overall rank from the latest stats, aptitudes, and owned skills, and stores it on the trainee for logging and the dashboard. Skips
     * computation until stats have been read at least once. Each owned skill is scored via its `eval_pt` and an aptitude checkType derived from its condition. This mirrors the
     * UmaTools calculator, so the result is an estimate.
     */
    fun updateEstimatedRank() {
        if (!trainee.bHasUpdatedStats) return
        val aptitudes =
            RankAptitudes(
                turf = trainee.trackSurfaceAptitudes[TrackSurface.TURF]?.name ?: "G",
                dirt = trainee.trackSurfaceAptitudes[TrackSurface.DIRT]?.name ?: "G",
                sprint = trainee.trackDistanceAptitudes[TrackDistance.SPRINT]?.name ?: "G",
                mile = trainee.trackDistanceAptitudes[TrackDistance.MILE]?.name ?: "G",
                medium = trainee.trackDistanceAptitudes[TrackDistance.MEDIUM]?.name ?: "G",
                long = trainee.trackDistanceAptitudes[TrackDistance.LONG]?.name ?: "G",
                front = trainee.runningStyleAptitudes[RunningStyle.FRONT_RUNNER]?.name ?: "G",
                pace = trainee.runningStyleAptitudes[RunningStyle.PACE_CHASER]?.name ?: "G",
                late = trainee.runningStyleAptitudes[RunningStyle.LATE_SURGER]?.name ?: "G",
                end = trainee.runningStyleAptitudes[RunningStyle.END_CLOSER]?.name ?: "G",
            )
        val skillInputs =
            trainee.ownedSkillNames.toList().mapNotNull { skillName ->
                val data = game.skillDatabase.getSkillData(skillName) ?: return@mapNotNull null
                SkillScoreInput(data.evalPt, SkillDatabase.deriveCheckType(data.condition, data.precondition))
            }
        trainee.estimatedRank =
            estimateRank(
                trainee.stats.speed,
                trainee.stats.stamina,
                trainee.stats.power,
                trainee.stats.guts,
                trainee.stats.wit,
                skillInputs,
                aptitudes,
                trainee.uniqueSkillLevel,
            )
        trainee.estimatedRank?.let { rank ->
            RankProjection.record(date.day, rank.totalScore)
            broadcastRankProjection()
        }
    }

    /**
     * Projects the final rank from the Estimated Rank trajectory so far and surfaces it: a live frame to the Remote Log Viewer's
     * projection panel every turn, and a throttled line into the in-app log. Called from [updateEstimatedRank] once per turn.
     */
    fun broadcastRankProjection() {
        val projection = RankProjection.project(RankProjection.DEFAULT_FINALE_TURN) ?: return
        val json =
            org.json.JSONObject()
                .put("currentGrade", projection.currentGrade)
                .put("currentScore", projection.currentScore)
                .put("projectedGrade", projection.projectedGrade)
                .put("projectedScore", projection.projectedScore)
                .put("scorePerTurn", projection.scorePerTurn)
        LogStreamServer.broadcastRankProjection(json.toString())
        if (date.day % 6 == 0) {
            MessageLog.i(
                TAG,
                "[PROJECTION] On track for ${projection.projectedGrade} (score ~${projection.projectedScore}) by the finale; currently ${projection.currentGrade} (${projection.currentScore}).",
            )
        }
    }

    /**
     * If projection-driven auto-abandon is enabled, stops the run once its projected final grade is below the configured target after the trust turn. Uses the same projection
     * [broadcastRankProjection] surfaces, so the decision matches what the log viewer shows. Stops via [CampaignBreakpointException] (the standard stop-condition mechanism), which
     * ends the current run so an unattended farm can restart on a fresher one. A no-op when disabled or before the trust turn.
     */
    private fun checkAutoAbandon() {
        if (!autoAbandonConfig.enabled) return
        val decision = RunAbandonPolicy.evaluate(RankProjection.project(RankProjection.DEFAULT_FINALE_TURN), date.day, RankProjection.observationCount(), autoAbandonConfig)
        when (RunAbandonPolicy.resolveOutcome(decision.shouldAbandon, autoAbandonAction, bAutoAbandonNotified)) {
            AbandonOutcome.CONTINUE -> return
            AbandonOutcome.NOTIFY_ONCE -> {
                bAutoAbandonNotified = true
                MessageLog.w(TAG, "[AUTO-ABANDON] ${decision.reason} (Notify-only mode: leaving the run running.)")
                if (DiscordUtils.enableDiscordNotifications) {
                    AppDiscordNotifications.sendInfo("Run projected below target", decision.reason)
                }
            }
            AbandonOutcome.STOP -> {
                MessageLog.w(TAG, "[AUTO-ABANDON] ${decision.reason} Stopping the run.")
                throw CampaignBreakpointException("Auto-abandon: ${decision.reason}", abandonedRun = true)
            }
        }
    }

    /**
     * Sends the trainee's owned skills to the Remote Log Viewer's Skills panel, each with its in-game category color (green/blue/yellow/red) plus gold / unique / negative flags
     * derived from the skill's icon id via SkillData, the unique skill's level, and its description and icon id for the panel's hover tooltip. Safe to call whenever the owned-skill set changes.
     */
    fun broadcastOwnedSkills() {
        val skills = org.json.JSONArray()
        for (name in trainee.ownedSkillNames) {
            val data = game.skillDatabase.getSkillData(name)
            val obj = org.json.JSONObject()
            obj.put("name", name)
            // Category color (green/blue/yellow/red) drives the pill's bullet; the flags below layer the unique/negative/gold treatment on top on the frontend.
            obj.put("color", data?.type?.name?.lowercase() ?: "")
            obj.put("gold", data?.bIsGold ?: false)
            obj.put("unique", data?.bIsUnique ?: false)
            obj.put("negative", data?.bIsNegative ?: false)
            obj.put("evalPt", data?.evalPt ?: 0)
            // Description and icon id feed the frontend hover tooltip (name + desc_en + GameTora-hosted icon).
            obj.put("desc", data?.description ?: "")
            obj.put("iconId", data?.iconId ?: 0)
            if (data?.bIsUnique == true && trainee.uniqueSkillLevel > 0) obj.put("level", trainee.uniqueSkillLevel)
            skills.put(obj)
        }
        val json = org.json.JSONObject()
        json.put("skills", skills)
        LogStreamServer.broadcastSkillsSnapshot(json.toString())
    }

    /**
     * Opens the Umamusume Class dialog to update trainee fan count.
     *
     * This function only opens the dialog - the actual fan count update is performed
     * by [handleDialogs] when it processes the "umamusume_class" dialog.
     */
    open fun openFansDialog() {
        MessageLog.d(TAG, "[DEBUG] openFansDialog:: Opening fans dialog...")
        ButtonHomeFansInfo.click(game.imageUtils, region = game.imageUtils.regionBottomHalf, tries = 10)
        bHasTriedCheckingFansToday = true
        game.wait(game.dialogWaitDelay, skipWaitingForLoading = true)
    }

    /**
     * Detects the trainee's current fan count class from the main screen.
     *
     * This reads the fan count class label directly from the screen using OCR
     * without opening any dialogs.
     *
     * @param bitmap Optional pre-captured bitmap to analyze.
     * @return The detected [FanCountClass], or null if detection failed.
     */
    open fun getFanCountClass(bitmap: Bitmap? = null): FanCountClass? {
        val bitmap: Bitmap = bitmap ?: game.imageUtils.getSourceBitmap()
        val templateBitmap: Bitmap? = ButtonHomeFansInfo.template.getBitmap(game.imageUtils)
        if (templateBitmap == null) {
            MessageLog.e(TAG, "[ERROR] getFanCountClass:: Could not get template bitmap for ButtonHomeFansInfo: ${ButtonHomeFansInfo.template.path}.")
            return null
        }
        val point: Point? = ButtonHomeFansInfo.findImageWithBitmap(game.imageUtils, sourceBitmap = bitmap)
        if (point == null) {
            MessageLog.w(TAG, "[WARN] getFanCountClass:: Could not find ButtonHomeFansInfo.")
            return null
        }

        val bbox =
            BoundingBox(
                x = game.imageUtils.relX(0.0, (point.x - (templateBitmap.width / 2)).toInt() - 180),
                // Add a small buffer to vertical component.
                y = game.imageUtils.relY(0.0, (point.y - 16).toInt()),
                w = game.imageUtils.relWidth(180),
                // 32px minimum for Google ML Kit.
                h = game.imageUtils.relHeight(32),
            )

        val text: String =
            game.imageUtils.performOCROnRegion(
                bitmap,
                bbox.x,
                bbox.y,
                bbox.w,
                bbox.h,
                useThreshold = false,
                useGrayscale = true,
                scale = 1.0,
                ocrEngine = "tesseract",
                debugName = "getFanCountClass",
            )
        val fanCountClass: FanCountClass? = FanCountClass.fromName(text.replace(" ", "_"))
        if (fanCountClass == null) {
            MessageLog.w(TAG, "[WARN] getFanCountClass:: Failed to match text to a FanCountClass: $text")
        }
        return fanCountClass
    }

    /**
     * Called when the bot encounters a scheduled race and reaches the Race Prep screen
     * before starting the race.
     *
     * This provides a hook for scenarios to perform actions such as using race items.
     */
    open fun onScheduledRacePrepScreen() {}

    /**
     * Handles the fallback logic when racing fails.
     *
     * This includes checking for mandatory race detection and falling back to training.
     *
     * @return True if the bot should break out of the main loop, false otherwise.
     */
    open fun handleRaceEventFallback(): Boolean {
        if (racing.detectedMandatoryRaceCheck) {
            MessageLog.v(TAG, "\n[END] Stopping bot due to detection of Mandatory Race.")
            game.notificationMessage = "Stopping bot due to detection of Mandatory Race."
            if (DiscordUtils.enableDiscordNotifications) {
                AppDiscordNotifications.sendError("Stopping bot due to detection of Mandatory Race.")
            }
            return true
        }
        ButtonBack.click(game.imageUtils)
        ButtonCancel.click(game.imageUtils)
        ButtonClose.click(game.imageUtils)
        game.wait(1.0)
        training.handleTraining()
        return false
    }

    /**
     * Detects the Spark Traits reroll screen and rerolls all spark traits up to the configured
     * maximum number of times, clicking Decide once the star threshold is met or rerolls are
     * exhausted. Applies to all scenarios.
     *
     * @return True if the traits screen was detected and handled, false otherwise.
     */
    private fun handleSparkTraitReroll(): Boolean {
        val sourceBitmap = game.imageUtils.getSourceBitmap()

        val headerX = 0
        val headerY = 0
        val headerW = SharedData.displayWidth
        val headerH = (SharedData.displayHeight * 0.07).toInt()
        val headerText = game.imageUtils.performOCROnRegion(
            sourceBitmap, headerX, headerY, headerW, headerH,
            useThreshold = false, useGrayscale = true, scale = 1.5,
            ocrEngine = "mlkit", debugName = "traits_screen_header",
        )
        if (!headerText.lowercase().contains("traits")) return false

        val bottomX = 0
        val bottomY = (SharedData.displayHeight * 0.85).toInt()
        val bottomW = SharedData.displayWidth
        val bottomH = (SharedData.displayHeight * 0.15).toInt()
        val bottomText = game.imageUtils.performOCROnRegion(
            sourceBitmap, bottomX, bottomY, bottomW, bottomH,
            useThreshold = false, useGrayscale = true, scale = 1.5,
            ocrEngine = "mlkit", debugName = "traits_screen_bottom",
        ).lowercase()
        if (!bottomText.contains("reroll") && !bottomText.contains("tp uses")) return false

        MessageLog.i(TAG, "\n[TRAITS] Detected Traits reroll screen.")

        val maxRerolls = SettingsHelper.getIntSetting("training", "sparkTraitMaxRerolls", 0)
        val minStars = SettingsHelper.getIntSetting("training", "sparkTraitMinStars", 0)

        val rerollX = SharedData.displayWidth * 0.25
        val rerollY = SharedData.displayHeight * 0.925
        val decideX = SharedData.displayWidth * 0.75
        val decideY = SharedData.displayHeight * 0.925

        // If the reroll currency is explicitly 0, skip rerolls to avoid wasted taps.
        val tpCount = Regex("""(\d+)\s*(?:uses?|tp|reroll)""", RegexOption.IGNORE_CASE).find(bottomText)?.groupValues?.get(1)?.toIntOrNull()
        if (tpCount != null && tpCount == 0) {
            MessageLog.i(TAG, "[TRAITS] Reroll currency is 0. Deciding on current traits without rerolling.")
            game.gestureUtils.tap(decideX, decideY, "spark_trait_decide")
            game.wait(1.0)
            game.waitForLoading()
            return true
        }

        var rerollCount = 0
        while (rerollCount < maxRerolls) {
            val currentBitmap = game.imageUtils.getSourceBitmap()
            val starText = game.imageUtils.performOCROnRegion(
                currentBitmap,
                (SharedData.displayWidth * 0.70).toInt(),
                (SharedData.displayHeight * 0.03).toInt(),
                (SharedData.displayWidth * 0.25).toInt(),
                (SharedData.displayHeight * 0.70).toInt(),
                useThreshold = false, useGrayscale = true, scale = 1.5,
                ocrEngine = "mlkit", debugName = "trait_stars",
            )
            val starCount = starText.count { it == '★' }
            MessageLog.i(TAG, "[TRAITS] Star count: $starCount (threshold: $minStars, reroll $rerollCount/$maxRerolls)")
            if (starCount >= minStars) break
            game.gestureUtils.tap(rerollX, rerollY, "spark_trait_reroll")
            game.wait(1.5)
            rerollCount++
            MessageLog.i(TAG, "[TRAITS] Rerolled all spark traits (attempt $rerollCount/$maxRerolls).")
        }

        game.gestureUtils.tap(decideX, decideY, "spark_trait_decide")
        game.wait(1.0)
        MessageLog.i(TAG, "[TRAITS] Decided on current spark traits after $rerollCount reroll(s).")
        game.waitForLoading()
        return true
    }

    /**
     * Performs miscellaneous checks to resolve instances where the bot might be stuck.
     *
     * @return True if a misc check handled the current screen, false otherwise.
     */
    open fun performMiscChecks(): Boolean {
        MessageLog.i(TAG, "\n[MISC] Beginning check for misc cases...")

        val sourceBitmap = game.imageUtils.getSourceBitmap()

        // Best-effort, non-blocking capture of the Career Rank screen before the generic "Next" button below dismisses it.
        if (!hasCapturedCareerRank) {
            checkCareerRankScreen(sourceBitmap)
        }

        if (ButtonNext.click(game.imageUtils, sourceBitmap = sourceBitmap)) {
            // Now confirm the completion of a Training Goal popup.
            MessageLog.i(TAG, "[MISC] Popup detected that needs to be dismissed with the \"Next\" button.")
            game.wait(2.0)
            ButtonNext.click(game.imageUtils)
            game.wait(1.0)
            return true
        } else if (ButtonCraneGame.check(game.imageUtils, sourceBitmap = sourceBitmap)) {
            if (enableCraneGameAttempt) {
                handleCraneGame()
                return true
            } else {
                // Stop when the bot has reached the Crane Game Event.
                MessageLog.v(TAG, "\n[END] Bot will stop due to the detection of the Crane Game Event.")
                game.notificationMessage = "Bot will stop due to the detection of the Crane Game Event."
                if (DiscordUtils.enableDiscordNotifications) {
                    AppDiscordNotifications.sendError("Bot will stop due to the detection of the Crane Game Event.")
                }
                throw CampaignBreakpointException(game.notificationMessage)
            }
        } else if (
            LabelOrdinaryCuties.check(game.imageUtils, sourceBitmap = sourceBitmap) &&
            ButtonCraneGameOk.check(game.imageUtils, sourceBitmap = sourceBitmap)
        ) {
            ButtonCraneGameOk.click(game.imageUtils, sourceBitmap = sourceBitmap)
            game.waitForLoading()
            MessageLog.v(TAG, "[CRANE_GAME] Event exited.")
            return true
        } else if (ButtonNextRaceEnd.click(game.imageUtils, sourceBitmap = sourceBitmap)) {
            MessageLog.i(TAG, "[MISC] Ended a leftover race.")
            // Clicking this button triggers connection to server.
            game.waitForLoading()
            return true
        } else if (IconRaceNotEnoughFans.check(game.imageUtils, sourceBitmap = sourceBitmap)) {
            MessageLog.i(TAG, "[MISC] There was a popup about insufficient fans.")
            racing.encounteredRacingPopup = true
            ButtonCancel.click(game.imageUtils, sourceBitmap = sourceBitmap)
            return true
        } else if (ButtonBack.click(game.imageUtils, sourceBitmap = sourceBitmap)) {
            MessageLog.i(TAG, "[MISC] Navigating back a screen since all the other misc checks have been completed.")
            game.wait(1.0)
            return true
        } else if (ButtonSkip.click(game.imageUtils, sourceBitmap = sourceBitmap)) {
            MessageLog.i(TAG, "[MISC] Clicked skip button.")
            return true
        } else if (!BotService.isRunning) {
            MessageLog.v(TAG, "\n[END] BotService is not running. Exiting now...")
            throw InterruptedException()
        } else if (ButtonCancel.check(game.imageUtils, sourceBitmap = sourceBitmap)) {
            consecutiveButtonCancelMatches++
            if (consecutiveButtonCancelMatches >= WARNING_POPUP_CONFIRM_THRESHOLD) {
                MessageLog.v(TAG, "\n[END] Bot may have encountered a warning popup. Exiting now...")
                game.notificationMessage = "Bot may have encountered a warning popup"
                if (DiscordUtils.enableDiscordNotifications) {
                    AppDiscordNotifications.sendError("Bot may have encountered a warning popup. Exiting now...")
                }
                throw CampaignBreakpointException(game.notificationMessage)
            }
            MessageLog.i(TAG, "[MISC] ButtonCancel matched ($consecutiveButtonCancelMatches/$WARNING_POPUP_CONFIRM_THRESHOLD). Will exit if it persists across consecutive iterations.")
            return false
        } else {
            consecutiveButtonCancelMatches = 0
            MessageLog.i(TAG, "[MISC] Did not detect any popups or the Crane Game on the screen. Moving on...")
        }

        return false
    }

    /**
     * Attempts to detect and OCR the end-of-career Career Rank screen (final rank tier and rating number).
     *
     * The generic "Next" button check in [performMiscChecks] dismisses this screen, so this must run beforehand
     * using the same [sourceBitmap] to have any chance of reading it. This is best-effort: it silently does nothing
     * if the screen isn't present, or if OCR doesn't produce a recognizable rank tier.
     */
    private fun checkCareerRankScreen(sourceBitmap: Bitmap) {
        val anchor = LabelCareerRankTitle.findImageWithBitmap(game.imageUtils, sourceBitmap) ?: return

        val rankText =
            game.imageUtils.performOCROnRegion(
                sourceBitmap,
                game.imageUtils.relX(anchor.x, -186),
                game.imageUtils.relY(anchor.y, 167),
                game.imageUtils.relWidth(405),
                game.imageUtils.relHeight(296),
                useThreshold = true,
                useGrayscale = true,
                scale = 2.0,
                ocrEngine = "mlkit",
                debugName = "career_rank_tier",
            )
        val cleanedRank = rankText.trim().uppercase().replace(Regex("[^A-Z+]"), "")

        if (!CAREER_RANK_PATTERN.matches(cleanedRank)) {
            MessageLog.v(TAG, "[MISC] Career Rank title detected but rank OCR did not produce a recognizable tier (raw: \"$rankText\").")
            return
        }

        val ratingText =
            game.imageUtils.performOCROnRegion(
                sourceBitmap,
                game.imageUtils.relX(anchor.x, -287),
                game.imageUtils.relY(anchor.y, 743),
                game.imageUtils.relWidth(557),
                game.imageUtils.relHeight(140),
                useThreshold = false,
                useGrayscale = true,
                scale = 2.0,
                ocrEngine = "tesseract",
                debugName = "career_rank_rating",
            )
        val cleanedRating = ratingText.replace(Regex("[^0-9]"), "")

        trainee.careerRank = cleanedRank
        trainee.careerRating = cleanedRating.toIntOrNull() ?: 0
        hasCapturedCareerRank = true
        MessageLog.i(TAG, "[MISC] Detected Career Rank screen: rank=$cleanedRank, rating=${trainee.careerRating}")
    }

    /**
     * Handles all main screen logic including daily updates, racing decisions, and training.
     *
     * This is the primary decision-making function that determines what action the bot
     * should take when at the main screen. It handles date changes, aptitude/fan updates,
     * race detection, mood recovery, and training.
     *
     * @return True if the main screen was detected and handled, false otherwise.
     */
    open fun handleMainScreen(): Boolean {
        if (!checkMainScreen()) {
            return false
        }

        // Scenario-specific pre-update hook.
        onBeforeMainScreenUpdate()

        // Perform first-time setup of loading the user's race agenda if needed.
        racing.loadUserRaceAgenda()

        val sourceBitmap = game.imageUtils.getSourceBitmap()

        // Operations to be done every time the date changes.
        // Skip if we've already checked the date this turn and no game-advancing action was taken.
        if (!bHasCheckedDateThisTurn) {
            val dateChanged = updateDate()
            // Once-per-run: log the Smart Race Solver Preview schedule and seed mid-run history
            // recovery now that the date is known, so it appears in logs before shop/items.
            SmartRaceSolverIntegration.runStartupHooks(game = game, currentTurn = date.day, scenario = game.scenario)
            if (dateChanged || !trainee.bHasUpdatedStats) {
                // Reset common daily flags.
                racing.encounteredRacingPopup = false
                racing.raceRepeatWarningCheck = false
                bHasTriedCheckingFansToday = false
                bHasCheckedForMaidenRaceToday = false

                // Reset scenario-specific daily flags.
                resetDailyFlags()

                // Perform parallel turn-start updates (stats, mood, energy, fans, etc.).
                performTurnStartUpdates(sourceBitmap)

                // Scenario-specific post-update hook.
                onAfterTurnStartUpdates()

                ParentDiscordNotifier.maybeSendLiveStatus(game, trainee, date, dateChanged = true)
                ParentFarmingLiveStatus.maybeLog(game, trainee, date, dateChanged = true)
                ParentFarmingScenarioHooks.onTurnStart(this, date)
            }

            // Since we're at the main screen, we don't need to worry about this
            // flag anymore since we will update our aptitudes here if needed.
            trainee.bTemporaryRunningStyleAptitudesUpdated = false

            if (!trainee.bHasUpdatedAptitudes) {
                openAptitudesDialog()
                if (tryHandleAllDialogs()) return true
            }

            val bIsScheduledRaceDayInitial = LabelScheduledRace.check(game.imageUtils, sourceBitmap = sourceBitmap)
            val bIsMandatoryRaceDayInitial = IconRaceDayRibbon.check(game.imageUtils, sourceBitmap = sourceBitmap)

            if (!date.bIsFinaleSeason && !bIsMandatoryRaceDayInitial && !bIsScheduledRaceDayInitial && bNeedToCheckFans && !bHasTriedCheckingFansToday) {
                openFansDialog()
                if (tryHandleAllDialogs()) return true
            }

            // Mark that we've checked the date this turn.
            bHasCheckedDateThisTurn = true
        }

        // Perform global checks (skill point check, stop at date, finals stop).
        // These can throw CampaignBreakpointException or InterruptedException to stop the bot.
        if (performGlobalChecks()) {
            return true
        }

        // Compute the estimated overall rank, then print the trainee info after all turn-start updates and potential fan count updates.
        updateEstimatedRank()
        checkAutoAbandon()
        trainee.logInfo()

        // Scenario-specific main screen entry hook (e.g. for item usage).
        onMainScreenEntry()

        // Open the per-turn structured decision log. Snapshots state after onMainScreenEntry so item-consumption effects are visible.
        decisionTracer.startTurn(
            date = date,
            trainee = trainee,
            inventorySnapshot = gatherDecisionInventory(),
            settings = gatherDecisionSettings(),
            extraState = gatherDecisionExtraState(),
        )

        // Decision-making process.
        val action = decideNextAction()
        val bIsScheduledRaceDay = LabelScheduledRace.check(game.imageUtils)
        return executeAction(action, bIsScheduledRaceDay)
    }

    /**
     * Performs parallel turn-start updates for stats, skill points, mood, energy, and racing requirements.
     *
     * @param sourceBitmap Current screen bitmap.
     */
    open fun performTurnStartUpdates(sourceBitmap: Bitmap) {
        // Update the fan count class every time we're at the main screen.
        val fanCountClass: FanCountClass? = getFanCountClass(sourceBitmap)
        if (fanCountClass != null) {
            trainee.fanCountClass = fanCountClass
        }

        val skillPointsLocation = LabelStatTableHeaderSkillPoints.findImageWithBitmap(game.imageUtils, sourceBitmap = sourceBitmap)

        if (!BotService.isRunning) {
            return
        }

        // Use CountDownLatch to run the operations in parallel.
        // 1 racingRequirements (skipped during summer) + 5 stats + 1 skill points + 1 mood + 1 energy = 9 (or 8) threads.
        val latch = if (date.isSummer() && !(racing.skipSummerTrainingForAgenda && racing.enableUserInGameRaceAgenda)) CountDownLatch(8) else CountDownLatch(9)

        MessageLog.disableOutput = true

        // Threads 1-5: Update stats.
        trainee.updateStats(game.imageUtils, sourceBitmap, skillPointsLocation, latch)

        // Thread 6: Update skill points.
        Thread {
            try {
                trainee.updateSkillPoints(game.imageUtils, sourceBitmap, skillPointsLocation)
            } catch (e: Exception) {
                MessageLog.e(TAG, "[ERROR] performTurnStartUpdates:: Error in updateSkillPoints thread: ${e.stackTraceToString()}")
            } finally {
                latch.countDown()
            }
        }.apply { isDaemon = true }.start()

        // Thread 7: Update mood.
        Thread {
            try {
                trainee.updateMood(game.imageUtils, sourceBitmap)
            } catch (e: Exception) {
                MessageLog.e(TAG, "[ERROR] performTurnStartUpdates:: Error in updateMood thread: ${e.stackTraceToString()}")
            } finally {
                latch.countDown()
            }
        }.apply { isDaemon = true }.start()

        // Thread 8: Update racing requirements.
        if (!date.isSummer() || (racing.skipSummerTrainingForAgenda && racing.enableUserInGameRaceAgenda)) {
            Thread {
                try {
                    racing.checkRacingRequirements(sourceBitmap)
                } catch (e: Exception) {
                    MessageLog.e(TAG, "[ERROR] performTurnStartUpdates:: Error in checkRacingRequirements thread: ${e.stackTraceToString()}")
                } finally {
                    latch.countDown()
                }
            }.apply { isDaemon = true }.start()
        }

        // Thread 9: Update energy.
        Thread {
            try {
                trainee.updateEnergy(game.imageUtils)
            } catch (e: Exception) {
                MessageLog.e(TAG, "[ERROR] performTurnStartUpdates:: Error in updateEnergy thread: ${e.stackTraceToString()}")
            } finally {
                latch.countDown()
            }
        }.apply { isDaemon = true }.start()

        // Wait for all threads to complete.
        try {
            latch.await(10, TimeUnit.SECONDS)
        } catch (_: InterruptedException) {
            MessageLog.e(TAG, "[ERROR] performTurnStartUpdates:: Date change operations threads timed out.")
        } finally {
            MessageLog.disableOutput = false
        }

        SmartRaceSolverIntegration.updateTraineeVitality(trainee.energy, trainee.mood)
    }

    /**
     * Performs global bot checks such as skill point thresholds and target date stops.
     *
     * @return True if a check was handled, false otherwise.
     */
    open fun performGlobalChecks(): Boolean {
        // Now check if we need to handle skills before finals.
        if (!bHasHandledPreFinalsCheck && date.day == 72 && skillPlan.skillPlans["preFinals"]?.bIsEnabled ?: false) {
            ButtonSkills.click(game.imageUtils)
            game.wait(1.0)
            if (!handleSkillListScreen()) {
                MessageLog.w(TAG, "[WARN] performGlobalChecks:: handleSkillList() for Pre-Finals failed.")
                return false
            }
            bHasHandledPreFinalsCheck = true
            return true
        }

        // If we haven't already handled the skill point check this run and
        // if the required skill points has been reached,
        // stop the bot or run the skill plan if it is enabled.
        if (trainee.skillPoints < skillPointsRequired) {
            // Reset the flag if the skill points drop below the threshold.
            bHasHandledSkillPointCheck = false
        }

        if (!bHasHandledSkillPointCheck && enableSkillPointCheck && trainee.skillPoints >= skillPointsRequired) {
            if (skillPlan.skillPlans["skillPointCheck"]?.bIsEnabled ?: false) {
                // Ensure we are actually at the Main screen before attempting to navigate.
                // If not, we skip the skill purchase for now and retry on the next turn.
                if (checkMainScreen()) {
                    MessageLog.i(TAG, "[SKILLS] Beginning process to purchase skills...")
                    ButtonSkills.click(game.imageUtils)
                    game.wait(1.0)
                    if (!handleSkillListScreen("skillPointCheck")) {
                        MessageLog.e(TAG, "[ERROR] performGlobalChecks:: Failed to handle Skill Point Check. Aborting...")
                        return true
                    }
                    bHasHandledSkillPointCheck = true
                    return true
                } else {
                    MessageLog.i(TAG, "[SKILLS] Skipping skill purchase check for now since we are not confirmed to be sitting on the Main screen.")
                }
            } else {
                throw CampaignBreakpointException("Bot reached skill point check threshold. Stopping bot...")
            }
        }

        // Check if bot should stop before the finals.
        if (checkFinalsStop()) {
            throw InterruptedException(game.notificationMessage)
        }

        // Check if bot should stop at the user specified date.
        if (checkStopAtDate()) {
            throw InterruptedException(game.notificationMessage)
        }

        return false
    }

    /**
     * Decides the next action to take based on the current trainee and game state.
     *
     * @return The decided [MainScreenAction].
     */
    open fun decideNextAction(): MainScreenAction {
        val sourceBitmap = game.imageUtils.getSourceBitmap()
        val bIsScheduledRaceDay = LabelScheduledRace.check(game.imageUtils, sourceBitmap = sourceBitmap)
        val bIsMandatoryRaceDay = IconRaceDayRibbon.check(game.imageUtils, sourceBitmap = sourceBitmap)

        // Mandatory career-goal races cannot be skipped, so they outrank everything - including a pinned recreation.
        if (bIsMandatoryRaceDay) {
            decisionTracer.recordActionChoice(MainScreenAction.RACE, "Mandatory race day")
            return MainScreenAction.RACE
        }

        if (racing.encounteredRacingPopup) {
            decisionTracer.recordActionChoice(MainScreenAction.RACE, "Racing popup already on screen from prior turn")
            return MainScreenAction.RACE
        }

        // A pinned recreation outing takes priority over every remaining action, including scheduled (in-game racing agenda) races. Only mandatory races, handled above, outrank it.
        if (shouldDoRecreationToday(sourceBitmap)) {
            decisionTracer.recordActionChoice(MainScreenAction.DATE, "Dating schedule: pinned recreation turn ${date.day}")
            return MainScreenAction.DATE
        }

        if (bIsScheduledRaceDay) {
            decisionTracer.recordActionChoice(MainScreenAction.RACE, "Scheduled race day")
            return MainScreenAction.RACE
        }

        if (racing.enableForceRacing) {
            MessageLog.i(TAG, "[INFO] Force racing enabled - skipping all other activities and going straight to racing.")
            decisionTracer.recordActionChoice(MainScreenAction.RACE, "Force racing setting enabled")
            return MainScreenAction.RACE
        }

        if (!bHasCheckedForMaidenRaceToday && !date.bIsPreDebut && !trainee.bHasCompletedMaidenRace) {
            MessageLog.i(TAG, "[INFO] Bot has not yet completed maiden race. Checking for valid maiden race...")
            decisionTracer.recordActionChoice(MainScreenAction.RACE, "Maiden race not yet completed")
            return MainScreenAction.RACE
        }

        // A mandatory career goal (fan / trophy / goal-pts) must race to be met, so it outranks the pre-summer prep optimization below - unless it is a G1-only trophy on a turn
        // the races DB holds no G1 for, where navigating would just cancel, so fall through to the normal decision and train instead.
        if (racing.requirementForcesRacingThisTurn()) {
            MessageLog.i(TAG, "[INFO] Racing requirement is active and the races DB has a qualifying race this turn. Bypassing health and mood checks.")
            decisionTracer.recordActionChoice(MainScreenAction.RACE, "Racing requirement (fans, trophy, or goal pts) active")
            return MainScreenAction.RACE
        } else if (racing.hasTrophyRequirement) {
            MessageLog.i(TAG, "[INFO] Trophy requirement is active but the races database holds no G1 for this turn ($date). Skipping the race-screen round-trip; continuing with the normal decision.")
        }

        if (mustRestBeforeSummer && (date.year == DateYear.CLASSIC || date.year == DateYear.SENIOR) && date.month == DateMonth.JUNE && date.phase == DatePhase.LATE) {
            when (resolvePreSummerAction(trainee.energy, trainee.mood, training.firstTrainingCheck)) {
                MainScreenAction.REST -> {
                    MessageLog.i(TAG, "[INFO] Energy is low (${trainee.energy}% < 70%). Forcing rest during $date in preparation for Summer Training.")
                    decisionTracer.recordActionChoice(MainScreenAction.REST, "Pre-summer prep (energy ${trainee.energy}% < 70%)")
                    return MainScreenAction.REST
                }
                MainScreenAction.RECOVER_MOOD -> {
                    MessageLog.i(TAG, "[INFO] Energy is sufficient (>= 70%) but Mood is not Great (${trainee.mood}). Forcing mood recovery during $date in preparation for Summer Training.")
                    forcedTargetMood = Mood.GREAT
                    decisionTracer.recordActionChoice(MainScreenAction.RECOVER_MOOD, "Pre-summer prep (energy >= 70%, mood ${trainee.mood} < GREAT)")
                    return MainScreenAction.RECOVER_MOOD
                }
                else -> {
                    MessageLog.i(TAG, "[INFO] Energy is sufficient (>= 70%) and mood is Great. Performing Wit training during $date in preparation for Summer Training.")
                    bForcedWitTraining = true
                    decisionTracer.recordActionChoice(MainScreenAction.TRAIN, "Pre-summer prep (energy and mood sufficient; forced Wit training)")
                    return MainScreenAction.TRAIN
                }
            }
        }

        val isFinals = checkFinals()
        val hasInjury =
            if (isFinals) {
                MessageLog.i(TAG, "[INFO] Skipping injury check due to it being the Finals.")
                false
            } else {
                checkInjury(sourceBitmap)
            }

        if (hasInjury) {
            // Injury handled internally in checkInjury, but returning NONE as turn is likely over or needs re-evaluation.
            decisionTracer.recordActionChoice(MainScreenAction.NONE, "Injury detected and handled internally; turn aborted for re-evaluation")
            return MainScreenAction.NONE
        }

        if (shouldRecoverMood(sourceBitmap)) {
            decisionTracer.recordActionChoice(MainScreenAction.RECOVER_MOOD, "shouldRecoverMood returned true (mood ${trainee.mood})")
            return MainScreenAction.RECOVER_MOOD
        }

        SmartRaceSolverMainScreenGate.maybeSolverMainScreenAction(this, game.scenario, date.day)?.let { solverAction ->
            // In Unity Cup the solver's schedule cannot see spirit gauges, so before committing to a solver-planned OPTIONAL race OR a planned rest, peek the training screen and let an
            // Extreme Spirit Burst (guaranteed 0% failure) or a rainbow count >= g1DayMinRainbowCount override it. Mandatory/scheduled races were already handled above, so any race the
            // solver gate returns here is optional, and a planned rest resting through a ready burst is pure waste. The solver re-solves every turn, so a skipped race/rest is
            // rescheduled if it is still needed.
            if ((solverAction == MainScreenAction.RACE || solverAction == MainScreenAction.REST) && game.scenario == "Unity Cup" && !isFinals) {
                unityCupTrainingBeatsPlannedAction(solverAction)?.let { return it }
            }
            return solverAction
        }

        if (shouldRunG1DayPreScreen(racing.enableG1DayPreference, date.year, date.isSummer(), isFinals, trainee.energy, racing.minimumEnergyForOptionalRacing, hasG1Race = { racing.hasG1RacesAtTurn(date.day) })) {
            g1DayPreScreenResult()?.let { return it }
        }

        if (racing.checkEligibilityToStartExtraRacingProcess()) {
            MessageLog.i(TAG, "[INFO] Bot has no injuries, mood is sufficient and extra races can be run today. Setting the action to RACE.")
            decisionTracer.recordActionChoice(MainScreenAction.RACE, "Extra-race eligible (no injury, sufficient mood, eligible day)")
            return MainScreenAction.RACE
        }

        if (enableEnergyBanking && !isFinals && trainee.energy < energyBankingThreshold) {
            val turnsRemaining = game.imageUtils.determineTurnsRemainingBeforeNextGoal()
            if (turnsRemaining in 1..energyBankingLookaheadTurns) {
                MessageLog.i(
                    TAG,
                    "[INFO] Energy banking: $turnsRemaining turn(s) remain before the next mandatory race and energy is ${trainee.energy}% (< $energyBankingThreshold%). Resting instead of training.",
                )
                decisionTracer.recordActionChoice(
                    MainScreenAction.REST,
                    "Energy banking ($turnsRemaining turns remaining <= lookahead $energyBankingLookaheadTurns; energy ${trainee.energy}% < threshold $energyBankingThreshold%)",
                )
                return MainScreenAction.REST
            }
        }

        // Hard energy floor for training, mirroring the optional-racing floor: below it a training turn becomes a
        // rest turn. Skipped during Finals where the career ends before banked energy could pay off. With Wit-over-rest
        // enabled, the floor first tries a viability-gated Wit training (Wit consumes no energy) and only rests when
        // Wit doesn't pass the failure-chance filters.
        if (!isFinals && shouldRestForEnergyFloor(trainee.energy, minimumEnergyToTrain)) {
            if (enableWitOverRest) {
                MessageLog.i(TAG, "[INFO] Energy (${trainee.energy}%) is below the minimum floor to train ($minimumEnergyToTrain%). Trying Wit training before resting (Wit Over Rest).")
                decisionTracer.recordActionChoice(MainScreenAction.TRAIN, "Energy ${trainee.energy}% < minimum training floor $minimumEnergyToTrain%; Wit-over-rest attempting Wit training")
                bWitOverRestTraining = true
                return MainScreenAction.TRAIN
            }
            MessageLog.i(TAG, "[INFO] Energy (${trainee.energy}%) is below the minimum floor to train ($minimumEnergyToTrain%). Resting instead.")
            decisionTracer.recordActionChoice(MainScreenAction.REST, "Energy ${trainee.energy}% < minimum training floor $minimumEnergyToTrain%")
            return MainScreenAction.REST
        }

        decisionTracer.recordActionChoice(MainScreenAction.TRAIN, "Default fallback after racing/mood/injury checks did not trigger")
        return MainScreenAction.TRAIN
    }

    /**
     * Runs the G1-day preference pre-screen. Enters the training screen, analyzes the trainings, and compares the best rainbow count against the threshold to decide whether to stay and
     * train or back out and race the G1. The analysis is cached, so the follow-up `handleTraining()` reuses it for free when this returns TRAIN. When it returns RACE the cache is cleared
     * so a stale analysis cannot leak into a later turn. Returns null when the training screen could not be entered, letting the caller fall through to the normal extra-race logic.
     *
     * @return TRAIN to stay and train the rainbow, RACE to take the G1 instead, or null when the pre-screen could not run.
     */
    private fun g1DayPreScreenResult(): MainScreenAction? {
        if (!ButtonTraining.click(game.imageUtils)) return null
        game.wait(0.5)

        training.analyzeTrainings()
        val bestNumRainbow = training.cachedAnalysisResults?.maxOfOrNull { it.numRainbow } ?: 0
        val threshold = racing.g1DayMinRainbowCount

        // Back out to the main screen either way. On TRAIN, handleTraining re-enters and reuses the cached analysis; on RACE, the racing flow expects to start from the main screen.
        ButtonBack.click(game.imageUtils)
        game.wait(1.0)

        return if (g1DayPrefersTraining(bestNumRainbow, threshold)) {
            MessageLog.i(TAG, "[INFO] G1-day preference: best training has $bestNumRainbow rainbow(s) >= $threshold. Training instead of racing the G1.")
            decisionTracer.recordActionChoice(MainScreenAction.TRAIN, "G1-day preference: best training has $bestNumRainbow rainbow(s) >= $threshold threshold")
            MainScreenAction.TRAIN
        } else {
            MessageLog.i(TAG, "[INFO] G1-day preference: best training has only $bestNumRainbow rainbow(s) < $threshold. Racing the G1 instead.")
            decisionTracer.recordActionChoice(MainScreenAction.RACE, "G1-day preference: best training has only $bestNumRainbow rainbow(s) < $threshold threshold; racing the G1")
            training.clearAnalysisCache()
            MainScreenAction.RACE
        }
    }

    /**
     * Unity Cup only: a Smart Race Solver-planned OPTIONAL race or a planned REST should yield to high-value board state the solver's schedule cannot see - an Extreme Spirit Burst
     * (guaranteed 0% failure, the scenario's highest-value action) or a rainbow count of at least [Racing.g1DayMinRainbowCount]. Peeks the training screen, analyzes it, and backs out.
     * On TRAIN the cached analysis is reused for free by the follow-up handleTraining(); otherwise the cache is cleared so a stale analysis cannot leak into a later turn. The solver
     * re-solves every turn, so a race/rest skipped here is rescheduled next turn if it is still needed. Resting through a ready Extreme Burst was pure waste - even at full energy the
     * solver would rest on a scheduled Rest turn without ever seeing the burst.
     *
     * @param plannedAction The action the solver planned ([MainScreenAction.RACE] or [MainScreenAction.REST]), used only for the log/trace wording.
     * @return TRAIN to stay and train the burst/rainbow, or null to keep the solver's planned action (including when the training screen could not be entered).
     */
    private fun unityCupTrainingBeatsPlannedAction(plannedAction: MainScreenAction): MainScreenAction? {
        if (!ButtonTraining.click(game.imageUtils)) return null
        game.wait(0.5)

        training.analyzeTrainings()
        val results = training.cachedAnalysisResults
        val bestNumRainbow = results?.maxOfOrNull { it.numRainbow } ?: 0
        val bestExtremeReady = results?.maxOfOrNull { it.extras["spiritGaugesExtremeReady"] as? Int ?: 0 } ?: 0
        val threshold = racing.g1DayMinRainbowCount

        // Back out to the main screen either way. On TRAIN, handleTraining re-enters and reuses the cached analysis; otherwise the racing/rest flow expects to start from the main screen.
        ButtonBack.click(game.imageUtils)
        game.wait(1.0)

        return if (bestExtremeReady > 0 || g1DayPrefersTraining(bestNumRainbow, threshold)) {
            val planned = if (plannedAction == MainScreenAction.REST) "rest" else "optional race"
            val reason = if (bestExtremeReady > 0) "Extreme Spirit Burst ready ($bestExtremeReady)" else "best training has $bestNumRainbow rainbow(s) >= $threshold"
            MessageLog.i(TAG, "[INFO] Unity Cup: overriding the solver's planned $planned - $reason. Training instead.")
            decisionTracer.recordActionChoice(MainScreenAction.TRAIN, "Unity Cup training override before solver $planned: $reason")
            MainScreenAction.TRAIN
        } else {
            training.clearAnalysisCache()
            null
        }
    }

    /**
     * Executes the specified action.
     *
     * @param action The action to execute.
     * @param bIsScheduledRaceDay Whether it is a scheduled race day.
     * @return True if the action was executed successfully, false otherwise.
     */
    open fun executeAction(action: MainScreenAction, bIsScheduledRaceDay: Boolean): Boolean {
        // Force Wit Training if requested by the pre-summer logic.
        if (action == MainScreenAction.TRAIN && bForcedWitTraining) {
            MessageLog.i(TAG, "[INFO] Executing forced Wit training as requested by pre-summer logic.")
            training.handleTraining(StatName.WIT)
            bForcedWitTraining = false
            bHasCheckedDateThisTurn = false
            decisionTracer.emit()
            return true
        }

        // Wit-over-rest: the energy floor chose to try Wit training in place of a rest. Viability-gated, so
        // handleTraining backs out and recovers energy itself when Wit doesn't pass the failure-chance filters.
        if (action == MainScreenAction.TRAIN && bWitOverRestTraining) {
            MessageLog.i(TAG, "[INFO] Executing Wit training in place of a low-energy rest (Wit Over Rest).")
            training.handleTraining(StatName.WIT, requireViable = true)
            bWitOverRestTraining = false
            bHasCheckedDateThisTurn = false
            decisionTracer.emit()
            return true
        }

        val sourceBitmap = game.imageUtils.getSourceBitmap()

        when (action) {
            MainScreenAction.RACE -> {
                MessageLog.i(TAG, "[INFO] All checks are cleared for racing.")
                if (!handleRaceEvents(bIsScheduledRaceDay) && handleRaceEventFallback()) {
                    throw CampaignBreakpointException("Mandatory race detected. Stopping bot...")
                }
                bHasCheckedDateThisTurn = false
            }

            MainScreenAction.TRAIN -> {
                MessageLog.i(TAG, "[INFO] Decision made to train.")
                training.handleTraining()
                bHasCheckedDateThisTurn = false
            }

            MainScreenAction.REST -> {
                recoverEnergy(sourceBitmap)
                bHasCheckedDateThisTurn = false
            }

            MainScreenAction.RECOVER_MOOD -> {
                val target = forcedTargetMood ?: Mood.GOOD
                if (performMoodRecovery(sourceBitmap, targetMood = target)) {
                    bHasCheckedDateThisTurn = false
                    forcedTargetMood = null
                }
            }

            MainScreenAction.DATE -> {
                MessageLog.i(TAG, "[INFO] Decision made to perform a scheduled recreation outing.")
                // A false result backs out without completing an outing (e.g. no configured card claimed a row) and does not advance the turn, so guard
                // against re-deciding DATE again immediately - otherwise the bot loops opening and backing out of the same dialog forever.
                recreationAttemptFailedThisTurn = !handleRecreationDate(recoverMoodIfCompleted = false, doDateRecreation = true)
                bHasCheckedDateThisTurn = false
            }

            MainScreenAction.NONE -> {
                return false
            }
        }
        decisionTracer.emit()
        return true
    }

    // //////////////////////////////////////////////////////////////////////////////////////////////////
    // //////////////////////////////////////////////////////////////////////////////////////////////////

    /** Resets per-run campaign and trainee state before another parent-farming career in the same session. */
    fun resetForNextParentRun() {
        with(trainee) {
            name = ""
            skillPoints = 120
            fans = 1
            mood = Mood.NORMAL
            energy = 100
            megaphoneTurnCounter = 0
            fanCountClass = FanCountClass.DEBUT
            statTrackLocation = null
            stats.speed = -1
            stats.stamina = -1
            stats.power = -1
            stats.guts = -1
            stats.wit = -1
            bHasUpdatedAptitudes = false
            bHasUpdatedStats = false
            bHasUpdatedSkillPoints = false
            bTemporaryRunningStyleAptitudesUpdated = false
            bHasSetRunningStyle = false
            trackSurfaceAptitudes.keys.forEach { trackSurfaceAptitudes[it] = Aptitude.G }
            trackDistanceAptitudes.keys.forEach { trackDistanceAptitudes[it] = Aptitude.G }
            runningStyleAptitudes.keys.forEach { runningStyleAptitudes[it] = Aptitude.G }
            currentPositiveStatuses.clear()
            currentNegativeStatuses.clear()
        }

        bForcedWitTraining = false
        forcedTargetMood = null
        recreationDateCompleted = false
        stopAtDateInitialTurnNumber = -1
        stopBeforeFinalsInitialTurnNumber = -1
        bNeedToCheckFans = true
        bHasTriedCheckingFansToday = false
        bHasHandledSkillPointCheck = false
        bHasHandledPreFinalsCheck = false
        bHasCheckedForMaidenRaceToday = false
        bHasCheckedDateThisTurn = false
        consecutiveButtonCancelMatches = 0

        racing.encounteredRacingPopup = false
        racing.hasFanRequirement = false
        racing.hasTrophyRequirement = false
        racing.hasPreOpOrAboveRequirement = false
        racing.hasG3OrAboveRequirement = false
        racing.hasInsufficientGoalRacePtsRequirement = false
        racing.detectedMandatoryRaceCheck = false
        racing.bRetriedCurrentRace = false
    }

    /**
     * Executes the main processing loop for the campaign task.
     *
     * @return The result of the task execution, or null if the loop should continue.
     */
    override fun process(): TaskResult? {
        try {
            // We always check for dialogs first.
            if (tryHandleAllDialogs()) {
                return null
            }

            // Check for the Spark Traits reroll screen (applies to all scenarios).
            if (handleSparkTraitReroll()) {
                return null
            }

            ParentFarmingGenerationFarm.tryGate(game, this)

            if (CareerSelectionAutomation.tryTriggerAutoBorrow(game)) {
                return null
            }

            if (LegacyParentSelector.tryTriggerAutoSelect(game)) {
                return null
            }

            if (CareerSelectionAutomation.tryAdvancePastLegacyPicker(game)) {
                return null
            }

            if (CareerSelectionAutomation.tryTriggerAutoEquipOwnedDeck(game)) {
                return null
            }

            if (CareerSelectionAutomation.tryTriggerAutoEquipSupportCards(game)) {
                return null
            }

            if (CareerSelectionAutomation.shouldAutoStartCareer() && CareerSelectionAutomation.tryStartCareer(game)) {
                return null
            }

            if (handleMainScreen()) {
                return null
            }

            if (checkTrainingEventScreen()) {
                // If the bot is at the Training Event screen, that means there are selectable options for rewards.
                handleTrainingEvent()
            } else if (checkMandatoryRacePrepScreen()) {
                refreshDateForMandatoryRace()
                // If the bot is at the Main screen with the button to select a race visible, that means the bot needs to handle a mandatory race.
                if (!handleRaceEvents() && racing.detectedMandatoryRaceCheck) {
                    return TaskResult.Success(
                        TaskResultCode.TASK_RESULT_BREAKPOINT_REACHED,
                        "Mandatory race detected. Stopping bot...",
                    )
                }
            } else if (checkRacingScreen()) {
                // If the bot is already at the Racing screen, then complete this standalone race.
                racing.handleStandaloneRace()
            } else if (checkEndScreen()) {
                // Stop when the bot has reached the screen where it details the overall result of the run.
                // Also open this screen when the (unrelated) harvest report feature is enabled: it needs
                // to be here to see ButtonSkillListFullStats, otherwise scanAtCareerEnd() below silently
                // finds nothing and the Career Runs archive falls back to raw spark-pick OCR text.
                if ((skillPlan.skillPlans["careerComplete"]?.bIsEnabled ?: false) || ParentHarvestScanner.isEnabled()) {
                    game.wait(0.5)
                    ButtonCareerEndSkills.click(game.imageUtils)
                    game.wait(1.0)
                    if (!handleSkillListScreen()) {
                        MessageLog.w(TAG, "[WARN] process:: handleSkillList() failed.")
                    }
                }

                // Perform a final update of the fan count.
                game.wait(1.0)
                val buttonLocation = ButtonDetails.find(game.imageUtils).first
                if (buttonLocation != null) {
                    val fansText =
                        game.imageUtils.performOCROnRegion(
                            game.imageUtils.getSourceBitmap(),
                            game.imageUtils.relX(buttonLocation.x, 280),
                            game.imageUtils.relY(buttonLocation.y, -735),
                            game.imageUtils.relWidth(220),
                            game.imageUtils.relHeight(50),
                            useThreshold = false,
                            useGrayscale = true,
                            scale = 2.0,
                            ocrEngine = "tesseract",
                            debugName = "final_fan_count",
                        )

                    val cleanedFans = fansText.replace(Regex("[^0-9]"), "")
                    if (cleanedFans.isNotEmpty()) {
                        trainee.fans = cleanedFans.toInt()
                        SmartRaceSolverIntegration.updateCurrentFans(trainee.fans)
                        checkFanMilestones(trainee.fans)
                    } else {
                        MessageLog.w(TAG, "[WARN] process:: Could not detect final fan count for the end of the Career from OCR: $fansText")
                    }

                    // Now click the button to open the details dialog for aptitude and stat updates.
                    game.gestureUtils.tap(buttonLocation.x, buttonLocation.y, ButtonDetails.template.path)
                    game.wait(1.0)
                    ButtonDetails.click(game.imageUtils)
                    game.wait(1.0)
                } else {
                    MessageLog.w(TAG, "[WARN] process:: Could not find ButtonDetails to perform final updates for the end of the Career.")
                }

                handleDialogs()

                val harvestResult = ParentHarvestScanner.scanAtCareerEnd(game)

                // Print the final Trainee information.
                trainee.logInfo()

                if (game.enableDelayCalibrationTelemetry) {
                    DelayCalibration.buildTelemetrySummary(game.waitDelay)?.let { summary ->
                        MessageLog.i(TAG, "[DELAY CALIBRATION] $summary")
                    }
                }

                val elapsedMs = System.currentTimeMillis() - game.runStartTimeMillis
                val summaryInput =
                    if (SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMode", false)) {
                        ParentRunSummary.inputFromSettings(trainee, game.scenario, elapsedMs, harvestResult = harvestResult)
                    } else {
                        null
                    }

                if (
                    summaryInput != null &&
                    SettingsHelper.getBooleanSetting("racing", "enableParentRunSummary", true)
                ) {
                    val summary = ParentRunSummary.build(summaryInput)
                    ParentRunSummary.logSummary(summary)
                    val archiveEnabled = SettingsHelper.getBooleanSetting("racing", "enableParentRunArchive", true)
                    val comparison = if (archiveEnabled) ParentRunArchive.loadComparison(game.myContext) else null
                    game.taskEndDiscordEmbed = ParentRunSummary.buildDiscordEmbed(summaryInput, comparison)
                    game.taskEndDiscordMessage = ParentRunSummary.buildDiscordMarkdown(summaryInput)
                    if (archiveEnabled) {
                        ParentRunArchive.append(game.myContext, summaryInput)
                        LogStreamServer.broadcastParentFarmingUpdate()
                    }
                } else if (summaryInput != null && SettingsHelper.getBooleanSetting("racing", "enableParentRunArchive", true)) {
                    ParentRunArchive.append(game.myContext, summaryInput)
                    LogStreamServer.broadcastParentFarmingUpdate()
                } else if (summaryInput == null) {
                    val raceStats = SmartRaceSolverIntegration.snapshotRaceStats()
                    val raceRecords = SmartRaceSolverIntegration.snapshotRaceRecords()
                    game.taskEndDiscordEmbed =
                        ParentRunSummary.buildSimpleDiscordEmbed(trainee, game.scenario, elapsedMs, raceStats, harvestResult)
                    CareerRunArchive.append(game.myContext, trainee, game.scenario, elapsedMs, raceStats, raceRecords)
                    LogStreamServer.broadcastCareerRunUpdate()
                }

                if (ParentFarmingRunLoop.tryContinueAfterCareerEnd(this, game, summaryInput)) {
                    return null
                }

                return TaskResult.Success(
                    TaskResultCode.TASK_RESULT_COMPLETE,
                    "Bot has reached end of run. Stopping bot...",
                )
            } else if (checkCampaignSpecificConditions()) {
                MessageLog.i(TAG, "[INFO] Campaign-specific checks complete.")
            } else if (handleInheritanceEvent()) {
                // If the bot is at the Inheritance screen, then accept the inheritance.
            } else if (performMiscChecks()) {
                MessageLog.i(TAG, "[INFO] Misc checks complete.")
            } else {
                MessageLog.i(TAG, "[INFO] Did not detect the bot being at the following screens: Main, Training Event, Inheritance, Mandatory Race Preparation, Racing and Career End.")
                // Tap to progress any intermediate screens.
                game.tap(350.0, 450.0, taps = 1)
            }
        } catch (e: CampaignBreakpointException) {
            // In a parent-farming multi-run session, an auto-abandoned run should give up the current
            // career in-game and roll straight into the next run instead of ending the whole session.
            // tryAbandonAndContinue is a no-op (returns false) unless multi-run is enabled and the
            // give-up + navigation actually completes, so every other breakpoint (skill-point check,
            // mandatory-race, notification stops) and single-run sessions fall through to the stop below.
            if (e.abandonedRun && ParentFarmingRunLoop.tryAbandonAndContinue(this, game)) {
                return null
            }
            return TaskResult.Success(
                TaskResultCode.TASK_RESULT_BREAKPOINT_REACHED,
                e.message ?: "Campaign breakpoint reached. Stopping bot...",
            )
        }

        return null
    }
}
