import { STAT_KEYS, type StatKey } from "./careerAutoTune"

/**
 * Cross-run meta-tuner. Where the single-run auto-tuner (`analyzeCareerRun`) critiques one career against its preset, this aggregates the whole career-run archive to surface
 * patterns only visible across many runs: which stat actually drives your final rank, what your best runs do differently, which races you keep losing, whether you are trending
 * up, and how consistent the build is. Every insight requires a minimum sample so a handful of runs cannot manufacture noise. Pure and dependency-free (aside from the shared
 * `StatKey` list) so it runs under jest and in the app unchanged.
 */

const STAT_DISPLAY: Record<StatKey, string> = { speed: "Speed", stamina: "Stamina", power: "Power", guts: "Guts", wit: "Wit" }

/** A single archived run, reduced to the fields the meta-analysis needs. Map an archive entry into this shape at the call site. */
export interface MetaRunInput {
    /** Completion timestamp (ms), used to order runs for the trend line. */
    completedAtMs: number
    scenario: string
    /** Numeric career rating (the value behind the letter rank); the primary outcome variable. */
    careerRating: number
    careerRank: string
    stats: Record<StatKey, number>
    raceRecords: { name: string; won: boolean }[]
}

export type MetaTuneSeverity = "high" | "medium" | "low"

/**
 * One cross-run finding.
 *
 * @property id Stable kind identifier (e.g. `stat-driver`, `race-loss-hotspot`).
 * @property severity Rough importance for sorting/display.
 * @property title One-line headline.
 * @property detail The evidence behind it, in plain language.
 * @property stat The stat the finding concerns, when applicable.
 * @property metric The key number behind the finding (correlation, delta, loss rate…), for display/testing.
 */
export interface MetaTuneInsight {
    id: string
    severity: MetaTuneSeverity
    title: string
    detail: string
    stat?: StatKey
    metric?: number
}

const MIN_RUNS_TREND = 4
const MIN_RUNS_CORRELATION = 5
const MIN_RUNS_ARCHETYPE = 6
const MIN_RACE_APPEARANCES = 3

const mean = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length)

const stdDev = (xs: number[]): number => {
    if (xs.length < 2) return 0
    const m = mean(xs)
    return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)))
}

/** Pearson correlation of two equal-length series. Returns 0 when either series has no variance (undefined correlation). */
const pearson = (xs: number[], ys: number[]): number => {
    const n = xs.length
    if (n < 2 || ys.length !== n) return 0
    const mx = mean(xs)
    const my = mean(ys)
    let cov = 0
    let vx = 0
    let vy = 0
    for (let i = 0; i < n; i++) {
        const dx = xs[i] - mx
        const dy = ys[i] - my
        cov += dx * dy
        vx += dx * dx
        vy += dy * dy
    }
    if (vx === 0 || vy === 0) return 0
    return cov / Math.sqrt(vx * vy)
}

/** Least-squares slope of a series against its index (0..n-1). */
const slopeOverIndex = (ys: number[]): number => {
    const n = ys.length
    if (n < 2) return 0
    const xs = ys.map((_, i) => i)
    const mx = mean(xs)
    const my = mean(ys)
    let cov = 0
    let vx = 0
    for (let i = 0; i < n; i++) {
        cov += (xs[i] - mx) * (ys[i] - my)
        vx += (xs[i] - mx) ** 2
    }
    return vx === 0 ? 0 : cov / vx
}

const round = (n: number): number => Math.round(n * 100) / 100

/**
 * Analyze a set of archived runs and return cross-run insights, most severe first. Optionally scope to a single scenario so patterns are not blurred across different cups.
 *
 * @param runs The archived runs to aggregate.
 * @param options.scenario When set, only runs of this scenario are considered.
 * @returns Insights ordered high→low severity; empty when there are too few runs to say anything.
 */
export function analyzeCareerRuns(runs: MetaRunInput[], options: { scenario?: string } = {}): MetaTuneInsight[] {
    const scoped = options.scenario ? runs.filter((r) => r.scenario === options.scenario) : runs
    // Order oldest→newest for the trend line.
    const ordered = [...scoped].sort((a, b) => a.completedAtMs - b.completedAtMs)
    const insights: MetaTuneInsight[] = []

    const ratings = ordered.map((r) => r.careerRating)

    // --- Rating trend ---
    if (ordered.length >= MIN_RUNS_TREND) {
        const slope = slopeOverIndex(ratings)
        const spread = mean(ratings) === 0 ? 0 : Math.abs(slope) / mean(ratings)
        if (spread >= 0.02) {
            const improving = slope > 0
            insights.push({
                id: "rating-trend",
                severity: "low",
                title: improving ? "Your runs are trending up" : "Your runs are trending down",
                detail: `Career rating is moving about ${round(slope)} per run across your last ${ordered.length} ${options.scenario ?? ""} runs.`.replace("  ", " "),
                metric: round(slope),
            })
        }
    }

    // --- Which stat drives rank, and which is over-invested ---
    if (ordered.length >= MIN_RUNS_CORRELATION) {
        const correlations = STAT_KEYS.map((k) => ({ stat: k, r: pearson(ordered.map((run) => run.stats[k] ?? 0), ratings), avg: mean(ordered.map((run) => run.stats[k] ?? 0)) }))
        const driver = [...correlations].sort((a, b) => b.r - a.r)[0]
        if (driver && driver.r >= 0.5) {
            insights.push({
                id: "stat-driver",
                severity: "medium",
                title: `${STAT_DISPLAY[driver.stat]} is driving your rank`,
                detail: `Across ${ordered.length} runs, higher ${STAT_DISPLAY[driver.stat]} tracks with a higher final rating (r=${round(driver.r)}). Prioritizing it should raise your ceiling.`,
                stat: driver.stat,
                metric: round(driver.r),
            })
        }
        // The highest-average stat that barely correlates with rating is a candidate for over-investment.
        const highest = [...correlations].sort((a, b) => b.avg - a.avg)[0]
        if (highest && highest.r < 0.2 && highest.avg > 0) {
            insights.push({
                id: "stat-over-invested",
                severity: "medium",
                title: `${STAT_DISPLAY[highest.stat]} may be over-invested`,
                detail: `${STAT_DISPLAY[highest.stat]} is your highest stat on average (${Math.round(highest.avg)}) but shows little link to your final rating (r=${round(highest.r)}). Consider lowering its target and redirecting the training.`,
                stat: highest.stat,
                metric: round(highest.r),
            })
        }
    }

    // --- What the best runs do differently ---
    if (ordered.length >= MIN_RUNS_ARCHETYPE) {
        const byRating = [...ordered].sort((a, b) => b.careerRating - a.careerRating)
        const third = Math.max(1, Math.floor(byRating.length / 3))
        const top = byRating.slice(0, third)
        const bottom = byRating.slice(-third)
        let best: { stat: StatKey; delta: number } | null = null
        for (const k of STAT_KEYS) {
            const delta = mean(top.map((r) => r.stats[k] ?? 0)) - mean(bottom.map((r) => r.stats[k] ?? 0))
            if (best === null || delta > best.delta) best = { stat: k, delta }
        }
        if (best && best.delta >= 80) {
            insights.push({
                id: "best-run-archetype",
                severity: "high",
                title: `Your best runs carry more ${STAT_DISPLAY[best.stat]}`,
                detail: `Your top runs average about ${Math.round(best.delta)} more ${STAT_DISPLAY[best.stat]} than your worst. Nudging its target up is the clearest lever on your results.`,
                stat: best.stat,
                metric: Math.round(best.delta),
            })
        }
    }

    // --- Races you keep losing ---
    const raceAgg = new Map<string, { appears: number; losses: number }>()
    for (const run of scoped) {
        for (const rec of run.raceRecords) {
            if (!rec.name) continue
            const cur = raceAgg.get(rec.name) ?? { appears: 0, losses: 0 }
            cur.appears += 1
            if (!rec.won) cur.losses += 1
            raceAgg.set(rec.name, cur)
        }
    }
    for (const [name, { appears, losses }] of raceAgg) {
        if (appears >= MIN_RACE_APPEARANCES && losses / appears >= 0.5) {
            insights.push({
                id: "race-loss-hotspot",
                severity: "high",
                title: `You keep losing ${name}`,
                detail: `Lost ${losses} of ${appears} appearances at ${name}. Target the stats/skills for that race's distance and grade, or drop it from the schedule.`,
                metric: round(losses / appears),
            })
        }
    }

    // --- Consistency ---
    if (ordered.length >= MIN_RUNS_TREND) {
        const m = mean(ratings)
        const cv = m === 0 ? 0 : stdDev(ratings) / m
        if (cv >= 0.15) {
            insights.push({
                id: "consistency",
                severity: "medium",
                title: "Your results are inconsistent",
                detail: `Rating swings about ±${Math.round(stdDev(ratings))} around ${Math.round(m)} run to run (CV ${round(cv)}). A fragile build or shaky race execution is the usual cause.`,
                metric: round(cv),
            })
        }
    }

    const order: Record<MetaTuneSeverity, number> = { high: 0, medium: 1, low: 2 }
    return insights.sort((a, b) => order[a.severity] - order[b.severity])
}
