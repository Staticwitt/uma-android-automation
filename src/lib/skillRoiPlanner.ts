/**
 * Skill ROI shopping-list planner.
 *
 * Ranks purchasable skills by rank-points-per-skill-point (ROI) and, given a skill-point budget, greedily
 * builds the shopping list that maximizes rank for the points — so you spend on the highest-value skills
 * for your build and track, not whatever happens to be cheapest.
 *
 * It optionally folds in a skill's *activation verdict* (from the skill activation predictor): a skill
 * that can't fire on the track/for your running style is worth little rank in practice, so its effective
 * value is discounted before ranking. Pass verdicts through and dead/mismatched skills sink to the
 * bottom of the list on their own.
 *
 * Pure and greedy-by-ROI; it is a spending guide, not the exact-subset knapsack the end-of-career
 * leftover drain uses.
 */

/** Activation verdicts, matching the skill activation predictor's output. Loosely coupled by string so the two libs need not import each other. */
export type ActivationVerdict = "Likely" | "PositionDependent" | "StyleMismatch" | "Dead"

/** How much of a skill's rank value actually lands, by how reliably it fires. */
const DEFAULT_ACTIVATION_MULTIPLIER: Record<ActivationVerdict, number> = {
    Likely: 1,
    PositionDependent: 0.9,
    StyleMismatch: 0.25,
    Dead: 0,
}

/** One purchasable skill. */
export interface SkillCandidate {
    /** Skill name. */
    name: string
    /** Cost in skill points. */
    cost: number
    /** Rank (evaluation) points gained on purchase. */
    evalPoints: number
    /** Optional activation verdict; when present, discounts the effective value by how reliably the skill fires. */
    verdict?: ActivationVerdict
}

/** A ranked skill with its ROI and firing-adjusted value. */
export interface RankedSkill {
    /** Skill name. */
    name: string
    /** Cost in skill points. */
    cost: number
    /** Raw rank points. */
    evalPoints: number
    /** Rank points after the activation discount. */
    effectiveEvalPoints: number
    /** Effective rank points per skill point (the ranking key). */
    roi: number
    /** The verdict used, when supplied. */
    verdict?: ActivationVerdict
}

/** The plan: everything ranked, plus the budget-limited buy list. */
export interface SkillPlanResult {
    /** All candidates ranked by ROI, best first (dead/mismatched sink to the bottom). */
    ranked: RankedSkill[]
    /** The greedy buy list that fits the budget, highest ROI first. */
    picks: RankedSkill[]
    /** Total skill points the picks cost. */
    totalCost: number
    /** Total effective rank points the picks deliver. */
    totalEffectiveEvalPoints: number
}

/** Tuning for {@link planSkillPurchases}. */
export interface SkillPlanOptions {
    /** Override the per-verdict value multipliers. */
    activationMultipliers?: Partial<Record<ActivationVerdict, number>>
}

const round = (n: number): number => Math.round(n * 1000) / 1000

/**
 * Ranks skills by firing-adjusted ROI and builds the budget-limited shopping list.
 *
 * @param candidates The purchasable skills.
 * @param budget Skill points available to spend. Non-positive budgets yield an empty buy list (but still rank).
 * @param options Optional activation-multiplier overrides.
 * @returns The full ranking plus the greedy buy list.
 */
export function planSkillPurchases(candidates: SkillCandidate[], budget: number, options: SkillPlanOptions = {}): SkillPlanResult {
    const multipliers = { ...DEFAULT_ACTIVATION_MULTIPLIER, ...options.activationMultipliers }

    const ranked: RankedSkill[] = candidates
        .map((c) => {
            const mult = c.verdict ? multipliers[c.verdict] : 1
            const effectiveEvalPoints = c.evalPoints * mult
            return {
                name: c.name,
                cost: c.cost,
                evalPoints: c.evalPoints,
                effectiveEvalPoints: round(effectiveEvalPoints),
                roi: c.cost > 0 ? round(effectiveEvalPoints / c.cost) : 0,
                verdict: c.verdict,
            }
        })
        .sort((a, b) => b.roi - a.roi || b.effectiveEvalPoints - a.effectiveEvalPoints || a.name.localeCompare(b.name))

    const picks: RankedSkill[] = []
    let remaining = Math.max(0, budget)
    let totalCost = 0
    let totalEffectiveEvalPoints = 0
    for (const skill of ranked) {
        // A skill that delivers no effective value (dead, or zero-cost noise) is never worth a slot.
        if (skill.effectiveEvalPoints <= 0) continue
        if (skill.cost > 0 && skill.cost <= remaining) {
            picks.push(skill)
            remaining -= skill.cost
            totalCost += skill.cost
            totalEffectiveEvalPoints += skill.effectiveEvalPoints
        }
    }

    return { ranked, picks, totalCost, totalEffectiveEvalPoints: round(totalEffectiveEvalPoints) }
}
