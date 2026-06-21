package com.steve1316.uma_android_automation.bot.solver

import com.steve1316.uma_android_automation.types.DateMonth
import com.steve1316.uma_android_automation.types.TrackDistance
import com.steve1316.uma_android_automation.types.TrackSurface
import java.util.concurrent.ConcurrentHashMap

/**
 * Champions Meeting (CM) calendar weighting, ported from the community Trackblazer scheduler
 * (https://github.com/Rom1foucher/umamusume_trackblazer_scheduler). The [CM_CALENDAR] table below is
 * copied verbatim from that project's `CM_CALENDAR` constant, which the upstream project's own
 * comments describe as "verified against uma.guide" - this has NOT been independently re-verified
 * here, since both uma.guide and GameTora returned HTTP 403 when checked from this environment.
 * Treat the calendar as a best-effort community snapshot rather than confirmed first-party data.
 *
 * Selecting a CM preset (see [Weights.championsMeetingPreset]) adds a small per-race bonus in
 * [ScoringFunctions.raceValue] for races whose distance/surface/handedness/season match the active
 * CM's profile, nudging the schedule toward races that exercise conditions similar to the upcoming
 * CM without overriding grade/epithet-driven scoring - the handedness/season axis weights are
 * deliberately small (see [HANDEDNESS_AXIS_WEIGHT]/[SEASON_AXIS_WEIGHT]) so they only break ties.
 */
object ChampionsMeeting {
    enum class Season { SPRING, SUMMER, FALL, WINTER }

    /**
     * A single Champions Meeting calendar entry.
     *
     * @property id Stable preset key stored in [Weights.championsMeetingPreset].
     * @property label Display label for the UI picker (e.g. "CM1 — Taurus Cup").
     * @property distanceType The CM race's distance category.
     * @property lengthMeters The CM race's distance in meters. Used only to resolve [trackDirection]'s
     *   Niigata-straight special case.
     * @property track In-game venue name (e.g. "Tokyo").
     * @property surface The CM race's surface.
     * @property season The CM race's season.
     */
    data class CmEntry(
        val id: String,
        val label: String,
        val distanceType: TrackDistance,
        val lengthMeters: Int,
        val track: String,
        val surface: TrackSurface,
        val season: Season,
    )

    /** Per-axis weight vectors describing what a CM "wants" out of an eligible race. */
    data class CmBuildTarget(
        val distance: Map<TrackDistance, Double>,
        val handedness: Map<String, Double>,
        val surface: Map<TrackSurface, Double>,
        val season: Map<Season, Double>,
    )

    /** Mirror of the reference solver's `LEFT_TRACKS` set. */
    private val LEFT_TRACKS = setOf("Tokyo", "Chukyo", "Niigata")

    /** Mirror of the reference solver's `RIGHT_TRACKS` set. */
    private val RIGHT_TRACKS = setOf("Nakayama", "Hanshin", "Kyoto", "Sapporo", "Hakodate", "Fukushima", "Kokura", "Ooi", "Oi")

    /** Mirror of the reference solver's `HANDEDNESS_AXIS_WEIGHT`. Deliberately small - see class doc. */
    private const val HANDEDNESS_AXIS_WEIGHT = 0.3

    /** Mirror of the reference solver's `SEASON_AXIS_WEIGHT`. Deliberately small - see class doc. */
    private const val SEASON_AXIS_WEIGHT = 0.2

    /**
     * CM1-CM17 calendar, ported verbatim (see class doc) from the reference Trackblazer project's
     * `CM_CALENDAR` table. Order matches the upstream project's global-server CM sequence.
     */
    val CM_CALENDAR: List<CmEntry> =
        listOf(
            CmEntry("cm01_taurus", "CM1 — Taurus Cup", TrackDistance.MEDIUM, 2400, "Tokyo", TrackSurface.TURF, Season.SPRING),
            CmEntry("cm02_gemini", "CM2 — Gemini Cup", TrackDistance.LONG, 3200, "Kyoto", TrackSurface.TURF, Season.SPRING),
            CmEntry("cm03_cancer", "CM3 — Cancer Cup", TrackDistance.MILE, 1600, "Tokyo", TrackSurface.TURF, Season.SPRING),
            CmEntry("cm04_leo", "CM4 — Leo Cup", TrackDistance.MEDIUM, 2200, "Hanshin", TrackSurface.TURF, Season.SUMMER),
            CmEntry("cm05_virgo", "CM5 — Virgo Cup", TrackDistance.MILE, 1600, "Hanshin", TrackSurface.TURF, Season.FALL),
            CmEntry("cm06_libra", "CM6 — Libra Cup", TrackDistance.LONG, 3000, "Kyoto", TrackSurface.TURF, Season.FALL),
            CmEntry("cm07_scorpio", "CM7 — Scorpio Cup", TrackDistance.MEDIUM, 2000, "Tokyo", TrackSurface.TURF, Season.FALL),
            CmEntry("cm08_sagittarius", "CM8 — Sagittarius Cup", TrackDistance.LONG, 2500, "Nakayama", TrackSurface.TURF, Season.WINTER),
            CmEntry("cm09_capricorn", "CM9 — Capricorn Cup", TrackDistance.SPRINT, 1200, "Chukyo", TrackSurface.TURF, Season.WINTER),
            CmEntry("cm10_aquarius", "CM10 — Aquarius Cup", TrackDistance.MILE, 1600, "Tokyo", TrackSurface.DIRT, Season.WINTER),
            CmEntry("cm11_pisces", "CM11 — Pisces Cup", TrackDistance.LONG, 3200, "Hanshin", TrackSurface.TURF, Season.SPRING),
            CmEntry("cm12_aries", "CM12 — Aries Cup", TrackDistance.MEDIUM, 2000, "Nakayama", TrackSurface.TURF, Season.SPRING),
            CmEntry("cm13_taurus_2", "CM13 — Taurus Cup (2)", TrackDistance.MEDIUM, 2400, "Tokyo", TrackSurface.TURF, Season.SPRING),
            CmEntry("cm14_gemini_2", "CM14 — Gemini Cup (2)", TrackDistance.MILE, 1600, "Tokyo", TrackSurface.TURF, Season.SPRING),
            CmEntry("cm15_cancer_2", "CM15 — Cancer Cup (2)", TrackDistance.MEDIUM, 2200, "Hanshin", TrackSurface.TURF, Season.SUMMER),
            CmEntry("cm16_leo_2", "CM16 — Leo Cup (2)", TrackDistance.SPRINT, 1200, "Nakayama", TrackSurface.TURF, Season.SUMMER),
            CmEntry("cm17_virgo_2", "CM17 — Virgo Cup (2)", TrackDistance.MEDIUM, 2000, "Hanshin", TrackSurface.DIRT, Season.FALL),
        )

    private val byId: Map<String, CmEntry> = CM_CALENDAR.associateBy { it.id }

    private val buildTargetCache = ConcurrentHashMap<String, CmBuildTarget>()

    private val DISTANCE_ORDER = listOf(TrackDistance.SPRINT, TrackDistance.MILE, TrackDistance.MEDIUM, TrackDistance.LONG)

    /**
     * Track handedness for a venue, mirroring the reference solver's `trackDirection()`. Handles the
     * Niigata 1000m straight-course special case; all other Niigata races are Left-handed.
     *
     * @param track In-game venue name (e.g. "Tokyo").
     * @param lengthMeters Race distance in meters, used only to detect the Niigata-straight case.
     * @return "Left", "Right", "Straight", or null when the venue isn't recognized.
     */
    fun trackDirection(track: String, lengthMeters: Int): String? =
        when {
            track == "Niigata" && lengthMeters == 1000 -> "Straight"
            track in LEFT_TRACKS -> "Left"
            track in RIGHT_TRACKS -> "Right"
            else -> null
        }

    /**
     * Maps a `races.json`-style free-text date label (e.g. "Senior Class January, First Half") to a
     * [Season] by extracting the month name and bucketing it Spring (Mar-May) / Summer (Jun-Aug) /
     * Fall (Sep-Nov) / Winter (Dec-Feb), mirroring the reference solver's `seasonForRace()`.
     *
     * @param date Free-text date label, matching [RaceCandidate.date]'s format.
     * @return The matching [Season], or null when the month can't be parsed.
     */
    fun seasonForDate(date: String): Season? {
        val monthName = date.substringAfter("Class ", "").substringBefore(",").trim()
        val month = DateMonth.fromName(monthName) ?: return null
        return when (month) {
            DateMonth.MARCH, DateMonth.APRIL, DateMonth.MAY -> Season.SPRING
            DateMonth.JUNE, DateMonth.JULY, DateMonth.AUGUST -> Season.SUMMER
            DateMonth.SEPTEMBER, DateMonth.OCTOBER, DateMonth.NOVEMBER -> Season.FALL
            DateMonth.DECEMBER, DateMonth.JANUARY, DateMonth.FEBRUARY -> Season.WINTER
        }
    }

    /**
     * Builds the per-axis weight vector for [cm]. Distance axis: exact category match = 1.0, adjacent
     * category = 0.3, else 0. Surface axis: exact match = 1.0, else 0. Handedness/season axes use the
     * small [HANDEDNESS_AXIS_WEIGHT]/[SEASON_AXIS_WEIGHT] constants. Mirrors the reference solver's
     * `cmToBuildTarget()`.
     */
    private fun cmToBuildTarget(cm: CmEntry): CmBuildTarget {
        val targetIdx = DISTANCE_ORDER.indexOf(cm.distanceType)
        val dist =
            DISTANCE_ORDER.associateWith { d ->
                val diff = Math.abs(DISTANCE_ORDER.indexOf(d) - targetIdx)
                when (diff) {
                    0 -> 1.0
                    1 -> 0.3
                    else -> 0.0
                }
            }
        val dir = trackDirection(cm.track, cm.lengthMeters)
        val hand =
            mapOf(
                "Left" to if (dir == "Left") HANDEDNESS_AXIS_WEIGHT else 0.0,
                "Right" to if (dir == "Right") HANDEDNESS_AXIS_WEIGHT else 0.0,
            )
        val surf =
            mapOf(
                TrackSurface.TURF to if (cm.surface == TrackSurface.TURF) 1.0 else 0.0,
                TrackSurface.DIRT to if (cm.surface == TrackSurface.DIRT) 1.0 else 0.0,
            )
        val season = Season.entries.associateWith { if (it == cm.season) SEASON_AXIS_WEIGHT else 0.0 }
        return CmBuildTarget(dist, hand, surf, season)
    }

    /**
     * Looks up the cached [CmBuildTarget] for [presetId], computing and caching it on first use.
     *
     * @param presetId A [CmEntry.id], or empty to disable Champions-Meeting-aware scoring.
     * @return The matching build target, or null when [presetId] is empty or unrecognized.
     */
    fun buildTargetFor(presetId: String): CmBuildTarget? {
        if (presetId.isEmpty()) return null
        val cm = byId[presetId] ?: return null
        return buildTargetCache.getOrPut(presetId) { cmToBuildTarget(cm) }
    }

    /**
     * Per-race bonus contribution to [ScoringFunctions.raceValue] for races whose attributes match the
     * active CM build target, scaled by [Weights.hintMatchWeight]. Mirrors the reference solver's
     * `computeBuildTargetBonus()`. Returns 0.0 when no preset is selected or [Weights.hintMatchWeight]
     * is non-positive.
     *
     * @param race Race candidate being scored.
     * @param weights Active weights providing [Weights.championsMeetingPreset] and [Weights.hintMatchWeight].
     * @return The additive build-target bonus for [race].
     */
    fun buildTargetBonus(race: RaceCandidate, weights: Weights): Double {
        if (weights.hintMatchWeight <= 0.0) return 0.0
        val bt = buildTargetFor(weights.championsMeetingPreset) ?: return 0.0
        var sum = 0.0
        sum += bt.distance[race.distanceType] ?: 0.0
        sum += bt.surface[race.terrain] ?: 0.0
        race.direction?.let { dir -> sum += bt.handedness[dir] ?: 0.0 }
        seasonForDate(race.date)?.let { season -> sum += bt.season[season] ?: 0.0 }
        return weights.hintMatchWeight * sum
    }
}
