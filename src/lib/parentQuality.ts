import type { ParentRunArchiveEntry } from "./parentRunArchive"
import type { ParentRunSparkPick } from "./parentRunArchive"

export interface ParentQualityBreakdown {
    epithetScore: number
    fanScore: number
    forcedScore: number
    raceScore: number
    sparkScore: number
    bonusScore: number
    total: number
}

export type ParentQualityGrade = "S" | "A" | "B" | "C" | "D"

export interface ParentQualityResult {
    score: number
    grade: ParentQualityGrade
    breakdown: ParentQualityBreakdown
}

export interface ParentQualityInput {
    targetEpithets: string[]
    forcedEpithets?: string[]
    completedTargetEpithets: string[]
    incompleteTargetEpithets: string[]
    extraCompletedEpithets: string[]
    fans: number
    minimumFanTarget: number
    raceWins: number
    raceLosses: number
    sparkPicks?: ParentRunSparkPick[]
    sparkStrategy?: string
}

const SPARK_HINT_KEYWORDS = ["hint", "skill", "white", "unique", "factor", "golden", "gold"]

/** Scores inheritance spark picks (0–5) based on strategy alignment and hint/factor signals. */
export const scoreSparkPicks = (sparkPicks: ParentRunSparkPick[] | undefined, sparkStrategy?: string): number => {
    if (!sparkPicks || sparkPicks.length === 0) return 2.5

    let total = 0
    for (const pick of sparkPicks) {
        const text = pick.optionTexts[pick.pickIndex]?.toLowerCase() ?? ""
        let pickScore = 1.0
        const hasHintSignal = SPARK_HINT_KEYWORDS.some((keyword) => text.includes(keyword))
        if (sparkStrategy === "SkillHints" && hasHintSignal) pickScore += 2.5
        else if (sparkStrategy === "Balanced" && hasHintSignal) pickScore += 1.5
        else if (sparkStrategy === "StatAndAptitude" && hasHintSignal) pickScore += 0.75
        if (/%/.test(text)) pickScore += 0.5
        total += pickScore
    }

    const average = total / sparkPicks.length
    return Math.min(5, Math.max(0, average))
}

const DEFAULT_FAN_BENCHMARK = 120_000

const allCompletedEpithets = (input: ParentQualityInput): Set<string> =>
    new Set([...input.completedTargetEpithets, ...input.extraCompletedEpithets])

/** Maps a 0–100 score to a letter grade for parent-run comparison. */
export const gradeFromScore = (score: number): ParentQualityGrade => {
    if (score >= 90) return "S"
    if (score >= 80) return "A"
    if (score >= 70) return "B"
    if (score >= 60) return "C"
    return "D"
}

/**
 * Composite parent quality score (0–100) weighting epithets, fans, forced routes, race efficiency, sparks, and extras.
 */
export const scoreParentRun = (input: ParentQualityInput): ParentQualityResult => {
    const targetCount = Math.max(1, input.targetEpithets.length)
    const epithetScore = (input.completedTargetEpithets.length / targetCount) * 35

    const fanFloor = input.minimumFanTarget > 0 ? input.minimumFanTarget : DEFAULT_FAN_BENCHMARK
    const fanScore = Math.min(1, input.fans / fanFloor) * 25

    const forced = input.forcedEpithets ?? []
    const completed = allCompletedEpithets(input)
    const forcedScore =
        forced.length === 0
            ? 20
            : (forced.filter((name) => completed.has(name)).length / forced.length) * 20

    const totalRaces = input.raceWins + input.raceLosses
    const raceScore = totalRaces > 0 ? (input.raceWins / totalRaces) * 10 : 5

    const sparkScore = scoreSparkPicks(input.sparkPicks, input.sparkStrategy)
    const bonusScore = Math.min(5, input.extraCompletedEpithets.length)

    const total = Math.round(epithetScore + fanScore + forcedScore + raceScore + sparkScore + bonusScore)
    const score = Math.min(100, Math.max(0, total))

    return {
        score,
        grade: gradeFromScore(score),
        breakdown: {
            epithetScore: Math.round(epithetScore * 10) / 10,
            fanScore: Math.round(fanScore * 10) / 10,
            forcedScore: Math.round(forcedScore * 10) / 10,
            raceScore: Math.round(raceScore * 10) / 10,
            sparkScore: Math.round(sparkScore * 10) / 10,
            bonusScore: Math.round(bonusScore * 10) / 10,
            total: score,
        },
    }
}

export const scoreParentRunArchiveEntry = (entry: ParentRunArchiveEntry): ParentQualityResult => {
    if (typeof entry.qualityScore === "number" && entry.qualityGrade) {
        return {
            score: entry.qualityScore,
            grade: entry.qualityGrade,
            breakdown: entry.qualityBreakdown ?? {
                epithetScore: 0,
                fanScore: 0,
                forcedScore: 0,
                raceScore: 0,
                sparkScore: 0,
                bonusScore: 0,
                total: entry.qualityScore,
            },
        }
    }

    return scoreParentRun({
        targetEpithets: entry.targetEpithets,
        forcedEpithets: entry.forcedEpithets,
        completedTargetEpithets: entry.completedTargetEpithets,
        incompleteTargetEpithets: entry.incompleteTargetEpithets,
        extraCompletedEpithets: entry.extraCompletedEpithets,
        fans: entry.fans,
        minimumFanTarget: entry.minimumFanTarget,
        raceWins: entry.raceWins,
        raceLosses: entry.raceLosses,
        sparkPicks: entry.sparkPicks,
        sparkStrategy: entry.sparkStrategy,
    })
}

export const formatQualityLabel = (result: ParentQualityResult): string => `${result.grade} · ${result.score}/100`

export const formatEpithetDelta = (current: ParentRunArchiveEntry, previous: ParentRunArchiveEntry): string | null => {
    const gained = current.completedTargetEpithets.filter((name) => !previous.completedTargetEpithets.includes(name))
    const lost = previous.completedTargetEpithets.filter((name) => !current.completedTargetEpithets.includes(name))
    if (gained.length === 0 && lost.length === 0) return null
    const parts: string[] = []
    if (gained.length > 0) parts.push(`+${gained.join(", ")}`)
    if (lost.length > 0) parts.push(`−${lost.join(", ")}`)
    return parts.join(" · ")
}

/** Best-scoring run for a character preset key (trainee name fallback). */
export const findBestRunForCharacter = (
    runs: ParentRunArchiveEntry[],
    characterKey: string,
): ParentRunArchiveEntry | null => {
    const matches = runs.filter((run) => (run.characterPreset || run.traineeName) === characterKey)
    if (matches.length === 0) return null
    return matches.reduce((best, run) => {
        const bestScore = scoreParentRunArchiveEntry(best).score
        const runScore = scoreParentRunArchiveEntry(run).score
        return runScore > bestScore ? run : best
    })
}

export const rankRunsByQuality = (runs: ParentRunArchiveEntry[]): ParentRunArchiveEntry[] =>
    [...runs].sort((left, right) => scoreParentRunArchiveEntry(right).score - scoreParentRunArchiveEntry(left).score)
