/**
 * Champions Meeting result correlator.
 *
 * Cross-Run Insights already tells you what raises your *career rank*. But a Champions Meeting is a
 * different game — it is stat- and matchup-driven PvP, and a run that finishes A+ can still lose in the
 * bracket. This module logs your CM results and correlates them with the stats you brought, so you can
 * see what actually wins CMs rather than what looks good on the career screen.
 *
 * Everything here is pure and evidence-gated: with too few CM entries it stays silent rather than
 * inventing a pattern from noise.
 */

import type { StatKey } from "./careerAutoTune"

const STAT_KEYS: StatKey[] = ["speed", "stamina", "power", "guts", "wit"]

/** One recorded Champions Meeting entry. */
export interface CmResultRecord {
    /** Epoch millis the CM finished, for recency ordering. */
    completedAtMs: number
    /** The CM preset id, e.g. "cm16_leo_2". Used to scope the analysis to one meeting. */
    cmId: string
    /** The trainee's five stats going into the CM. */
    stats: Record<StatKey, number>
    /** Bracket rounds won. */
    roundsWon: number
    /** Bracket rounds played (>= roundsWon, > 0). Records with a non-positive value are ignored. */
    roundsPlayed: number
}

/** A single correlation/summary finding about your CM performance. */
export interface CmInsight {
    /** Stable kind identifier (e.g. `cm-win-rate`, `cm-stat-driver`, `cm-win-margin`). */
    id: string
    /** Short human-readable headline. */
    title: string
    /** One-line explanation with the numbers behind it. */
    detail: string
    /** The key number behind the finding (rate, correlation, delta…), for display/testing. */
    metric: number
}

/** Tuning for {@link analyzeCmResults}. */
export interface CmAnalyzeOptions {
    /** Restrict the analysis to a single CM preset id. When omitted, all records are pooled. */
    cmId?: string
    /** Minimum CM entries required before any correlation is emitted. Defaults to 5. */
    minRecords?: number
}

const DEFAULT_MIN_RECORDS = 5

const round = (n: number): number => Math.round(n * 1000) / 1000

const mean = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length)

/** Pearson correlation of two equal-length series, or 0 when either has no variance. */
const pearson = (xs: number[], ys: number[]): number => {
    const n = xs.length
    if (n < 2) return 0
    const mx = mean(xs)
    const my = mean(ys)
    let sxy = 0
    let sxx = 0
    let syy = 0
    for (let i = 0; i < n; i++) {
        const dx = xs[i] - mx
        const dy = ys[i] - my
        sxy += dx * dy
        sxx += dx * dx
        syy += dy * dy
    }
    if (sxx === 0 || syy === 0) return 0
    return sxy / Math.sqrt(sxx * syy)
}

const STAT_LABEL: Record<StatKey, string> = {
    speed: "Speed",
    stamina: "Stamina",
    power: "Power",
    guts: "Guts",
    wit: "Wit",
}

/**
 * Correlates logged Champions Meeting results with the stats brought to them.
 *
 * @param records The CM results across your runs.
 * @param options Optional CM-id scoping and minimum-sample threshold.
 * @returns Insights, most useful first. Empty when there are fewer than the minimum valid records.
 */
export function analyzeCmResults(records: CmResultRecord[], options: CmAnalyzeOptions = {}): CmInsight[] {
    const minRecords = Math.max(2, options.minRecords ?? DEFAULT_MIN_RECORDS)

    const valid = records.filter((r) => r.roundsPlayed > 0 && r.roundsWon >= 0 && r.roundsWon <= r.roundsPlayed && (options.cmId === undefined || r.cmId === options.cmId))
    if (valid.length < minRecords) return []

    const insights: CmInsight[] = []
    const winRates = valid.map((r) => r.roundsWon / r.roundsPlayed)

    // Overall win rate across the bracket rounds.
    const overall = mean(winRates)
    insights.push({
        id: "cm-win-rate",
        title: `Champions Meeting round win rate: ${Math.round(overall * 100)}%`,
        detail: `Won ${valid.reduce((a, r) => a + r.roundsWon, 0)} of ${valid.reduce((a, r) => a + r.roundsPlayed, 0)} bracket rounds across ${valid.length} entries.`,
        metric: round(overall),
    })

    // Which stat most correlates with winning rounds.
    let bestStat: StatKey | null = null
    let bestAbs = 0
    let bestCorr = 0
    for (const stat of STAT_KEYS) {
        const corr = pearson(
            valid.map((r) => r.stats[stat]),
            winRates,
        )
        if (Math.abs(corr) > bestAbs) {
            bestAbs = Math.abs(corr)
            bestStat = stat
            bestCorr = corr
        }
    }
    if (bestStat && bestAbs >= 0.3) {
        const dir = bestCorr > 0 ? "more" : "less"
        insights.push({
            id: "cm-stat-driver",
            title: `${STAT_LABEL[bestStat]} tracks your CM results most`,
            detail: `Entries with ${dir} ${STAT_LABEL[bestStat]} won more rounds (correlation ${round(bestCorr)}). Bias the build toward it for this meeting.`,
            metric: round(bestCorr),
        })
    }

    // How much more of the driving stat your winning entries carried vs your losing ones.
    const wins = valid.filter((r) => r.roundsWon / r.roundsPlayed >= 0.5)
    const losses = valid.filter((r) => r.roundsWon / r.roundsPlayed < 0.5)
    if (bestStat && wins.length >= 2 && losses.length >= 2) {
        const delta = mean(wins.map((r) => r.stats[bestStat!])) - mean(losses.map((r) => r.stats[bestStat!]))
        if (Math.abs(delta) >= 20) {
            insights.push({
                id: "cm-win-margin",
                title: `Winning entries carried ${Math.abs(Math.round(delta))} ${delta >= 0 ? "more" : "less"} ${STAT_LABEL[bestStat]}`,
                detail: `Your winning CM entries averaged ${Math.round(mean(wins.map((r) => r.stats[bestStat!])))} ${STAT_LABEL[bestStat]} vs ${Math.round(mean(losses.map((r) => r.stats[bestStat!])))} in losses.`,
                metric: round(delta),
            })
        }
    }

    return insights
}
