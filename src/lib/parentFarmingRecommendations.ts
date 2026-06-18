import type { Settings } from "../context/BotStateContext"
import type { ParentRunArchiveEntry } from "./parentRunArchive"
import { scoreParentRunArchiveEntry } from "./parentQuality"
import { findParentFarmingCharacterBundle } from "./parentFarmingCharacterBundles"
import { findParentFarmingGoalPreset } from "./parentFarmingGoalPresets"

export interface ParentFarmingRecommendation {
    id: string
    severity: "info" | "warning" | "action"
    title: string
    detail: string
    actionLabel?: string
}

const bundleKey = (run: ParentRunArchiveEntry): string => run.bundleLabel || run.goalPresetLabel || "unknown"

export const buildParentFarmingRecommendations = (
    runs: ParentRunArchiveEntry[],
    settings: Settings,
): ParentFarmingRecommendation[] => {
    if (runs.length < 2) {
        return [
            {
                id: "need-more-runs",
                severity: "info",
                title: "Not enough history yet",
                detail: "Complete at least two archived parent runs to unlock outcome-based recommendations.",
            },
        ]
    }

    const recs: ParentFarmingRecommendation[] = []
    const byBundle = new Map<string, ParentRunArchiveEntry[]>()
    for (const run of runs) {
        const key = bundleKey(run)
        byBundle.set(key, [...(byBundle.get(key) ?? []), run])
    }

    const ranked = Array.from(byBundle.entries())
        .map(([key, bundleRuns]) => {
            const scores = bundleRuns.map((run) => scoreParentRunArchiveEntry(run).score)
            const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length
            const forcedFails = bundleRuns.filter((run) => run.forcedEpithets.some((f) => run.incompleteTargetEpithets.includes(f)))
            return { key, avg, count: bundleRuns.length, forcedFails: forcedFails.length }
        })
        .sort((a, b) => b.avg - a.avg)

    const best = ranked[0]
    const currentKey = settings.racing.parentFarmingBundleLabel || settings.racing.parentFarmingGoalPresetLabel
    if (best && currentKey && best.key !== currentKey && best.avg >= (ranked.find((row) => row.key === currentKey)?.avg ?? 0) + 8) {
        recs.push({
            id: "switch-bundle",
            severity: "action",
            title: `Try "${best.key}" more often`,
            detail: `Your archived runs average ${Math.round(best.avg)}/100 quality on this setup vs lower scores on the current bundle/preset.`,
            actionLabel: "Review bundles",
        })
    }

    const recent = runs.slice(0, 6)
    const forcedMissRate =
        recent.filter((run) => run.forcedEpithets.some((f) => run.incompleteTargetEpithets.includes(f))).length /
        Math.max(1, recent.length)
    if (forcedMissRate >= 0.5) {
        recs.push({
            id: "downgrade-forced",
            severity: "warning",
            title: "Forced epithets often miss",
            detail: `${Math.round(forcedMissRate * 100)}% of recent runs missed a forced epithet. Enable auto-downgrade forced or adaptive multi-run.`,
            actionLabel: "Open reliability toggles",
        })
    }

    const lowFanRuns = recent.filter((run) => {
        const floor = run.minimumFanTarget > 0 ? run.minimumFanTarget : 120_000
        return run.fans < floor * 0.85
    })
    if (lowFanRuns.length >= 3) {
        recs.push({
            id: "raise-fan-floor",
            severity: "warning",
            title: "Fan totals below solver floor",
            detail: "Several recent runs finished under the configured minimum fan target. Consider a G1/fan bundle or lower forced epithet pressure.",
        })
    }

    const scenario = settings.general.scenario
    const scenarioRuns = runs.filter((run) => run.scenario === scenario)
    if (scenarioRuns.length >= 3) {
        const avg = scenarioRuns.reduce((sum, run) => sum + scoreParentRunArchiveEntry(run).score, 0) / scenarioRuns.length
        if (avg < 65) {
            recs.push({
                id: "scenario-mismatch",
                severity: "info",
                title: `Low scores in ${scenario}`,
                detail: "Archive quality is weak for this scenario. Confirm auto-scenario sync and feasibility preview before overnight runs.",
            })
        }
    }

    const preset = findParentFarmingGoalPreset(settings.racing.parentFarmingGoalPresetKey)
    const bundle = findParentFarmingCharacterBundle(settings.racing.parentFarmingBundleKey)
    if (!preset && !bundle) {
        recs.push({
            id: "pick-setup",
            severity: "action",
            title: "No active character setup",
            detail: "Apply a character bundle or goal preset before starting unattended parent farming.",
        })
    }

    if (recs.length === 0) {
        recs.push({
            id: "on-track",
            severity: "info",
            title: "Setups look healthy",
            detail: `Best archived average: ${Math.round(best?.avg ?? 0)}/100 across ${runs.length} runs.`,
        })
    }

    return recs
}
