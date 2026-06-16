import type { ParentRunArchiveEntry } from "./parentRunArchive"

export interface ParentQualityBreakdown {
    epithetScore: number
    fanScore: number
    forcedScore: number
    raceScore: number
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
 * Composite parent quality score (0–100) weighting epithets, fans, forced routes, race efficiency, and extras.
 */
export const scoreParentRun = (input: ParentQualityInput): ParentQualityResult => {
    const targetCount = Math.max(1, input.targetEpithets.length)
    const epithetScore = (input.completedTargetEpithets.length / targetCount) * 40

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

    const bonusScore = Math.min(5, input.extraCompletedEpithets.length)

    const total = Math.round(epithetScore + fanScore + forcedScore + raceScore + bonusScore)
    const score = Math.min(100, Math.max(0, total))

    return {
        score,
        grade: gradeFromScore(score),
        breakdown: {
            epithetScore: Math.round(epithetScore * 10) / 10,
            fanScore: Math.round(fanScore * 10) / 10,
            forcedScore: Math.round(forcedScore * 10) / 10,
            raceScore: Math.round(raceScore * 10) / 10,
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
