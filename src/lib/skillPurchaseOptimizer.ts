/**
 * SP-aware skill purchase optimizer.
 *
 * Given a set of candidate skills (each with an SP cost, a base race-performance value, distance/style relevance tags, and an
 * optional prerequisite), the trainee's distance + running style, and an SP budget, picks the subset of skills that maximizes
 * total race value without exceeding the budget. Unlike a fixed skill-ID plan, this adapts to the actual stat line / SP the run
 * produced and won't waste SP on off-distance or off-style skills.
 *
 * Prerequisites (a gold skill that upgrades from a base skill) are modeled as linear chains and solved as a multiple-choice
 * knapsack: for each chain you buy a prefix (nothing / base / base+gold), so a gold is only ever bought together with its base.
 *
 * Pure and dependency-free so it is fully unit-testable without the live game skill DB that would feed the candidate list.
 */

export type Distance = "Sprint" | "Mile" | "Medium" | "Long"
export type RunningStyle = "Front" | "Pace" | "Late" | "End"

export interface SkillContext {
    distance: Distance
    style: RunningStyle
    /** When false (default), skills tagged negative are never purchased. */
    allowNegative?: boolean
}

export interface SkillCandidate {
    id: string
    name: string
    /** SP cost to purchase. */
    spCost: number
    /** Base race-performance value before distance/style relevance weighting. */
    baseValue: number
    /** Distances this skill helps in. Empty/omitted = helps at all distances. */
    distanceTags?: Distance[]
    /** Running styles this skill helps. Empty/omitted = helps all styles. */
    styleTags?: RunningStyle[]
    /** The id of a skill that must be purchased first (and which this one upgrades from), e.g. a gold skill's base. */
    requiresId?: string
    kind?: "gold" | "normal" | "unique" | "recovery" | "negative"
}

export interface SkillPurchaseResult {
    /** Purchased skills, in chain order (base before its upgrade). */
    purchased: SkillCandidate[]
    totalCost: number
    totalValue: number
    /** SP left over after the purchases. */
    remainingSp: number
}

/** Off-distance skills are largely dead weight; off-style skills partially so. Recovery skills are always relevant. */
const OFF_DISTANCE_MULTIPLIER = 0.15
const OFF_STYLE_MULTIPLIER = 0.3

/**
 * Relevance multiplier in [0, 1] for a skill given the trainee's distance and style. A skill with no distance/style tags is
 * assumed universally useful (multiplier 1). Recovery skills are never distance/style-discounted.
 *
 * @param skill The candidate skill.
 * @param context The trainee context.
 * @returns The relevance multiplier applied to the skill's base value.
 */
export function skillRelevance(skill: SkillCandidate, context: SkillContext): number {
    if (skill.kind === "recovery") return 1
    let m = 1
    if (skill.distanceTags && skill.distanceTags.length > 0 && !skill.distanceTags.includes(context.distance)) m *= OFF_DISTANCE_MULTIPLIER
    if (skill.styleTags && skill.styleTags.length > 0 && !skill.styleTags.includes(context.style)) m *= OFF_STYLE_MULTIPLIER
    return m
}

/** Effective (relevance-weighted) value of a skill for a context. */
const effectiveValue = (skill: SkillCandidate, context: SkillContext): number => skill.baseValue * skillRelevance(skill, context)

interface Chain {
    /** Cumulative prefixes: index 0 = buy nothing, index k = buy the first k skills of the chain. */
    prefixes: { cost: number; value: number; skills: SkillCandidate[] }[]
}

/**
 * Groups candidates into linear prerequisite chains (base -> upgrade), dropping negatives unless allowed and skills whose
 * prerequisite is not present. Each chain exposes its cumulative purchase prefixes for the knapsack.
 */
function buildChains(candidates: SkillCandidate[], context: SkillContext): Chain[] {
    const usable = candidates.filter((s) => (context.allowNegative ? true : s.kind !== "negative"))
    const byId = new Map(usable.map((s) => [s.id, s]))
    // A skill whose requiresId is missing from the usable set cannot be bought, so drop it too.
    const purchasable = usable.filter((s) => s.requiresId === undefined || byId.has(s.requiresId))
    const purchasableIds = new Set(purchasable.map((s) => s.id))
    const upgradeOf = new Map<string, SkillCandidate>() // baseId -> the skill that upgrades from it
    for (const s of purchasable) {
        if (s.requiresId !== undefined && purchasableIds.has(s.requiresId)) upgradeOf.set(s.requiresId, s)
    }
    const heads = purchasable.filter((s) => s.requiresId === undefined || !purchasableIds.has(s.requiresId))

    const chains: Chain[] = []
    for (const head of heads) {
        const seq: SkillCandidate[] = [head]
        let next = upgradeOf.get(head.id)
        const seen = new Set<string>([head.id])
        while (next && !seen.has(next.id)) {
            seq.push(next)
            seen.add(next.id)
            next = upgradeOf.get(next.id)
        }
        const prefixes: Chain["prefixes"] = [{ cost: 0, value: 0, skills: [] }]
        let cost = 0
        let value = 0
        for (let i = 0; i < seq.length; i++) {
            cost += seq[i].spCost
            value += effectiveValue(seq[i], context)
            prefixes.push({ cost, value, skills: seq.slice(0, i + 1) })
        }
        chains.push({ prefixes })
    }
    return chains
}

/**
 * Optimizes skill purchases within an SP budget.
 *
 * @param candidates The candidate skills (from the game skill DB, filtered to what's offered).
 * @param availableSp The trainee's available skill points.
 * @param context The trainee's distance/style and negative-skill policy.
 * @returns The purchase set that maximizes relevance-weighted value within budget.
 */
export function optimizeSkillPurchases(candidates: SkillCandidate[], availableSp: number, context: SkillContext): SkillPurchaseResult {
    const budget = Math.max(0, Math.floor(availableSp))
    const chains = buildChains(candidates, context)

    // Multiple-choice knapsack: dp[b] = best value with budget b; choice[chainIndex][b] = prefix index chosen at that layer.
    let dp = new Array<number>(budget + 1).fill(0)
    const choices: number[][] = []
    for (const chain of chains) {
        const next = dp.slice()
        const choice = new Array<number>(budget + 1).fill(0)
        for (let b = 0; b <= budget; b++) {
            let best = dp[b] // prefix 0 (buy nothing from this chain)
            let bestPrefix = 0
            for (let p = 1; p < chain.prefixes.length; p++) {
                const pre = chain.prefixes[p]
                if (pre.cost > b) break // prefixes are cost-monotone, so no later prefix fits either
                const candidate = dp[b - pre.cost] + pre.value
                if (candidate > best) {
                    best = candidate
                    bestPrefix = p
                }
            }
            next[b] = best
            choice[b] = bestPrefix
        }
        dp = next
        choices.push(choice)
    }

    // Reconstruct the chosen prefixes from the back. Collect each chain's block (already in base->upgrade order) and reverse the
    // block order — not the skills within a block — so chains come out front-to-back with base before its upgrade.
    const groups: SkillCandidate[][] = []
    let remaining = budget
    for (let i = chains.length - 1; i >= 0; i--) {
        const p = choices[i][remaining]
        if (p > 0) {
            const pre = chains[i].prefixes[p]
            groups.push(pre.skills)
            remaining -= pre.cost
        }
    }
    groups.reverse()
    const purchased: SkillCandidate[] = groups.flat()

    const totalCost = budget - remaining
    const totalValue = purchased.reduce((sum, s) => sum + effectiveValue(s, context), 0)
    return { purchased, totalCost, totalValue, remainingSp: availableSp - totalCost }
}
