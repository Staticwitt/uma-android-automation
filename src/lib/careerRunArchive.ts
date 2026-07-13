/**
 * Frontend reader for the native career-run archive (`CareerRunArchive.kt`), plus the adapter that turns a run + the current
 * settings into the input the post-career auto-tuner expects. Mirrors `parentRunArchive.ts`'s file-backed JSON bridge.
 */

import { NativeModules } from "react-native"
import type { AutoTuneSettingsInput, CareerRunRecord, DistanceKey } from "./careerAutoTune"
import { activeTargetsForDistance } from "./careerAutoTune"
import type { MetaRunInput } from "./careerMetaTune"

/** A parsed career-run archive entry (superset of what the auto-tuner reads). */
export interface CareerRunArchiveEntry {
    id: string
    completedAtMs: number
    scenario: string
    traineeName: string
    careerRank: string
    careerRating: number
    raceWins: number
    raceLosses: number
    raceRecords: { name: string; classYear: string; turnNumber: number; won: boolean }[]
    elapsedMs: number
    fans: number
    fanClass: string
    skillPoints: number
    stats: { speed: number; stamina: number; power: number; guts: number; wit: number }
    /** Aptitude grade letter per distance, keyed by the native TrackDistance enum name (SPRINT/MILE/MEDIUM/LONG). */
    distanceAptitudes: Record<string, string>
    surfaceAptitudes: Record<string, string>
    styleAptitudes: Record<string, string>
}

const num = (v: unknown): number => (typeof v === "number" ? v : 0)
const str = (v: unknown): string => (typeof v === "string" ? v : "")

const parseStats = (raw: unknown): CareerRunArchiveEntry["stats"] => {
    const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
    return { speed: num(s.speed), stamina: num(s.stamina), power: num(s.power), guts: num(s.guts), wit: num(s.wit) }
}

const parseGradeMap = (raw: unknown): Record<string, string> => {
    if (!raw || typeof raw !== "object") return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) if (typeof v === "string") out[k] = v
    return out
}

const parseRaceRecords = (raw: unknown): CareerRunArchiveEntry["raceRecords"] => {
    if (!Array.isArray(raw)) return []
    return raw
        .map((r) => {
            if (!r || typeof r !== "object") return null
            const rec = r as Record<string, unknown>
            return { name: str(rec.name), classYear: str(rec.classYear), turnNumber: num(rec.turnNumber), won: rec.won === true }
        })
        .filter((r): r is CareerRunArchiveEntry["raceRecords"][number] => r !== null)
}

/**
 * Parses the raw archive JSON string into typed entries, newest first (as stored).
 *
 * @param json The JSON array string from the native bridge.
 * @returns Parsed entries; empty on malformed input.
 */
export const parseCareerRunArchive = (json: string): CareerRunArchiveEntry[] => {
    try {
        const parsed = JSON.parse(json || "[]")
        if (!Array.isArray(parsed)) return []
        return parsed
            .map((raw): CareerRunArchiveEntry | null => {
                if (!raw || typeof raw !== "object") return null
                const e = raw as Record<string, unknown>
                const id = str(e.id)
                if (!id) return null
                return {
                    id,
                    completedAtMs: num(e.completedAtMs),
                    scenario: str(e.scenario),
                    traineeName: str(e.traineeName),
                    careerRank: str(e.careerRank),
                    careerRating: num(e.careerRating),
                    raceWins: num(e.raceWins),
                    raceLosses: num(e.raceLosses),
                    raceRecords: parseRaceRecords(e.raceRecords),
                    elapsedMs: typeof e.elapsedMs === "number" ? e.elapsedMs : -1,
                    fans: num(e.fans),
                    fanClass: str(e.fanClass),
                    skillPoints: num(e.skillPoints),
                    stats: parseStats(e.stats),
                    distanceAptitudes: parseGradeMap(e.distanceAptitudes),
                    surfaceAptitudes: parseGradeMap(e.surfaceAptitudes),
                    styleAptitudes: parseGradeMap(e.styleAptitudes),
                }
            })
            .filter((e): e is CareerRunArchiveEntry => e !== null)
    } catch {
        return []
    }
}

export const loadCareerRunArchive = async (): Promise<CareerRunArchiveEntry[]> => {
    const json: string = await NativeModules.StartModule.getCareerRunArchive()
    return parseCareerRunArchive(json)
}

export const clearCareerRunArchive = async (): Promise<void> => {
    await NativeModules.StartModule.clearCareerRunArchive()
}

/** A short label for a run, used in pickers: "Nishino Flower · B · 12W/3L". */
export const formatCareerRunLabel = (entry: CareerRunArchiveEntry): string =>
    `${entry.traineeName || "Run"} · ${entry.careerRank || "?"} · ${entry.raceWins}W/${entry.raceLosses}L`

/** Narrows a full archive entry to the subset the analyzer reads. */
export const toCareerRunRecord = (entry: CareerRunArchiveEntry): CareerRunRecord => ({
    id: entry.id,
    scenario: entry.scenario,
    traineeName: entry.traineeName,
    careerRank: entry.careerRank,
    raceWins: entry.raceWins,
    raceLosses: entry.raceLosses,
    raceRecords: entry.raceRecords,
    skillPoints: entry.skillPoints,
    stats: entry.stats,
})

const APTITUDE_RANK: Record<string, number> = { S: 8, A: 7, B: 6, C: 5, D: 4, E: 3, F: 2, G: 1 }

const DISTANCE_FROM_APT_KEY: Record<string, DistanceKey> = { SPRINT: "Sprint", MILE: "Mile", MEDIUM: "Medium", LONG: "Long" }

/** The minimal settings the auto-tuner input needs; the caller passes the matching fields from the full Settings object. */
export interface AutoTuneSettingsSlice {
    statPrioritization: string[]
    /** "Auto" | "Sprint" | "Mile" | "Medium" | "Long". */
    preferredDistanceOverride: string
    /** The full trainingStatTarget slice (flat `training<Distance>StatTarget_<stat>StatTarget` keys). */
    trainingStatTarget: Record<string, number>
    maximumFailureChance: number
}

/**
 * Resolves the active distance for a run: the preferred-distance override, or (when "Auto") the run's best distance aptitude.
 *
 * @param override The `preferredDistanceOverride` setting.
 * @param distanceAptitudes The run's distance aptitude grade map (native enum keys).
 * @returns The resolved distance, defaulting to Sprint when nothing else applies.
 */
export const resolveDistance = (override: string, distanceAptitudes: Record<string, string>): DistanceKey => {
    if (override === "Sprint" || override === "Mile" || override === "Medium" || override === "Long") return override
    let best: DistanceKey = "Sprint"
    let bestRank = -1
    for (const [key, grade] of Object.entries(distanceAptitudes)) {
        const distance = DISTANCE_FROM_APT_KEY[key.toUpperCase()]
        const rank = APTITUDE_RANK[(grade ?? "").toUpperCase()] ?? 0
        if (distance && rank > bestRank) {
            bestRank = rank
            best = distance
        }
    }
    return best
}

/**
 * Builds the auto-tuner input from a run entry and the current settings slice.
 *
 * @param settings The relevant settings fields.
 * @param entry The career run to analyze.
 * @returns The [AutoTuneSettingsInput] for `analyzeCareerRun`.
 */
export const buildAutoTuneInput = (settings: AutoTuneSettingsSlice, entry: CareerRunArchiveEntry): AutoTuneSettingsInput => {
    const preferredDistance = resolveDistance(settings.preferredDistanceOverride, entry.distanceAptitudes)
    const targets = activeTargetsForDistance(settings.trainingStatTarget, preferredDistance)
    return {
        statPrioritization: settings.statPrioritization,
        preferredDistance,
        targets,
        maximumFailureChance: settings.maximumFailureChance,
    }
}

/**
 * Reduces an archive entry to the lean {@link MetaRunInput} the cross-run meta-tuner consumes.
 *
 * @param entry The career run to reduce.
 * @returns The meta-analysis input for `analyzeCareerRuns`.
 */
export const toMetaRunInput = (entry: CareerRunArchiveEntry): MetaRunInput => ({
    completedAtMs: entry.completedAtMs,
    scenario: entry.scenario,
    careerRating: entry.careerRating,
    careerRank: entry.careerRank,
    stats: entry.stats,
    raceRecords: entry.raceRecords.map((r) => ({ name: r.name, won: r.won })),
})
