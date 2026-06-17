import type { ParentRunArchiveEntry } from "./parentRunArchive"
import { findBestRunInSession } from "./parentRunArchive"
import { formatQualityLabel, rankRunsByQuality, scoreParentRunArchiveEntry } from "./parentQuality"

/** Builds a clipboard-friendly multi-run session summary. */
export const formatParentFarmingSessionSummary = (runs: ParentRunArchiveEntry[], sessionId: string): string => {
    const sessionRuns = runs.filter((run) => run.sessionId === sessionId).sort((a, b) => (a.sessionRunIndex ?? 0) - (b.sessionRunIndex ?? 0))
    if (sessionRuns.length === 0) return ""

    const best = findBestRunInSession(sessionRuns, sessionId) ?? rankRunsByQuality(sessionRuns)[0]
    const lines: string[] = [
        "Parent Farming Session Summary",
        `Session: ${sessionId}`,
        `Runs: ${sessionRuns.length}`,
    ]

    if (best) {
        const quality = scoreParentRunArchiveEntry(best)
        lines.push(`Best: ${formatQualityLabel(quality)} (run ${best.sessionRunIndex ?? "?"})`)
        lines.push(`Trainee: ${best.traineeName || best.characterPreset}`)
        lines.push(`Goal: ${best.goalPresetLabel || "—"}`)
        lines.push(`Fans: ${best.fans.toLocaleString()} · ${best.raceWins}W/${best.raceLosses}L`)
        if (quality.breakdown) {
            lines.push(
                `Breakdown — epithets ${quality.breakdown.epithetScore}, fans ${quality.breakdown.fanScore}, forced ${quality.breakdown.forcedScore}, races ${quality.breakdown.raceScore}, sparks ${quality.breakdown.sparkScore}, bonus ${quality.breakdown.bonusScore}`,
            )
        }
        if (best.completedTargetEpithets.length > 0) {
            lines.push(`Completed targets: ${best.completedTargetEpithets.join(", ")}`)
        }
    }

    lines.push("")
    lines.push("All runs:")
    for (const run of sessionRuns) {
        const q = scoreParentRunArchiveEntry(run)
        lines.push(`  #${run.sessionRunIndex ?? "?"} ${formatQualityLabel(q)} · ${run.fans.toLocaleString()} fans · ${run.raceWins}W/${run.raceLosses}L`)
    }

    return lines.join("\n")
}

export const latestSessionId = (runs: ParentRunArchiveEntry[]): string | null => {
    if (runs.length === 0) return null
    const sorted = [...runs].sort((a, b) => b.completedAtMs - a.completedAtMs)
    return sorted.find((run) => run.sessionId)?.sessionId ?? null
}
