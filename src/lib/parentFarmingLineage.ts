import type { ParentRunArchiveEntry } from "./parentRunArchive"

/** Distinct session IDs present in the archive, most recently completed session first. */
export const listSessionIds = (runs: ParentRunArchiveEntry[]): string[] => {
    const lastSeenMs = new Map<string, number>()
    for (const run of runs) {
        if (!run.sessionId) continue
        const existing = lastSeenMs.get(run.sessionId)
        if (existing === undefined || run.completedAtMs > existing) {
            lastSeenMs.set(run.sessionId, run.completedAtMs)
        }
    }
    return [...lastSeenMs.entries()].sort((a, b) => b[1] - a[1]).map(([sessionId]) => sessionId)
}

/** Runs in a session ordered by generation (sessionRunIndex), forming the breeding chain for that session. */
export const buildLineage = (runs: ParentRunArchiveEntry[], sessionId: string): ParentRunArchiveEntry[] =>
    runs.filter((run) => run.sessionId === sessionId).sort((a, b) => (a.sessionRunIndex ?? 0) - (b.sessionRunIndex ?? 0))

/** Short label for a lineage chain card, e.g. "Gen 2 — Oguri Cap". */
export const formatLineageGenerationLabel = (run: ParentRunArchiveEntry, fallbackIndex: number): string => {
    const trainee = run.traineeName || run.characterPreset || "Unknown"
    return `Gen ${run.sessionRunIndex ?? fallbackIndex} — ${trainee}`
}
