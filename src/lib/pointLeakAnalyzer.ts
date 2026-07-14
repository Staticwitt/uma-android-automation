/**
 * Post-run point-leak analyzer.
 *
 * The live decision explainer shows, turn by turn, what the bot picked and how each option scored. This
 * module turns a completed run's decision log into a retrospective: for every turn where the chosen
 * action scored below the best option available, it records the gap ("leak"), then ranks the turns and
 * summarizes where the run bled the most value — so you can see whether a run underperformed because of
 * a few bad turns or a systemic pattern (always resting through rainbows, always training a capped stat).
 *
 * Pure and self-contained: it reasons only over the per-turn scores the decision log already carries.
 */

/** One turn's decision, as recorded by the live decision feed. */
export interface TurnDecisionRecord {
    /** Career turn (1-indexed). */
    turn: number
    /** The action actually taken, e.g. "Train Speed", "Rest", "Race". */
    chosenAction: string
    /** The score of the chosen action under the bot's scoring at that turn. */
    chosenValue: number
    /** The score of the best option that turn (>= chosenValue in a well-behaved log). */
    bestAvailableValue: number
    /** The label of that best option, when it differs from the chosen action. */
    bestAction?: string
    /** Optional category for the leak, e.g. "rested-through-rainbow", "trained-capped-stat". */
    category?: string
}

/** A single turn where value was left on the table. */
export interface PointLeak {
    /** The turn the leak happened on. */
    turn: number
    /** How much score was lost: bestAvailableValue - chosenValue, floored at 0. */
    delta: number
    /** What was taken. */
    chosenAction: string
    /** What would have scored higher. */
    bestAction?: string
    /** The leak category, when the log tagged one. */
    category?: string
}

/** A category rollup across the run. */
export interface LeakCategorySummary {
    /** The category label (or "uncategorized"). */
    category: string
    /** Total score lost to this category. */
    totalDelta: number
    /** How many turns fell into it. */
    turns: number
}

/** The full retrospective. */
export interface PointLeakReport {
    /** Total score left on the table across the whole run. */
    totalLeak: number
    /** The worst turns, largest leak first, capped to the requested count. */
    topLeaks: PointLeak[]
    /** Per-category rollup, largest total first — surfaces systemic patterns. */
    byCategory: LeakCategorySummary[]
    /** The single dominant category, or null when nothing leaked. */
    dominantCategory: string | null
}

/** Tuning for {@link analyzePointLeaks}. */
export interface PointLeakOptions {
    /** Ignore leaks smaller than this (scoring noise). Defaults to 1. */
    minLeak?: number
    /** How many worst turns to keep in `topLeaks`. Defaults to 10. */
    topN?: number
}

const round = (n: number): number => Math.round(n * 1000) / 1000

/**
 * Builds a leak retrospective from a run's per-turn decision log.
 *
 * @param records The per-turn decisions with their chosen and best-available scores.
 * @param options Minimum leak to count and how many worst turns to keep.
 * @returns The total leak, worst turns, and per-category rollup.
 */
export function analyzePointLeaks(records: TurnDecisionRecord[], options: PointLeakOptions = {}): PointLeakReport {
    const minLeak = Math.max(0, options.minLeak ?? 1)
    const topN = Math.max(1, options.topN ?? 10)

    const leaks: PointLeak[] = []
    for (const r of records) {
        const delta = r.bestAvailableValue - r.chosenValue
        if (delta < minLeak) continue
        leaks.push({
            turn: r.turn,
            delta: round(delta),
            chosenAction: r.chosenAction,
            bestAction: r.bestAction,
            category: r.category,
        })
    }

    const totalLeak = round(leaks.reduce((a, l) => a + l.delta, 0))

    const catAgg = new Map<string, { totalDelta: number; turns: number }>()
    for (const l of leaks) {
        const cat = l.category ?? "uncategorized"
        const cur = catAgg.get(cat) ?? { totalDelta: 0, turns: 0 }
        cur.totalDelta += l.delta
        cur.turns += 1
        catAgg.set(cat, cur)
    }
    const byCategory: LeakCategorySummary[] = [...catAgg.entries()]
        .map(([category, { totalDelta, turns }]) => ({ category, totalDelta: round(totalDelta), turns }))
        .sort((a, b) => b.totalDelta - a.totalDelta || a.category.localeCompare(b.category))

    const topLeaks = [...leaks].sort((a, b) => b.delta - a.delta || a.turn - b.turn).slice(0, topN)

    return {
        totalLeak,
        topLeaks,
        byCategory,
        dominantCategory: byCategory.length > 0 ? byCategory[0].category : null,
    }
}
