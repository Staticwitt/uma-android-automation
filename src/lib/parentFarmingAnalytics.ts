import type { ParentRunArchiveEntry } from "./parentRunArchive"
import { scoreParentRunArchiveEntry } from "./parentQuality"

export interface ParentAnalyticsProfileRow {
    profileName: string
    runCount: number
    avgQuality: number
    bestQuality: number
    bestGrade: string
    lastRunAtMs: number
    topCharacter: string
}

export interface ParentAnalyticsCharacterRow {
    characterKey: string
    runCount: number
    avgQuality: number
    bestQuality: number
    trend: string
    lastScenario: string
}

export interface ParentFarmingAnalyticsSummary {
    totalRuns: number
    profiles: ParentAnalyticsProfileRow[]
    characters: ParentAnalyticsCharacterRow[]
    recentTrend: string
}

const characterKey = (run: ParentRunArchiveEntry): string => run.traineeName || run.characterPreset || "Unknown"

export const buildParentFarmingAnalytics = (runs: ParentRunArchiveEntry[]): ParentFarmingAnalyticsSummary => {
    const profileMap = new Map<string, ParentRunArchiveEntry[]>()
    const characterMap = new Map<string, ParentRunArchiveEntry[]>()

    for (const run of runs) {
        const profile = run.profileName || "Default"
        profileMap.set(profile, [...(profileMap.get(profile) ?? []), run])
        const key = characterKey(run)
        characterMap.set(key, [...(characterMap.get(key) ?? []), run])
    }

    const profiles: ParentAnalyticsProfileRow[] = Array.from(profileMap.entries()).map(([profileName, profileRuns]) => {
        const scores = profileRuns.map((run) => scoreParentRunArchiveEntry(run).score)
        const avgQuality = scores.reduce((sum, score) => sum + score, 0) / Math.max(1, scores.length)
        const bestQuality = Math.max(...scores, 0)
        const best = profileRuns.reduce((top, run) =>
            scoreParentRunArchiveEntry(run).score > scoreParentRunArchiveEntry(top).score ? run : top,
        )
        const characterCounts = new Map<string, number>()
        for (const run of profileRuns) {
            const key = characterKey(run)
            characterCounts.set(key, (characterCounts.get(key) ?? 0) + 1)
        }
        const topCharacter =
            Array.from(characterCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"
        return {
            profileName,
            runCount: profileRuns.length,
            avgQuality: Math.round(avgQuality),
            bestQuality: Math.round(bestQuality),
            bestGrade: scoreParentRunArchiveEntry(best).grade,
            lastRunAtMs: profileRuns[0]?.completedAtMs ?? 0,
            topCharacter,
        }
    })

    profiles.sort((a, b) => b.lastRunAtMs - a.lastRunAtMs)

    const characters: ParentAnalyticsCharacterRow[] = Array.from(characterMap.entries()).map(([characterKeyValue, charRuns]) => {
        const sorted = [...charRuns].sort((a, b) => b.completedAtMs - a.completedAtMs)
        const scores = sorted.map((run) => scoreParentRunArchiveEntry(run).score)
        const avgQuality = scores.reduce((sum, score) => sum + score, 0) / Math.max(1, scores.length)
        const trend = sorted
            .slice(0, 8)
            .reverse()
            .map((run) => {
                const score = scoreParentRunArchiveEntry(run).score
                if (score >= 90) return "S"
                if (score >= 80) return "A"
                if (score >= 70) return "B"
                if (score >= 60) return "C"
                return "D"
            })
            .join("→")
        return {
            characterKey: characterKeyValue,
            runCount: charRuns.length,
            avgQuality: Math.round(avgQuality),
            bestQuality: Math.round(Math.max(...scores, 0)),
            trend,
            lastScenario: sorted[0]?.scenario ?? "",
        }
    })

    characters.sort((a, b) => b.runCount - a.runCount)

    const recentTrend = runs
        .slice(0, 12)
        .reverse()
        .map((run) => {
            const score = scoreParentRunArchiveEntry(run).score
            if (score >= 90) return "S"
            if (score >= 80) return "A"
            if (score >= 70) return "B"
            if (score >= 60) return "C"
            return "D"
        })
        .join(" → ")

    return {
        totalRuns: runs.length,
        profiles,
        characters,
        recentTrend,
    }
}
