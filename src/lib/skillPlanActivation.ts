/**
 * Bridges the skill activation predictor to the Skills page.
 *
 * Given a skill plan (the comma-separated skill ids the user has queued) and the plan's Style settings
 * (running style + track distance), it resolves each planned skill's activation condition from the
 * bundled skill data and predicts which will actually fire — so the UI can flag skills that are dead on
 * the chosen track or that the chosen running style can never trigger, before the run ever starts.
 *
 * The pure `summarizePlanActivation` takes an explicit skill list so it is unit-testable; the
 * `resolvePlanActivation` convenience looks the ids up in `skills.json`.
 */

import skillsData from "../data/skills.json"
import { predictDeckActivations, type ActivationVerdict, type DistanceType, type RunningStyle, type SkillActivation } from "./skillActivationPredictor"

/** Maps the Skills page `preferredRunningStyle` setting to the predictor's running style, or null for non-concrete values (inherit/any). */
const STYLE_SETTING_TO_STYLE: Record<string, RunningStyle> = {
    front_runner: "Front",
    pace_chaser: "Pace",
    late_surger: "Late",
    end_closer: "End",
}

/** Maps the Skills page `preferredTrackDistance` setting to the predictor's distance type, or null for non-concrete values. */
const DISTANCE_SETTING_TO_DISTANCE: Record<string, DistanceType> = {
    sprint: "Sprint",
    mile: "Mile",
    medium: "Medium",
    long: "Long",
}

/** A skill's id, name, and raw activation condition, as read from the skill data. */
export interface PlanSkillMeta {
    id: number
    name: string
    condition: string
}

/** The activation rollup for a plan under a given style/distance. */
export interface PlanActivationSummary {
    /** Per-skill verdicts, most-firing-first. */
    activations: SkillActivation[]
    /** Count of skills in each verdict bucket. */
    counts: Record<ActivationVerdict, number>
    /** The concrete running style used. */
    runningStyle: RunningStyle
    /** The concrete distance used. */
    distanceType: DistanceType
}

const emptyCounts = (): Record<ActivationVerdict, number> => ({ Likely: 0, PositionDependent: 0, StyleMismatch: 0, Dead: 0 })

/**
 * Summarizes activation for an explicit skill list under a running style and distance.
 *
 * @param skills The planned skills (id, name, condition).
 * @param runningStyle The concrete running style.
 * @param distanceType The concrete distance.
 * @param hasFinalCorner Whether the track has a final corner. Defaults to true (all courses except straight-only ones).
 * @returns The per-skill verdicts and bucket counts.
 */
export function summarizePlanActivation(
    skills: PlanSkillMeta[],
    runningStyle: RunningStyle,
    distanceType: DistanceType,
    hasFinalCorner = true,
): PlanActivationSummary {
    const activations = predictDeckActivations(skills, { runningStyle, distanceType, hasFinalCorner })
    const counts = emptyCounts()
    for (const a of activations) counts[a.verdict] += 1
    return { activations, counts, runningStyle, distanceType }
}

/** Lazily-built id → { name, condition } index over the bundled skill data. */
let skillIndex: Map<number, PlanSkillMeta> | null = null

const getSkillIndex = (): Map<number, PlanSkillMeta> => {
    if (skillIndex) return skillIndex
    const index = new Map<number, PlanSkillMeta>()
    for (const entry of Object.values(skillsData as Record<string, { id: number; name_en?: string; condition?: string }>)) {
        if (typeof entry.id !== "number") continue
        index.set(entry.id, { id: entry.id, name: entry.name_en ?? String(entry.id), condition: entry.condition ?? "" })
    }
    skillIndex = index
    return index
}

/**
 * Resolves activation for a plan's skill ids, looking each up in `skills.json`.
 *
 * @param planIds The plan's skill ids.
 * @param styleSetting The Skills page `preferredRunningStyle` value.
 * @param distanceSetting The Skills page `preferredTrackDistance` value.
 * @param hasFinalCorner Whether the track has a final corner (default true).
 * @returns The activation summary, or null when the style or distance is not a concrete value (inherit/any), so the UI can hide the panel instead of guessing.
 */
export function resolvePlanActivation(
    planIds: number[],
    styleSetting: string,
    distanceSetting: string,
    hasFinalCorner = true,
): PlanActivationSummary | null {
    const runningStyle = STYLE_SETTING_TO_STYLE[styleSetting]
    const distanceType = DISTANCE_SETTING_TO_DISTANCE[distanceSetting]
    if (!runningStyle || !distanceType) return null

    const index = getSkillIndex()
    const skills = planIds.map((id) => index.get(id)).filter((s): s is PlanSkillMeta => s !== undefined)
    if (skills.length === 0) return null

    return summarizePlanActivation(skills, runningStyle, distanceType, hasFinalCorner)
}
