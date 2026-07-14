package com.steve1316.uma_android_automation.bot.solver

import com.steve1316.uma_android_automation.types.Aptitude
import com.steve1316.uma_android_automation.types.StatName
import com.steve1316.uma_android_automation.types.TrackDistance
import com.steve1316.uma_android_automation.types.TrackSurface
import kotlin.math.exp

/**
 * A trainee's five career stats, as read off the Umamusume details screen.
 *
 * @property speed Speed stat.
 * @property stamina Stamina stat.
 * @property power Power stat.
 * @property guts Guts stat.
 * @property wit Wit stat.
 */
data class TraineeStats(
    val speed: Int,
    val stamina: Int,
    val power: Int,
    val guts: Int,
    val wit: Int,
) {
    /** Reads the stat by [StatName] so the pure scoring can iterate the enum. */
    fun of(stat: StatName): Int =
        when (stat) {
            StatName.SPEED -> speed
            StatName.STAMINA -> stamina
            StatName.POWER -> power
            StatName.GUTS -> guts
            StatName.WIT -> wit
        }
}

/** How ready a trainee looks for a Champions Meeting, bucketed from the estimated win probability. */
enum class CmReadiness {
    /** Comfortably ahead of the reference field. */
    READY,

    /** Roughly even with the field - winnable, not a lock. */
    COMPETITIVE,

    /** Behind the field; expect to lose more than win. */
    UNDERPOWERED,
}

/**
 * The estimated standing of a trainee against a Champions Meeting's reference field.
 *
 * @property winProbability Heuristic P(beat the reference field), in [0.02, 0.98].
 * @property effectivePower The trainee's distance-weighted, aptitude-adjusted race power.
 * @property fieldPower The reference field's distance-weighted race power.
 * @property statGaps Per-stat `field - trainee` deficit. A positive value is how far short the trainee is on that stat; zero or negative means at/above the field.
 * @property readiness Bucketed verdict from [winProbability].
 * @property limitingStat The stat with the largest positive gap - the single best place to invest - or null when the trainee meets the field on every stat.
 */
data class CmPreviewResult(
    val winProbability: Double,
    val effectivePower: Double,
    val fieldPower: Double,
    val statGaps: Map<StatName, Int>,
    val readiness: CmReadiness,
    val limitingStat: StatName?,
)

/**
 * A pre-race readiness estimate for a Champions Meeting: how the trainee's current stats, aptitudes,
 * and the CM's distance stack up against a reference "meta" field, expressed as a win probability and
 * a per-stat gap breakdown ("you are 130 Speed short of the field").
 *
 * This is a **heuristic**, not a race simulator. It weights the five stats by how much each matters at
 * the CM's distance (mirroring the in-race emphasis the solver already uses in
 * [ScoringFunctions.RACE_STAT_SPLIT_BY_DISTANCE_TYPE]), penalizes an off-aptitude entry, and compares
 * the resulting race power to a community meta stat line via a logistic curve. Skills, running-style
 * match, and RNG are deliberately out of scope - it answers "are my raw stats in the fight?", which is
 * the question a player asks before entering. Treat the number as a directional readiness gauge.
 */
object ChampionsMeetingPreview {
    /**
     * Per-stat share of race power by distance category. Mirrors the in-race stat emphasis in
     * [ScoringFunctions.RACE_STAT_SPLIT_BY_DISTANCE_TYPE] so the preview and the scheduler agree on
     * what each distance rewards. Each row sums to 1.0.
     */
    private val STAT_WEIGHT_BY_DISTANCE: Map<TrackDistance, Map<StatName, Double>> =
        mapOf(
            TrackDistance.SPRINT to mapOf(StatName.SPEED to 0.35, StatName.STAMINA to 0.1, StatName.POWER to 0.3, StatName.GUTS to 0.15, StatName.WIT to 0.1),
            TrackDistance.MILE to mapOf(StatName.SPEED to 0.3, StatName.STAMINA to 0.15, StatName.POWER to 0.2, StatName.GUTS to 0.15, StatName.WIT to 0.2),
            TrackDistance.MEDIUM to mapOf(StatName.SPEED to 0.25, StatName.STAMINA to 0.2, StatName.POWER to 0.2, StatName.GUTS to 0.2, StatName.WIT to 0.15),
            TrackDistance.LONG to mapOf(StatName.SPEED to 0.15, StatName.STAMINA to 0.3, StatName.POWER to 0.15, StatName.GUTS to 0.25, StatName.WIT to 0.15),
        )

    /**
     * Best-effort community "meta" stat lines a competitive entrant targets at each distance, used as the
     * reference field when the caller does not supply one. These are a directional community snapshot
     * (the same caveat as [ChampionsMeeting.CM_CALENDAR]), not first-party data, and can be overridden
     * per call as the meta shifts.
     */
    val DEFAULT_META_STATS_BY_DISTANCE: Map<TrackDistance, TraineeStats> =
        mapOf(
            TrackDistance.SPRINT to TraineeStats(speed = 1300, stamina = 400, power = 1300, guts = 600, wit = 1000),
            TrackDistance.MILE to TraineeStats(speed = 1300, stamina = 650, power = 1150, guts = 600, wit = 1100),
            TrackDistance.MEDIUM to TraineeStats(speed = 1200, stamina = 1000, power = 1100, guts = 650, wit = 1100),
            TrackDistance.LONG to TraineeStats(speed = 1150, stamina = 1200, power = 1000, guts = 700, wit = 1050),
        )

    /**
     * Aptitude multiplier on race power. The meta stat lines assume an A-aptitude entrant, so A is the
     * 1.0 baseline; S is a small bonus and anything below A scales performance down sharply, reflecting
     * how badly an off-aptitude entry races. Indexed by [Aptitude.ordinal] (G=0 .. S=7).
     */
    private val APTITUDE_FACTOR: DoubleArray =
        doubleArrayOf(
            0.45, // G
            0.55, // F
            0.66, // E
            0.78, // D
            0.88, // C
            0.95, // B
            1.0, // A
            1.03, // S
        )

    /** Logistic steepness on the relative power gap. Tuned so a ~10% power edge reads as ~0.7 win probability. */
    private const val LOGISTIC_STEEPNESS = 8.0

    /** Win-probability thresholds for the [CmReadiness] buckets. */
    private const val READY_THRESHOLD = 0.6
    private const val COMPETITIVE_THRESHOLD = 0.4

    /**
     * Distance-weighted race power of [stats] at [distance]: the sum of each stat scaled by its share of
     * that distance's emphasis. Not aptitude-adjusted - see [estimate].
     */
    private fun rawPower(stats: TraineeStats, distance: TrackDistance): Double {
        val weights = STAT_WEIGHT_BY_DISTANCE[distance] ?: return 0.0
        return StatName.entries.sumOf { stat -> stats.of(stat) * (weights[stat] ?: 0.0) }
    }

    /**
     * Estimates the trainee's standing against a Champions Meeting field.
     *
     * @param stats The trainee's current five stats.
     * @param distance The CM's distance category.
     * @param aptitudes The trainee's aptitudes; the weaker of the CM distance/surface aptitude drives the penalty.
     * @param surface The CM's surface.
     * @param field The reference field stat line. Defaults to [DEFAULT_META_STATS_BY_DISTANCE] for [distance].
     * @return The win-probability estimate and per-stat gap breakdown.
     */
    fun estimate(
        stats: TraineeStats,
        distance: TrackDistance,
        aptitudes: Aptitudes,
        surface: TrackSurface = TrackSurface.TURF,
        field: TraineeStats = DEFAULT_META_STATS_BY_DISTANCE[distance] ?: TraineeStats(1200, 800, 1000, 600, 1000),
    ): CmPreviewResult {
        val weakerApt = minOf(aptitudes.forDistance(distance).ordinal, aptitudes.forSurface(surface).ordinal)
            .coerceIn(0, APTITUDE_FACTOR.lastIndex)
        val effectivePower = rawPower(stats, distance) * APTITUDE_FACTOR[weakerApt]
        // The field is defined as the meta line raced on-aptitude, so it takes no aptitude penalty.
        val fieldPower = rawPower(field, distance)

        val relativeGap = if (fieldPower > 0.0) (effectivePower - fieldPower) / fieldPower else 0.0
        val winProbability = (1.0 / (1.0 + exp(-LOGISTIC_STEEPNESS * relativeGap))).coerceIn(0.02, 0.98)

        val statGaps = StatName.entries.associateWith { stat -> field.of(stat) - stats.of(stat) }
        val limitingStat = statGaps.filterValues { it > 0 }.maxByOrNull { it.value }?.key

        val readiness =
            when {
                winProbability >= READY_THRESHOLD -> CmReadiness.READY
                winProbability >= COMPETITIVE_THRESHOLD -> CmReadiness.COMPETITIVE
                else -> CmReadiness.UNDERPOWERED
            }

        return CmPreviewResult(
            winProbability = winProbability,
            effectivePower = effectivePower,
            fieldPower = fieldPower,
            statGaps = statGaps,
            readiness = readiness,
            limitingStat = limitingStat,
        )
    }

    /**
     * Convenience overload that resolves the distance/surface from a [ChampionsMeeting] preset id
     * (e.g. `"cm16_leo_2"`), so a caller with only the preset key can get a preview.
     *
     * @param stats The trainee's current five stats.
     * @param presetId A [ChampionsMeeting.CmEntry.id]; unknown ids return null.
     * @param aptitudes The trainee's aptitudes.
     * @return The preview, or null when [presetId] is not a known CM.
     */
    fun estimateForPreset(stats: TraineeStats, presetId: String, aptitudes: Aptitudes): CmPreviewResult? {
        val cm = ChampionsMeeting.CM_CALENDAR.firstOrNull { it.id == presetId } ?: return null
        return estimate(stats = stats, distance = cm.distanceType, aptitudes = aptitudes, surface = cm.surface)
    }
}
