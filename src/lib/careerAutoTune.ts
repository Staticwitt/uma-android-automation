/**
 * Post-career auto-tuner.
 *
 * Analyzes a completed career run (as recorded by `CareerRunArchive.kt`) against the preset that produced it and emits concrete,
 * optionally one-tap-appliable suggestions for improving the next run. This encodes the manual log-analysis a human does after a
 * career: spotting a deprioritized stat that overshot its target, a priority stat that fell short, stamina/other bloat from
 * off-distance racing, an over-strict failure cap that wasted training turns, and skill points left unspent at the wire.
 *
 * Pure and dependency-free so it is fully unit-testable without the app or the native archive bridge.
 */

/** Canonical stat keys, matching the `stats` object persisted by CareerRunArchive.kt. */
export type StatKey = "speed" | "stamina" | "power" | "guts" | "wit"

/** Distances the preset carries a target block for. */
export type DistanceKey = "Sprint" | "Mile" | "Medium" | "Long"

export const STAT_KEYS: readonly StatKey[] = ["speed", "stamina", "power", "guts", "wit"] as const

/** Maps a `statPrioritization` display label ("Speed", "Wit", ...) to the canonical stat key. */
const LABEL_TO_STAT: Record<string, StatKey> = {
    speed: "speed",
    stamina: "stamina",
    power: "power",
    guts: "guts",
    wit: "wit",
}

/** Final stats as persisted in a career run record. */
export interface CareerRunStats {
    speed: number
    stamina: number
    power: number
    guts: number
    wit: number
}

/** A single race result in a career run record (distance is not persisted, so it is optional/enriched). */
export interface CareerRunRaceRecord {
    name: string
    classYear: string
    turnNumber: number
    won: boolean
}

/** Subset of a CareerRunArchive.kt record the tuner reads. */
export interface CareerRunRecord {
    id: string
    scenario: string
    traineeName: string
    careerRank: string
    raceWins: number
    raceLosses: number
    raceRecords: CareerRunRaceRecord[]
    skillPoints: number
    stats: CareerRunStats
}

/** Focused view of the preset the run used. Callers adapt the full Settings object into this. */
export interface AutoTuneSettingsInput {
    /** Priority order as display labels, highest priority first, e.g. ["Speed","Power","Wit","Guts","Stamina"]. */
    statPrioritization: string[]
    /** Resolved active distance whose target block was in effect. */
    preferredDistance: DistanceKey
    /** The active distance's per-stat targets. */
    targets: Record<StatKey, number>
    /** The `training.maximumFailureChance` in effect. */
    maximumFailureChance: number
    /** Skill points above which leftover SP is flagged as under-spent. Defaults to 300. */
    unspentSpThreshold?: number
}

export type AutoTuneSeverity = "high" | "medium" | "low"

/** A one-tap-appliable settings patch: nested `category -> key -> value`. */
export interface AutoTunePatch {
    category: string
    key: string
    value: number | string
}

export interface AutoTuneSuggestion {
    id: string
    severity: AutoTuneSeverity
    title: string
    detail: string
    /** Present when the suggestion can be applied directly; absent for advisory-only findings. */
    patch?: AutoTunePatch
}

/** Settings key fragment for a distance's target block, e.g. Sprint -> "trainingSprintStatTarget". */
const distanceTargetPrefix = (distance: DistanceKey): string => `training${distance}StatTarget`

/** Settings key for a given distance+stat target, e.g. (Sprint, power) -> "trainingSprintStatTarget_powerStatTarget". */
export const targetSettingKey = (distance: DistanceKey, stat: StatKey): string => `${distanceTargetPrefix(distance)}_${stat}StatTarget`

/** Resolves the priority index (0 = highest) of a stat, or a large number when it is absent from the list. */
const priorityIndexOf = (stat: StatKey, priorities: StatKey[]): number => {
    const idx = priorities.indexOf(stat)
    return idx === -1 ? priorities.length : idx
}

/** Normalizes the display-label priority list into canonical stat keys, dropping anything unrecognized. */
const normalizePriorities = (labels: string[]): StatKey[] =>
    labels.map((l) => LABEL_TO_STAT[l.trim().toLowerCase()]).filter((s): s is StatKey => s !== undefined)

const STAT_DISPLAY: Record<StatKey, string> = { speed: "Speed", stamina: "Stamina", power: "Power", guts: "Guts", wit: "Wit" }

/** Round to a "nice" target number (nearest 50) so applied suggestions read cleanly. */
const roundTarget = (value: number): number => Math.max(0, Math.round(value / 50) * 50)

// Tuning constants. Chosen to match the judgement calls made during manual analysis; adjustable in one place.
const INVERSION_MARGIN = 60 // a lower-priority stat beating a higher-priority one by this much is a real inversion, not noise.
const OVERSHOOT_RATIO = 1.2 // a stat finishing >= 1.2x its target overshot.
const UNDERSHOOT_RATIO = 0.85 // the top-priority stat finishing < 0.85x its target fell short.
const HIGH_FAILURE_CAP = 15 // below this the cap is strict enough to skip viable late-game boards.
const LOSS_RATE_FLAG = 0.2 // more than a fifth of races lost is worth surfacing.

/**
 * Analyzes a completed career run against the preset that produced it and returns improvement suggestions, most severe first.
 *
 * @param run The completed career run record.
 * @param settings The focused preset view the run used.
 * @returns Ranked suggestions; empty when the run looks well-tuned.
 */
export function analyzeCareerRun(run: CareerRunRecord, settings: AutoTuneSettingsInput): AutoTuneSuggestion[] {
    const priorities = normalizePriorities(settings.statPrioritization)
    const suggestions: AutoTuneSuggestion[] = []
    const stat = (k: StatKey): number => run.stats[k] ?? 0
    const target = (k: StatKey): number => settings.targets[k] ?? 0

    // Rule 1 — priority inversion: a lower-priority stat finished materially above a higher-priority one. Lower the
    // over-shooting stat's target so it completes earlier and its turns redirect to the higher-priority stat next run.
    // Report only the single most significant inversion to avoid a cascade of overlapping advice.
    // A deprioritized stat that overshot its own target is race-driven bloat, not a training-target problem: lowering its
    // (already low) target cannot fix it, so exclude it from the inversion rule and let Rule 2 point at the race scheduler.
    const isDeprioritizedBloat = (k: StatKey): boolean => priorityIndexOf(k, priorities) > 1 && target(k) > 0 && stat(k) >= target(k) * OVERSHOOT_RATIO

    let worstInversion: { high: StatKey; low: StatKey; gap: number } | null = null
    for (const high of priorities) {
        for (const low of priorities) {
            if (priorityIndexOf(low, priorities) <= priorityIndexOf(high, priorities)) continue
            if (target(low) <= 0) continue
            if (isDeprioritizedBloat(low)) continue
            const gap = stat(low) - stat(high)
            if (gap >= INVERSION_MARGIN && (worstInversion === null || gap > worstInversion.gap)) {
                worstInversion = { high, low, gap }
            }
        }
    }
    if (worstInversion) {
        const { high, low, gap } = worstInversion
        // Aim the lower-priority stat's target just under the higher-priority stat's final so it stops out-competing it.
        const suggested = roundTarget(Math.min(target(low), stat(high) - 50))
        suggestions.push({
            id: `inversion-${low}-over-${high}`,
            severity: "high",
            title: `${STAT_DISPLAY[low]} overshot higher-priority ${STAT_DISPLAY[high]} by ${gap}`,
            detail:
                `${STAT_DISPLAY[low]} finished ${stat(low)} vs ${STAT_DISPLAY[high]} at ${stat(high)}, but ${STAT_DISPLAY[high]} is the higher priority. ` +
                `Lowering the ${STAT_DISPLAY[low]} target to ${suggested} makes it complete earlier so those turns go to ${STAT_DISPLAY[high]}.`,
            patch:
                suggested < target(low) ? { category: "trainingStatTarget", key: targetSettingKey(settings.preferredDistance, low), value: suggested } : undefined,
        })
    }

    // Rule 2 — overshoot: a stat finished well above its target. If it is an actively-trained top-priority stat, the target is
    // too high (lower it). If it is a deprioritized stat, the excess is almost certainly off-distance racing, not training, so
    // point at the race scheduler instead of the target.
    for (const k of STAT_KEYS) {
        if (target(k) <= 0 || stat(k) < target(k) * OVERSHOOT_RATIO) continue
        if (worstInversion && worstInversion.low === k) continue // already covered by the inversion suggestion
        const idx = priorityIndexOf(k, priorities)
        const overshoot = stat(k) - target(k)
        if (idx <= 1) {
            const suggested = roundTarget(stat(k) - 50)
            suggestions.push({
                id: `overshoot-trained-${k}`,
                severity: "medium",
                title: `${STAT_DISPLAY[k]} finished ${overshoot} over its target`,
                detail: `${STAT_DISPLAY[k]} reached ${stat(k)} against a target of ${target(k)}. Raising the target to ${suggested} lets the bot keep investing the surplus turns here instead of capping out early.`,
                patch: { category: "trainingStatTarget", key: targetSettingKey(settings.preferredDistance, k), value: suggested },
            })
        } else {
            suggestions.push({
                id: `overshoot-bloat-${k}`,
                severity: "medium",
                title: `${STAT_DISPLAY[k]} bloated ${overshoot} past its target`,
                detail:
                    `${STAT_DISPLAY[k]} finished ${stat(k)} against a target of only ${target(k)}, yet it is a low-priority stat. ` +
                    `This is almost always off-distance racing padding it. Tighten the Smart Race Solver aptitude threshold (e.g. to A) so it stops taking races outside your distance.`,
            })
        }
    }

    // Rule 3 — undershoot on the top priority stat: it never reached target. Surface it and point at freeing turns from
    // lower-priority stats (which Rules 1/2 may already be doing).
    const topStat = priorities[0]
    if (topStat && target(topStat) > 0 && stat(topStat) < target(topStat) * UNDERSHOOT_RATIO) {
        const short = target(topStat) - stat(topStat)
        suggestions.push({
            id: `undershoot-${topStat}`,
            severity: "high",
            title: `Top-priority ${STAT_DISPLAY[topStat]} fell ${short} short of target`,
            detail: `${STAT_DISPLAY[topStat]} finished ${stat(topStat)} against a ${target(topStat)} target. Lower the targets of your other stats so more turns fund ${STAT_DISPLAY[topStat]}, or borrow a ${STAT_DISPLAY[topStat]} support card.`,
        })
    }

    // Rule 4 — over-strict failure cap. A low cap silently skips viable late-game boards (which read 15-30% failure), costing
    // training turns and forcing rests. Recommend nudging it up.
    if (settings.maximumFailureChance < HIGH_FAILURE_CAP) {
        suggestions.push({
            id: "failure-cap-strict",
            severity: "medium",
            title: `Max failure chance ${settings.maximumFailureChance}% is strict`,
            detail: `Late-game boards routinely read 15-25% failure; a ${settings.maximumFailureChance}% cap skips them and rests instead. Raising it to 18% recovers those turns with little real risk.`,
            patch: { category: "training", key: "maximumFailureChance", value: 18 },
        })
    }

    // Rule 5 — unspent skill points at the wire. SP left over is a skill you didn't buy.
    const spThreshold = settings.unspentSpThreshold ?? 300
    if (run.skillPoints > spThreshold) {
        suggestions.push({
            id: "unspent-sp",
            severity: "low",
            title: `${run.skillPoints} skill points left unspent`,
            detail: `The career ended with ${run.skillPoints} SP unused. Add more skill IDs to your career-complete plan, or relax the skill exclusions, so that SP converts into rank.`,
        })
    }

    // Rule 6 — high loss rate. Advisory: correlate with Rules 1/2 (off-distance racing) rather than prescribing a fix.
    const totalRaces = run.raceWins + run.raceLosses
    if (totalRaces > 0 && run.raceLosses / totalRaces > LOSS_RATE_FLAG) {
        suggestions.push({
            id: "high-loss-rate",
            severity: "low",
            title: `${run.raceLosses} of ${totalRaces} races lost`,
            detail: `A ${Math.round((run.raceLosses / totalRaces) * 100)}% loss rate usually means racing outside your distance/surface aptitude. Tighten the solver aptitude threshold so it only enters races you can win.`,
        })
    }

    const order: Record<AutoTuneSeverity, number> = { high: 0, medium: 1, low: 2 }
    return suggestions.sort((a, b) => order[a.severity] - order[b.severity])
}

/**
 * Extracts the active-distance target block from a full `trainingStatTarget` settings slice into the flat map the tuner reads.
 *
 * @param trainingStatTarget The full settings.trainingStatTarget object (flat `training<Distance>StatTarget_<stat>StatTarget` keys).
 * @param distance The active distance.
 * @returns Per-stat targets for that distance (missing keys default to 0).
 */
export function activeTargetsForDistance(trainingStatTarget: Record<string, number>, distance: DistanceKey): Record<StatKey, number> {
    const out = {} as Record<StatKey, number>
    for (const k of STAT_KEYS) {
        out[k] = trainingStatTarget[targetSettingKey(distance, k)] ?? 0
    }
    return out
}
