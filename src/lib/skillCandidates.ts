/**
 * Maps the bundled game skill database (`src/data/skills.json`) into the candidate shape the SP-aware skill optimizer consumes,
 * and a `suggestSkillPlan` convenience that returns an optimized skill-ID list for the skill-plan field.
 *
 * The prerequisite chain is read from the game data's `upgrade`/`downgrade` links: a gold skill's `downgrade` points at the base
 * it upgrades from. A gold's contribution is modeled as its *incremental* value over its base (`gold.eval_pt - base.eval_pt`), so
 * the optimizer's base+gold chain total equals the gold's own evaluation rather than double-counting the base.
 *
 * Pure and dependency-free (the skills.json import is data, not a runtime dep), so it is fully unit-testable.
 */

import type { Distance, RunningStyle, SkillCandidate, SkillContext, SkillPurchaseResult } from "./skillPurchaseOptimizer"
import { optimizeSkillPurchases } from "./skillPurchaseOptimizer"

/** The subset of a `skills.json` entry this mapper reads. */
export interface SkillDbEntry {
    id: number
    name_en: string
    cost: number
    eval_pt: number
    rarity: number
    /** Id of the gold skill this one upgrades into, or null. */
    upgrade: number | null
    /** Id of the base skill this one upgrades from (its prerequisite), or null. */
    downgrade: number | null
    /** Activation trigger expression, e.g. "distance_type==2&phase==1&change_order_onetime<0". Empty if unconditional. */
    condition?: string
}

/** distance_type condition values, in the game's own encoding. */
const DISTANCE_TYPE_TAGS: Record<string, Distance> = { "1": "Sprint", "2": "Mile", "3": "Medium", "4": "Long" }

/** running_style condition values, in the game's own encoding (Nige/Senko/Sashi/Oikomi). */
const RUNNING_STYLE_TAGS: Record<string, RunningStyle> = { "1": "Front", "2": "Pace", "3": "Late", "4": "End" }

/**
 * Extracts the distance this skill's effect is restricted to from its activation condition, e.g. "distance_type==2..." -> Mile.
 * No skill in the game DB combines a distance_type/running_style requirement with an alternative "|" trigger branch, so a plain
 * regex match is safe - the requirement always applies to the whole condition, not just one OR-branch.
 */
function distanceTagsFromCondition(condition: string | undefined): Distance[] | undefined {
    const match = condition?.match(/distance_type==(\d)/)
    const tag = match ? DISTANCE_TYPE_TAGS[match[1]] : undefined
    return tag ? [tag] : undefined
}

/** Extracts the running style this skill's effect is restricted to from its activation condition, e.g. "running_style==3..." -> Late. */
function styleTagsFromCondition(condition: string | undefined): RunningStyle[] | undefined {
    const match = condition?.match(/running_style==(\d)/)
    const tag = match ? RUNNING_STYLE_TAGS[match[1]] : undefined
    return tag ? [tag] : undefined
}

/**
 * Maps game skill entries into optimizer candidates.
 *
 * @param entries Skill DB entries (e.g. `skills.json`).
 * @returns Candidates with SP cost, (incremental for upgrades) value, prerequisite links, and kind.
 */
export function mapSkillsToCandidates(entries: SkillDbEntry[]): SkillCandidate[] {
    const byId = new Map(entries.map((e) => [e.id, e]))
    return entries.map((e) => {
        const base = e.downgrade !== null ? byId.get(e.downgrade) : undefined
        const isUpgrade = base !== undefined
        const baseValue = isUpgrade ? e.eval_pt - base.eval_pt : e.eval_pt
        const kind: SkillCandidate["kind"] = e.eval_pt < 0 ? "negative" : e.rarity >= 2 ? "gold" : "normal"
        return {
            id: String(e.id),
            name: e.name_en,
            spCost: e.cost,
            baseValue,
            distanceTags: distanceTagsFromCondition(e.condition),
            styleTags: styleTagsFromCondition(e.condition),
            requiresId: isUpgrade ? String(e.downgrade) : undefined,
            kind,
        }
    })
}

export interface SkillPlanSuggestion {
    /** Optimized skill ids, base-before-upgrade, ready to drop into a skill plan. */
    skillIds: string[]
    /** The full optimizer result (costs, value, leftover SP). */
    result: SkillPurchaseResult
}

/**
 * Suggests an optimized skill plan for the trainee's SP budget and context.
 *
 * @param entries Skill DB entries.
 * @param availableSp The trainee's skill points.
 * @param context Distance/style + negative policy.
 * @returns The optimized skill-id list plus the raw optimizer result.
 */
export function suggestSkillPlan(entries: SkillDbEntry[], availableSp: number, context: SkillContext): SkillPlanSuggestion {
    const candidates = mapSkillsToCandidates(entries)
    const result = optimizeSkillPurchases(candidates, availableSp, context)
    return { skillIds: result.purchased.map((s) => s.id), result }
}
