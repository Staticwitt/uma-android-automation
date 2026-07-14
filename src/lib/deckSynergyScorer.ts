/**
 * Support deck synergy scorer.
 *
 * Scores a proposed six-card support deck for a target distance BEFORE you commit to it, so you know a
 * deck's ceiling rather than finding out three runs later. It rates the things that decide how good a
 * deck is: SSR density (raw stat/skill ceiling), whether it runs exactly one Friend (recovery/energy),
 * and how well its stat-type mix matches what the target distance actually needs.
 *
 * Pure and heuristic — it grades deck *composition*, not specific card effects. It answers "is this the
 * right shape of deck for this distance?", which is the first question when building for a Champions
 * Meeting.
 */

/** Support card type, matching the in-game categories. */
export type SupportType = "Speed" | "Stamina" | "Power" | "Guts" | "Wit" | "Friend" | "Group" | "Pal"

/** Card rarity. */
export type Rarity = "SSR" | "SR" | "R"

/** Distance categories the deck can be graded against. */
export type DistanceType = "Sprint" | "Mile" | "Medium" | "Long"

/** One equipped support card (only the fields that affect composition scoring). */
export interface SupportCard {
    /** The card's stat type / role. */
    type: SupportType
    /** The card's rarity. */
    rarity: Rarity
}

/** A component of the overall deck score, on a 0..1 scale before weighting. */
export interface DeckScoreComponent {
    /** Component id (e.g. "ssr-density", "friend-slot", "type-fit"). */
    id: string
    /** 0..1 quality for this component. */
    value: number
    /** Human-readable explanation. */
    detail: string
}

/** The full deck grade. */
export interface DeckScoreResult {
    /** Overall 0..100 score. */
    score: number
    /** Per-component breakdown. */
    components: DeckScoreComponent[]
    /** Actionable warnings about the deck's shape. */
    warnings: string[]
}

/** How much each stat-type is worth on the deck for a given distance (the stat emphasis of that distance). */
const TYPE_WEIGHT_BY_DISTANCE: Record<DistanceType, Partial<Record<SupportType, number>>> = {
    Sprint: { Speed: 0.35, Power: 0.3, Wit: 0.15, Guts: 0.1, Stamina: 0.1 },
    Mile: { Speed: 0.3, Power: 0.2, Wit: 0.2, Stamina: 0.15, Guts: 0.15 },
    Medium: { Speed: 0.25, Stamina: 0.2, Power: 0.2, Wit: 0.2, Guts: 0.15 },
    Long: { Stamina: 0.3, Speed: 0.15, Guts: 0.25, Power: 0.15, Wit: 0.15 },
}

const RARITY_VALUE: Record<Rarity, number> = { SSR: 1, SR: 0.6, R: 0.3 }

/** Component weights in the final score. Must sum to 1. */
const COMPONENT_WEIGHTS = { "ssr-density": 0.4, "friend-slot": 0.2, "type-fit": 0.4 }

/** The full six-card deck size, used to normalize densities. */
const DECK_SIZE = 6

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n))
const round = (n: number): number => Math.round(n * 10) / 10

/** Whether a support type contributes stat training (i.e. is not a Friend/Group/Pal support). */
const isStatType = (type: SupportType): boolean => type === "Speed" || type === "Stamina" || type === "Power" || type === "Guts" || type === "Wit"

/**
 * Grades a support deck for a target distance.
 *
 * @param deck The equipped support cards (any length; a full deck is six).
 * @param distance The distance category to grade against.
 * @returns The 0..100 score, per-component breakdown, and warnings.
 */
export function scoreDeck(deck: SupportCard[], distance: DistanceType): DeckScoreResult {
    const warnings: string[] = []
    const weights = TYPE_WEIGHT_BY_DISTANCE[distance]

    // SSR density: average rarity value across the deck slots (missing slots count as empty).
    const rarityValue = deck.reduce((a, c) => a + RARITY_VALUE[c.rarity], 0)
    const ssrDensity = clamp01(rarityValue / DECK_SIZE)
    const ssrCount = deck.filter((c) => c.rarity === "SSR").length
    if (ssrCount < 4) warnings.push(`Only ${ssrCount} SSR cards — a competitive deck usually runs 5-6 for the stat/skill ceiling.`)

    // Friend slot: exactly one Friend is ideal for recovery/energy; zero or multiple is penalized.
    const friendCount = deck.filter((c) => c.type === "Friend").length
    const friendScore = friendCount === 1 ? 1 : friendCount === 0 ? 0.3 : 0.5
    if (friendCount === 0) warnings.push("No Friend card — you'll lack the recovery/energy a Friend provides.")
    if (friendCount > 1) warnings.push(`${friendCount} Friend cards — only one contributes its full value; the extra slot is wasted.`)

    // Type fit: how much of the deck's stat-card weight lands on the types this distance rewards.
    const statCards = deck.filter((c) => isStatType(c.type))
    let fitScore = 0
    if (statCards.length > 0) {
        const maxWeight = Math.max(...Object.values(weights).map((w) => w ?? 0))
        const achieved = statCards.reduce((a, c) => a + (weights[c.type] ?? 0), 0)
        // Normalize against a deck of the same size all sitting on the single best-fit type.
        fitScore = clamp01(achieved / (statCards.length * maxWeight))
    } else {
        warnings.push("No stat-training cards — the deck can't build stats.")
    }
    // Warn on over-investing an off-profile type (e.g. 3 Stamina cards for a sprint): a low-weight type stacked two or more deep.
    const offProfile = statCards.filter((c) => (weights[c.type] ?? 0) < 0.15)
    const offCounts = new Map<SupportType, number>()
    for (const c of offProfile) offCounts.set(c.type, (offCounts.get(c.type) ?? 0) + 1)
    for (const [type, count] of offCounts) {
        if (count >= 2) warnings.push(`${count} ${type} cards is heavy for a ${distance} build — those slots do little here.`)
    }

    const components: DeckScoreComponent[] = [
        { id: "ssr-density", value: round(ssrDensity * 100) / 100, detail: `${ssrCount}/${deck.length} SSR (rarity strength ${Math.round(ssrDensity * 100)}%).` },
        { id: "friend-slot", value: friendScore, detail: `${friendCount} Friend card(s).` },
        { id: "type-fit", value: round(fitScore * 100) / 100, detail: `Stat-card mix fits ${distance} at ${Math.round(fitScore * 100)}%.` },
    ]

    const score = round(
        100 *
            (COMPONENT_WEIGHTS["ssr-density"] * ssrDensity + COMPONENT_WEIGHTS["friend-slot"] * friendScore + COMPONENT_WEIGHTS["type-fit"] * fitScore),
    )

    return { score, components, warnings }
}
