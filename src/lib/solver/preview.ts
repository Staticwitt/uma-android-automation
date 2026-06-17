/**
 * Bridge types and call surface for the Kotlin Smart Race Solver. The settings UI sends a `SolverConfigSnapshot` over to the
 * `SmartRaceSolverModule` native module and renders the returned `SchedulePreview` without duplicating the beam-search algorithm in TS.
 */

import { NativeModules } from "react-native"

export interface SolverConfigSnapshot {
    /** Active scenario gate sent to the solver (e.g. "Trackblazer"). Decides which scenario-restricted epithets are eligible. */
    scenario: string
    /** Selected character preset name. Drives the seeded distance and surface aptitudes when applied. */
    characterPreset: string
    /** Distance and surface aptitude grades (S..G). Inline equivalent of `AptitudeMap` from `./constants`; see that interface for per-field docs. */
    aptitudes: { Sprint: string; Mile: string; Medium: string; Long: string; Turf: string; Dirt: string }
    /** Epithet names the user wants the solver to prioritise. Order does not matter. */
    targetEpithets: string[]
    /** Epithet names the solver must complete. Hard-locks the schedule so these always finish, regardless of score. */
    forcedEpithets: string[]
    /** Per-turn forced decisions keyed by 1-indexed turn number (as a string). Each value is a race name or `TRAIN_LOCK_SENTINEL` from `./constants`. */
    manualLocks: Record<string, string>
    /** Solver weights bundle. Inline equivalent of `WeightsMap` from `./constants`; see that interface for per-field docs. */
    weights: {
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
        /** Per-fan score contribution applied to a race's reward fans. 0.0 ignores fans entirely (Stat Epitaphs preset default). */
        fanWeight: number
        /** Minimum number of non-race turns required between solver-planned races. */
        minimumRaceGapTurns: number
        /** Minimum aptitude rank (S..G) a race needs in BOTH its distance type and surface to be eligible. */
        aptitudeThreshold: string
        /** When true, OP and Pre-OP races are also considered alongside G1 / G2 / G3. */
        includeOpAndPreOp: boolean
        /** When true, races during the Classic / Senior summer training camps are not blocked. */
        allowSummerRacing: boolean
        /** Pessimism dial (0..1) for win-rate-aware scoring. */
        assumedRaceWinRate?: number
        /** Hard P(win) floor; 0 disables the guard. */
        minWinRateGuard?: number
        lowEnergyRacePenalty?: number
        energyRestValue?: number
    }
    /** When true, merge live bot run wins/losses from [SmartRaceSolverIntegration]. */
    useLiveRunState?: boolean
    /** Optional 1-indexed turn for loss-aware preview (ignored when `useLiveRunState` is true). */
    currentTurn?: number
    /** Preview-only starting energy (0..100). Defaults to 100. */
    initialEnergy?: number
    /** Preview-only starting mood. Defaults to NORMAL. */
    initialMood?: string
    racesDataJson?: string
    /** Bundled epithets.json passed inline for the same reason as `racesDataJson`. */
    epithetsDataJson?: string
}

/** Decision the solver picked for a given turn: race a real race, do generic training, or rest. */
export type ScheduleEntryType = "Race" | "Train" | "Rest"

export interface ScheduleEntry {
    /** Decision the solver picked for this turn. */
    type: ScheduleEntryType
    /** Lookup key into `racesByKey`. Present only when `type === "Race"`. */
    raceKey?: string
    /** Human-readable race name (e.g. "Tokyo Yushun"). Present only when `type === "Race"`. */
    name?: string
    /** Race grade string (e.g. "G1", "OP"). Present only when `type === "Race"`; same shape as `RaceEntry.grade`. */
    grade?: string
}

export interface SchedulePreview {
    /** Per-turn schedule keyed by 1-indexed turn number serialised as a string (Kotlin -> JSON bridge artefact). */
    decisions: Record<string, ScheduleEntry>
    /** Epithet names the schedule completes. Consumed by `computePreviewStats` for the summary panel. */
    projectedEpithets: string[]
    /** Aggregate score the solver assigned to this schedule. Higher is better. */
    totalScore: number
    /** Populated by the Kotlin integration on a soft failure (e.g. "races data unavailable"). Presence signals a degraded result. */
    error?: string
    /** Current bot turn when `liveRun` is true. */
    currentTurn?: number
    /** True when this preview reflects an active bot run. */
    liveRun?: boolean
    /** Confirmed WIN/LOSE markers keyed by turn when `liveRun` is true. */
    results?: Array<{ turn: number; raceKey: string; name: string; outcome: "WIN" | "LOSE" }>
}

/**
 * Fetches the live calendar snapshot from an in-progress bot run, or null when idle.
 */
export async function getLiveCalendarSnapshot(): Promise<string | null> {
    const snapshot: string | null = await NativeModules.SmartRaceSolverModule.getLiveCalendarSnapshot()
    return snapshot ?? null
}

/**
 * Parses a live calendar JSON blob into a [SchedulePreview] plus results overlay.
 */
export function parseLiveCalendarSnapshot(json: string): SchedulePreview {
    const parsed = JSON.parse(json) as {
        currentTurn?: number
        decisions: Record<string, ScheduleEntry>
        projectedEpithets?: string[]
        totalScore?: number
        results?: Array<{ turn: number; raceKey: string; name: string; outcome: "WIN" | "LOSE" }>
    }
    return {
        decisions: parsed.decisions ?? {},
        projectedEpithets: parsed.projectedEpithets ?? [],
        totalScore: parsed.totalScore ?? 0,
        currentTurn: parsed.currentTurn,
        liveRun: true,
        results: parsed.results ?? [],
    }
}

/**
 * Calls the Kotlin Smart Race Solver to compute a fresh-start schedule preview for the given config.
 * On a soft failure (e.g. missing races data) the Kotlin side returns an empty schedule with `SchedulePreview.error` populated;
 * a hard failure rejects the bridge promise with an `E_SOLVER` code, which surfaces here as a thrown exception.
 *
 * @param config Snapshot of the current solver configuration to evaluate.
 * @returns Schedule preview produced by the solver; check `error` to detect soft failures.
 */
export async function previewSchedule(config: SolverConfigSnapshot): Promise<SchedulePreview> {
    const json: string = await NativeModules.SmartRaceSolverModule.previewSchedule(JSON.stringify(config))
    return JSON.parse(json) as SchedulePreview
}
