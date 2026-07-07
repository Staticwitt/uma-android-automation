/**
 * Shared types and constants for the Smart Race Solver helpers in `src/lib/solver`.
 * Mirrors the shape of the bundled `races.json` / `epithets.json` / `characterPresets.json` data files.
 */

// //////////////////////////////////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////////////////////////////////
// Types

export interface RaceEntry {
    /** Display name of the race (e.g. "Tokyo Yushun"). Also used as the unique key. */
    name: string
    /** In-game date string the scraper produced (e.g. "Junior Class June, First Half"). */
    date: string
    /** Absolute 1-indexed turn within the 72-turn career when this race runs. */
    turnNumber: number
    /** Race grade tier: "G1" | "G2" | "G3" | "OP" | "PRE_OP" | "MAIDEN" | "DEBUT" | "FINALE" | "EX". */
    grade: string
    /** Surface type: "Turf" or "Dirt". */
    terrain: string
    /** Distance bucket: "Sprint" | "Mile" | "Medium" | "Long". */
    distanceType: string
    /** Race distance in meters (e.g. 1600, 2400). */
    distanceMeters: number
    /** Fans rewarded for winning, used by the Farming Fans flow. */
    fans: number
    /** Race-track venue name (e.g. "Tokyo", "Hanshin"). */
    raceTrack: string
    /** Track handedness at this venue: "Left" or "Right". Used by the Champions Meeting build-target bonus. */
    direction?: string
}

export interface EpithetEntry {
    /** Display name and unique key. */
    name: string
    /** Free-text bullets in gametora's visible row order: scenario / character restriction (when present) first, then condition / qualifier
     *  bullets, then the reward bullet last. The reward bullet is parsed by `epithetReward`. */
    bullet_points: string[]
    /** Scenario gate, e.g. `["Trackblazer"]`. Empty means universal. Derived by the scraper from `<X> scenario only` bullets.
     *  Consumers may also fall back to parsing `bullet_points` directly via `scenariosForEpithet` when this field is absent on legacy snapshots. */
    scenarios?: string[]
    /** Character gate, e.g. `["Yaeno Muteki"]`. Empty means available to every character. Derived from standalone `<name> only` bullets. */
    characters?: string[]
    /** Structured race-condition matchers used by the solver. Optional only for fixtures / test scaffolding. Production data always carries this. */
    matchers?: Record<string, unknown>[]
}

export interface CharacterPresetEntry {
    /** Character display name and unique key (e.g. "Special Week"). */
    name: string
    /** Default distance aptitude grades (S..G) seeded when this preset is applied. */
    distanceAptitudes: { Sprint: string; Mile: string; Medium: string; Long: string }
    /** Default surface aptitude grades (S..G) seeded when this preset is applied. */
    surfaceAptitudes: { Turf: string; Dirt: string }
    /** Default running-style aptitude grades (S..G) seeded when this preset is applied. Optional: absent on
     *  presets scraped before this field was added, until the next weekly data refresh backfills it. */
    runningStyleAptitudes?: { "Front Runner": string; "Pace Chaser": string; "Late Surger": string; "End Closer": string }
    /** Per-stat growth-rate bonus percentages (e.g. `10` = +10%) for this specific outfit/costume, mirroring the
     *  in-game "growth rate" stat shown on alternate-costume character pages. Outfit variants are keyed in
     *  `characterPresets.json` by their outfit-qualified display name (e.g. "Special Week (Wedding)"), distinct
     *  from the base character's entry. Zero for stats with no bonus. Optional: absent on presets scraped before
     *  this field was added, or on outfits with no growth bonus, until the next weekly data refresh backfills it. */
    growthBonus?: Record<StatName, number>
}

export interface AptitudeMap {
    /** Sprint-distance aptitude grade (S..G). */
    Sprint: string
    /** Mile-distance aptitude grade (S..G). */
    Mile: string
    /** Medium-distance aptitude grade (S..G). */
    Medium: string
    /** Long-distance aptitude grade (S..G). */
    Long: string
    /** Turf-surface aptitude grade (S..G). */
    Turf: string
    /** Dirt-surface aptitude grade (S..G). */
    Dirt: string
}

export interface WeightsMap {
    /** Multiplier applied to every race's stat + SP reward when scoring. */
    raceValue: number
    /** Multiplier applied to epithet stat rewards. */
    epithetValue: number
    /** Extra multiplier applied only to selected target epithets. */
    targetEpithetMultiplier: number
    /** Per-stat-point weight in the scoring function. */
    statWeight: number
    /** Per-SP-point weight in the scoring function. */
    spWeight: number
    /** Score awarded for completing a skill-hint epithet. */
    hintWeight: number
    /** Penalty per race when racing 3+ turns in a row. */
    consecutiveRacePenalty: number
    /** Penalty for racing during summer training-camp turns. */
    summerPenalty: number
    /** Percentage uplift applied to base stat / SP reward of every race before scoring. */
    raceBonusPct: number
    /** Cost subtracted from each race's reward, expressed as a percentage of a G2 baseline. */
    raceCostPct: number
    /** Per-fan score contribution applied to a race's reward fans. 0.0 ignores fans entirely (Stat Epitaphs preset default).
     *  1e-3 (Fans + Epitaphs preset) makes a 25k-fan G1 contribute ~25 score points - meaningful but not dominant. */
    fanWeight: number
    /** When current fans meet this target, fan-weighted race scoring is suppressed so the solver stops fan-farming. 0 disables. */
    minimumFanTarget: number
    /** Minimum number of non-race turns required between solver-planned races. 1 prevents back-to-back solver races. */
    minimumRaceGapTurns: number
    /** Minimum aptitude rank (S..G) a race needs in BOTH its distance type and surface to be eligible. */
    aptitudeThreshold: string
    /** When true, OP and Pre-OP races are also considered alongside G1 / G2 / G3. */
    includeOpAndPreOp: boolean
    /** When true, races during the Classic / Senior summer training camps are not blocked. */
    allowSummerRacing: boolean
    /** Pessimism dial (0..1) scaling race/epithet EV by estimated P(win). 1.0 = full estimate. */
    assumedRaceWinRate: number
    /** Hard floor on P(win) for eligible races. 0 disables. */
    minWinRateGuard: number
    /** Extra penalty when racing below the low-energy threshold. */
    lowEnergyRacePenalty: number
    /** Score bonus for planning Rest when energy is low. */
    energyRestValue: number
    /** Hard cap (meters) on eligible race distance. 0 disables the cap. */
    maxRaceDistance: number
    /** Extra penalty stacked on top of `consecutiveRacePenalty` once a race turn is the 4th (or later) in an unbroken race chain. */
    fourConsecutiveRacePenalty: number
    /** Selected Champions Meeting calendar id (see `CHAMPIONS_MEETING_CALENDAR`), or "" to disable Champions-Meeting-aware scoring. */
    championsMeetingPreset: string
    /** Coefficient scaling the Champions Meeting build-target match score into an objective bonus. */
    hintMatchWeight: number
}

/** Progress against a single matcher or a whole epithet. `current` is capped at `required`. */
export interface MatcherProgress {
    /** Current count of qualifying wins toward the matcher, capped at `required`. */
    current: number
    /** Total qualifying wins needed to satisfy the matcher. */
    required: number
}

/** Aggregate stats shown in the preview summary panel. */
export interface PreviewStats {
    /** Total number of races scheduled across the 72-turn career. */
    races: number
    /** Number of epithets the schedule is projected to complete. */
    epithets: number
    /** Sum of stat rewards from all scheduled races. */
    raceStats: number
    /** Sum of skill-point (SP) rewards from all scheduled races. */
    raceSp: number
    /** Sum of stat rewards from projected epithet completions. */
    epithetStats: number
    /** Number of skill hints earned via hint-reward epithets. */
    hints: number
    /** Sum of reward fans across all scheduled races. */
    fans: number
}

// //////////////////////////////////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////////////////////////////////
// Constants

/** The five trainable stats. Mirrors `StatName` in `Types.kt` (scoring-shared) and the Kotlin solver's `growthBonus` map keys. */
export type StatName = "Speed" | "Stamina" | "Power" | "Guts" | "Wit"

export const STAT_KEYS: StatName[] = ["Speed", "Stamina", "Power", "Guts", "Wit"]

export const APTITUDE_RANKS = ["S", "A", "B", "C", "D", "E", "F", "G"]

export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export const YEAR_LABELS: { name: string; startTurn: number }[] = [
    { name: "Junior", startTurn: 1 },
    { name: "Classic", startTurn: 25 },
    { name: "Senior", startTurn: 49 },
]

/** Reference Trackblazer scoring breakdown (matches `solver-browser.js` BASE_REWARD). */
export const BASE_STAT_BY_GRADE: Record<string, number> = { G1: 10, G2: 8, G3: 8, OP: 5, PRE_OP: 5 }
export const BASE_SP_BY_GRADE: Record<string, number> = { G1: 35, G2: 25, G3: 25, OP: 15, PRE_OP: 10 }

/** Heuristic per-stat share of a race's flat `BASE_STAT_BY_GRADE` reward, keyed by `RaceEntry.distanceType`. The
 *  bundled race data models each race's reward as a single aggregate number per grade tier - there is no real
 *  per-stat breakdown anywhere in this app's data. This table is a tunable approximation (each row sums to 1.0)
 *  used ONLY to apply outfit `growthBonus` percentages proportionally to the stats a race's distance favors; it is
 *  not sourced from exact game data. Mirror of `RACE_STAT_SPLIT_BY_DISTANCE_TYPE` in `ScoringFunctions.kt`. */
export const RACE_STAT_SPLIT_BY_DISTANCE_TYPE: Record<string, Record<StatName, number>> = {
    Sprint: { Speed: 0.35, Stamina: 0.1, Power: 0.3, Guts: 0.15, Wit: 0.1 },
    Mile: { Speed: 0.3, Stamina: 0.15, Power: 0.2, Guts: 0.15, Wit: 0.2 },
    Medium: { Speed: 0.25, Stamina: 0.2, Power: 0.2, Guts: 0.2, Wit: 0.15 },
    Long: { Speed: 0.15, Stamina: 0.3, Power: 0.15, Guts: 0.25, Wit: 0.15 },
}

export const GRADE_COLORS: Record<string, string> = {
    G1: "#2563eb",
    G2: "#ec4899",
    G3: "#16a34a",
    OP: "#ca8a04",
    PRE_OP: "#a16207",
    MAIDEN: "#6b7280",
    DEBUT: "#6b7280",
    FINALE: "#7c3aed",
    EX: "#7c3aed",
}

export const DEFAULT_APTITUDES: AptitudeMap = { Sprint: "A", Mile: "A", Medium: "A", Long: "A", Turf: "A", Dirt: "A" }

export const DEFAULT_WEIGHTS: WeightsMap = {
    raceValue: 1.0,
    epithetValue: 1.0,
    targetEpithetMultiplier: 3.0,
    statWeight: 1.0,
    spWeight: 1.0,
    hintWeight: 8.0,
    consecutiveRacePenalty: 3.0,
    summerPenalty: 5.0,
    raceBonusPct: 50.0,
    raceCostPct: 100.0,
    fanWeight: 0.0,
    minimumFanTarget: 0,
    minimumRaceGapTurns: 0,
    aptitudeThreshold: "C",
    includeOpAndPreOp: false,
    allowSummerRacing: false,
    assumedRaceWinRate: 1.0,
    minWinRateGuard: 0,
    lowEnergyRacePenalty: 4.0,
    energyRestValue: 2.0,
    maxRaceDistance: 0,
    fourConsecutiveRacePenalty: 0.0,
    championsMeetingPreset: "",
    hintMatchWeight: 10.0,
}

/** Named optimization-mode presets for the Smart Race Solver. Selecting a mode in the UI snaps the
 *  editable weight sliders to the corresponding bundle; the user can still override individual
 *  sliders afterward. The mode itself is not persisted as a separate setting - it is derived from
 *  `weights.fanWeight > 0`, which keeps the stored state and UI in sync. */
export const OPTIMIZE_MODE_PRESETS: Record<"STAT_EPITAPH" | "FANS_EPITAPH", Partial<WeightsMap>> = {
    STAT_EPITAPH: { raceValue: 1.0, epithetValue: 1.0, fanWeight: 0.0 },
    FANS_EPITAPH: { raceValue: 1.0, epithetValue: 1.0, fanWeight: 1.0e-3 },
}

/** Key identifying which optimization-mode preset is active. */
export type OptimizeModeKey = keyof typeof OPTIMIZE_MODE_PRESETS

/** Display labels for each optimization mode (used by the radio toggle in SmartRaceSolverSettings and the MessageLog banner). */
export const OPTIMIZE_MODE_LABELS: Record<OptimizeModeKey, string> = {
    STAT_EPITAPH: "Stat Epitaphs",
    FANS_EPITAPH: "Fans + Epitaphs",
}

/** The sentinel a manual-lock entry takes to lock a turn to Train / no race. The Kotlin parser understands this as `Decision.Train`.
 *  Keep in sync with `TRAIN_LOCK_SENTINEL` in `SmartRaceSolverIntegration.kt`. */
export const TRAIN_LOCK_SENTINEL = "__TRAIN__"

/** Aptitude rank ordering from G to S. Lower index = weaker.
 *  Used for the eligibility check on the TS side so we don't have to round-trip to Kotlin to know which alternative races are valid. */
export const APT_ORDER: Record<string, number> = { G: 0, F: 1, E: 2, D: 3, C: 4, B: 5, A: 6, S: 7 }

export const OP_GRADES = new Set(["OP", "PRE_OP", "Pre-OP", "PreOP"])

/** UI picker labels for the Champions Meeting preset selector. `id` must match `ChampionsMeeting.CM_CALENDAR`'s
 *  `id` field in the Kotlin solver - the actual build-target weighting math lives there, this is display-only.
 *  Ported (ids/labels only) from the reference Trackblazer scheduler's `CM_CALENDAR`; see `ChampionsMeeting.kt`'s
 *  class doc for the "not independently verified" caveat on this calendar data. */
export const CHAMPIONS_MEETING_CALENDAR: { id: string; label: string }[] = [
    { id: "cm01_taurus", label: "CM1 — Taurus Cup" },
    { id: "cm02_gemini", label: "CM2 — Gemini Cup" },
    { id: "cm03_cancer", label: "CM3 — Cancer Cup" },
    { id: "cm04_leo", label: "CM4 — Leo Cup" },
    { id: "cm05_virgo", label: "CM5 — Virgo Cup" },
    { id: "cm06_libra", label: "CM6 — Libra Cup" },
    { id: "cm07_scorpio", label: "CM7 — Scorpio Cup" },
    { id: "cm08_sagittarius", label: "CM8 — Sagittarius Cup" },
    { id: "cm09_capricorn", label: "CM9 — Capricorn Cup" },
    { id: "cm10_aquarius", label: "CM10 — Aquarius Cup" },
    { id: "cm11_pisces", label: "CM11 — Pisces Cup" },
    { id: "cm12_aries", label: "CM12 — Aries Cup" },
    { id: "cm13_taurus_2", label: "CM13 — Taurus Cup (2)" },
    { id: "cm14_gemini_2", label: "CM14 — Gemini Cup (2)" },
    { id: "cm15_cancer_2", label: "CM15 — Cancer Cup (2)" },
    { id: "cm16_leo_2", label: "CM16 — Leo Cup (2)" },
    { id: "cm17_virgo_2", label: "CM17 — Virgo Cup (2)" },
]

/** Mirror of `EpithetFilters.COUNTRY_NAMES` in `Epithet.kt`. Keep these two lists in sync.
 *  Used by the `nameContainsCountry` branch of the `winCount` filter (Globe-Trotter epithet).
 *  Trailing space on `"Japan "` is intentional - prevents false matches on "Japanese ..." races. */
export const COUNTRY_NAMES = ["Saudi Arabia", "Argentina", "American", "New Zealand", "Japan "]

// //////////////////////////////////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////////////////////////////////
// Calendar helpers

/**
 * In-game date label for a turn-in-year offset (0..23). Floor-divides by 2 to pick the month and uses parity to choose Early / Late.
 * Example: offset 13 returns "Late Jul".
 *
 * @param turnInYear The 0-indexed turn offset within a year (0..23).
 * @returns The "Early <Month>" / "Late <Month>" style date label.
 */
export const turnDateLabel = (turnInYear: number): string => {
    const month = MONTH_LABELS[Math.floor(turnInYear / 2)]
    const half = turnInYear % 2 === 0 ? "Early" : "Late"
    return `${half} ${month}`
}

/**
 * Full "Year Month Phase" label for an absolute 1-indexed career turn (1-72). Junior is turns 1-24, Classic 25-48, Senior 49-72.
 * Example: turn 60 returns "Senior Late Jun".
 *
 * @param turn The absolute 1-indexed career turn number (1-72).
 * @returns The "Junior/Classic/Senior Early/Late <Month>" label.
 */
export const formatCareerTurn = (turn: number): string => {
    const yearName = turn <= 24 ? "Junior" : turn <= 48 ? "Classic" : "Senior"
    return `${yearName} ${turnDateLabel((turn - 1) % 24)}`
}

/**
 * Growth-bonus-adjusted base stat reward for a race grade. Distributes the flat `BASE_STAT_BY_GRADE[grade]` reward
 * across the 5 stats per `RACE_STAT_SPLIT_BY_DISTANCE_TYPE[distanceType]`, scales each stat's share by
 * `(1 + growthBonus[stat] / 100)`, and sums back into a single number. Falls back to the unadjusted base reward
 * when `distanceType` or `growthBonus` is missing, so callers without an active outfit preset see unchanged behavior.
 *
 * @param grade Race grade key (matches `BASE_STAT_BY_GRADE`).
 * @param distanceType Race `distanceType` key (matches `RACE_STAT_SPLIT_BY_DISTANCE_TYPE`), or undefined to skip adjustment.
 * @param growthBonus Per-stat growth bonus percentages from the active character preset, or undefined to skip adjustment.
 * @returns The growth-adjusted base stat reward.
 */
export const growthAdjustedBaseStat = (grade: string, distanceType: string | undefined, growthBonus: Record<StatName, number> | undefined): number => {
    const base = BASE_STAT_BY_GRADE[grade] ?? 0
    const split = distanceType ? RACE_STAT_SPLIT_BY_DISTANCE_TYPE[distanceType] : undefined
    if (!split || !growthBonus) return base
    return STAT_KEYS.reduce((sum, stat) => sum + base * split[stat] * (1 + (growthBonus[stat] ?? 0) / 100), 0)
}

const RACE_NAME_ABBREVIATIONS: Record<string, string> = {
    "Hanshin Juvenile Fillies": "Hanshin Juv. F.",
    "Mile Championship": "Mile Champ.",
    "Takarazuka Kinen": "Takarazuka K.",
    "Saudi Arabia Royal Cup": "Saudi Arabia P.",
    "Tokyo Sports Hai Niko Sai Sho": "Tokyo Sports",
    "Niigata Junior Stakes": "Niigata Jr. S.",
    "Kokura Junior Stakes": "Kokura Jr. S.",
    "Sprinters Stakes": "Sprinters S.",
    "Asahi Hai Futurity Stakes": "Asahi Hai F. S.",
}

/**
 * Trims a race name for narrow calendar cells: strips the trailing parenthetical date suffix (e.g. "(Junior Class December, Second Half)")
 * and applies the abbreviation table for known over-long names.
 *
 * @param name The race name to shorten.
 * @returns The trimmed and (when applicable) abbreviated race name.
 */
export const shortenRaceName = (name: string): string => {
    const stripped = name.replace(/\s*\(.*\)\s*$/, "").trim()
    return RACE_NAME_ABBREVIATIONS[stripped] ?? stripped
}
