import { NativeModules } from "react-native"

import type { ParentQualityBreakdown, ParentQualityGrade } from "./parentQuality"
import { formatQualityLabel, scoreParentRunArchiveEntry } from "./parentQuality"

export interface ParentRunSparkPick {
    pickIndex: number
    strategy: string
    optionTexts: string[]
}

export interface ParentRunStats {
    speed: number
    stamina: number
    power: number
    guts: number
    wit: number
}

export interface ParentRunArchiveEntry {
    id: string
    completedAtMs: number
    scenario: string
    profileName: string
    bundleLabel: string
    goalPresetLabel: string
    characterPreset: string
    traineeName: string
    sparkStrategy: string
    targetEpithets: string[]
    forcedEpithets: string[]
    completedTargetEpithets: string[]
    incompleteTargetEpithets: string[]
    extraCompletedEpithets: string[]
    sparkPicks: ParentRunSparkPick[]
    fanWeight: number
    minimumFanTarget: number
    raceWins: number
    raceLosses: number
    elapsedMs: number
    trainingBias: string
    fans: number
    fanClass: string
    skillPoints: number
    stats: ParentRunStats
    qualityScore?: number
    qualityGrade?: ParentQualityGrade
    qualityBreakdown?: ParentQualityBreakdown
    sessionId?: string
    sessionRunIndex?: number
    sessionRunTarget?: number
    isSessionBest?: boolean
    inheritanceSummary?: string
}

const parseStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return []
    return value.filter((item): item is string => typeof item === "string")
}

const parseSparkPicks = (value: unknown): ParentRunSparkPick[] => {
    if (!Array.isArray(value)) return []
    return value
        .map((raw) => {
            if (!raw || typeof raw !== "object") return null
            const pick = raw as Record<string, unknown>
            return {
                pickIndex: typeof pick.pickIndex === "number" ? pick.pickIndex : 0,
                strategy: typeof pick.strategy === "string" ? pick.strategy : "",
                optionTexts: parseStringArray(pick.optionTexts),
            }
        })
        .filter((pick): pick is ParentRunSparkPick => pick !== null)
}

const parseStats = (value: unknown): ParentRunStats => {
    const stats = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
    const num = (key: string) => (typeof stats[key] === "number" ? (stats[key] as number) : 0)
    return {
        speed: num("speed"),
        stamina: num("stamina"),
        power: num("power"),
        guts: num("guts"),
        wit: num("wit"),
    }
}

export const parseParentRunArchive = (json: string): ParentRunArchiveEntry[] => {
    try {
        const parsed = JSON.parse(json || "[]")
        if (!Array.isArray(parsed)) return []
        return parsed
            .map((raw): ParentRunArchiveEntry | null => {
                if (!raw || typeof raw !== "object") return null
                const entry = raw as Record<string, unknown>
                const id = typeof entry.id === "string" ? entry.id : ""
                if (!id) return null
                return {
                    id,
                    completedAtMs: typeof entry.completedAtMs === "number" ? entry.completedAtMs : 0,
                    scenario: typeof entry.scenario === "string" ? entry.scenario : "",
                    profileName: typeof entry.profileName === "string" ? entry.profileName : "",
                    bundleLabel: typeof entry.bundleLabel === "string" ? entry.bundleLabel : "",
                    goalPresetLabel: typeof entry.goalPresetLabel === "string" ? entry.goalPresetLabel : "",
                    characterPreset: typeof entry.characterPreset === "string" ? entry.characterPreset : "",
                    traineeName: typeof entry.traineeName === "string" ? entry.traineeName : "",
                    sparkStrategy: typeof entry.sparkStrategy === "string" ? entry.sparkStrategy : "",
                    targetEpithets: parseStringArray(entry.targetEpithets),
                    forcedEpithets: parseStringArray(entry.forcedEpithets),
                    completedTargetEpithets: parseStringArray(entry.completedTargetEpithets),
                    incompleteTargetEpithets: parseStringArray(entry.incompleteTargetEpithets),
                    extraCompletedEpithets: parseStringArray(entry.extraCompletedEpithets),
                    sparkPicks: parseSparkPicks(entry.sparkPicks),
                    fanWeight: typeof entry.fanWeight === "number" ? entry.fanWeight : 0,
                    minimumFanTarget: typeof entry.minimumFanTarget === "number" ? entry.minimumFanTarget : 0,
                    raceWins: typeof entry.raceWins === "number" ? entry.raceWins : 0,
                    raceLosses: typeof entry.raceLosses === "number" ? entry.raceLosses : 0,
                    elapsedMs: typeof entry.elapsedMs === "number" ? entry.elapsedMs : -1,
                    trainingBias: typeof entry.trainingBias === "string" ? entry.trainingBias : "",
                    fans: typeof entry.fans === "number" ? entry.fans : 0,
                    fanClass: typeof entry.fanClass === "string" ? entry.fanClass : "",
                    skillPoints: typeof entry.skillPoints === "number" ? entry.skillPoints : 0,
                    stats: parseStats(entry.stats),
                    qualityScore: typeof entry.qualityScore === "number" ? entry.qualityScore : undefined,
                    qualityGrade:
                        entry.qualityGrade === "S" ||
                        entry.qualityGrade === "A" ||
                        entry.qualityGrade === "B" ||
                        entry.qualityGrade === "C" ||
                        entry.qualityGrade === "D"
                            ? entry.qualityGrade
                            : undefined,
                    qualityBreakdown:
                        entry.qualityBreakdown && typeof entry.qualityBreakdown === "object"
                            ? (entry.qualityBreakdown as ParentQualityBreakdown)
                            : undefined,
                    sessionId: typeof entry.sessionId === "string" ? entry.sessionId : undefined,
                    sessionRunIndex: typeof entry.sessionRunIndex === "number" ? entry.sessionRunIndex : undefined,
                    sessionRunTarget: typeof entry.sessionRunTarget === "number" ? entry.sessionRunTarget : undefined,
                    isSessionBest: typeof entry.isSessionBest === "boolean" ? entry.isSessionBest : undefined,
                    inheritanceSummary: typeof entry.inheritanceSummary === "string" ? entry.inheritanceSummary : undefined,
                }
            })
            .filter((entry): entry is ParentRunArchiveEntry => entry !== null)
    } catch {
        return []
    }
}

export const loadParentRunArchive = async (): Promise<ParentRunArchiveEntry[]> => {
    const json: string = await NativeModules.StartModule.getParentRunArchive()
    return parseParentRunArchive(json)
}

export const clearParentRunArchive = async (): Promise<void> => {
    await NativeModules.StartModule.clearParentRunArchive()
}

export const exportParentRunArchiveJson = async (): Promise<string> => {
    const entries = await loadParentRunArchive()
    return JSON.stringify(entries, null, 2)
}

export const formatParentRunExportEntry = (entry: ParentRunArchiveEntry): string => {
    const quality = formatQualityLabel(scoreParentRunArchiveEntry(entry))
    const parts = [
        entry.traineeName || entry.characterPreset,
        quality,
        `${entry.fans.toLocaleString()} fans`,
        `${entry.raceWins}W/${entry.raceLosses}L`,
        entry.completedTargetEpithets.length > 0 ? `done: ${entry.completedTargetEpithets.join(", ")}` : "",
        entry.incompleteTargetEpithets.length > 0 ? `missed: ${entry.incompleteTargetEpithets.join(", ")}` : "",
        entry.inheritanceSummary ? `inheritance: ${entry.inheritanceSummary}` : "",
    ].filter(Boolean)
    return parts.join(" · ")
}

export const formatParentRunTimestamp = (completedAtMs: number): string => {
    if (!completedAtMs) return "Unknown time"
    try {
        return new Date(completedAtMs).toLocaleString()
    } catch {
        return String(completedAtMs)
    }
}

export const formatParentRunDuration = (elapsedMs: number): string | null => {
    if (elapsedMs < 0) return null
    const totalMinutes = Math.floor(elapsedMs / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
}

export const formatFanClassLabel = (fanClass: string): string => fanClass.replace(/_/g, " ")

export const findPreviousRunForCharacter = (
    runs: ParentRunArchiveEntry[],
    current: ParentRunArchiveEntry,
): ParentRunArchiveEntry | null => {
    const index = runs.findIndex((run) => run.id === current.id)
    if (index < 0) return null
    const key = current.characterPreset || current.traineeName
    for (let i = index + 1; i < runs.length; i++) {
        const candidate = runs[i]
        const candidateKey = candidate.characterPreset || candidate.traineeName
        if (candidateKey && candidateKey === key) return candidate
    }
    return null
}

export const findBestRunInSession = (runs: ParentRunArchiveEntry[], sessionId: string): ParentRunArchiveEntry | null => {
    const sessionRuns = runs.filter((run) => run.sessionId === sessionId)
    if (sessionRuns.length === 0) return null
    const marked = sessionRuns.find((run) => run.isSessionBest)
    if (marked) return marked
    return sessionRuns.reduce((best, run) =>
        scoreParentRunArchiveEntry(run).score > scoreParentRunArchiveEntry(best).score ? run : best,
    )
}

export const buildQualityTrendForCharacter = (
    runs: ParentRunArchiveEntry[],
    characterKey: string,
    limit = 10,
): ParentRunArchiveEntry[] =>
    runs
        .filter((run) => (run.characterPreset || run.traineeName) === characterKey)
        .slice(0, limit)
        .reverse()

export const formatQualityTrendLine = (runs: ParentRunArchiveEntry[]): string => {
    if (runs.length === 0) return ""
    return runs
        .map((run) => {
            const score = scoreParentRunArchiveEntry(run).score
            if (score >= 90) return "S"
            if (score >= 80) return "A"
            if (score >= 70) return "B"
            if (score >= 60) return "C"
            return "D"
        })
        .join(" → ")
}

export const formatFansDelta = (current: number, previous: number): string => {
    const delta = current - previous
    if (delta === 0) return "same fans as previous run"
    const sign = delta > 0 ? "+" : ""
    return `${sign}${delta.toLocaleString()} fans vs previous ${previous.toLocaleString()}`
}
