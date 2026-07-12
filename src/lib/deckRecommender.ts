/**
 * Support-card deck recommender.
 *
 * Given a player's owned support-card inventory and a target character's profile, recommends the standard 5-own + 1-rental deck:
 * an ideal type distribution for the character's distance/style, the best owned cards to fill five of those slots, and which type
 * to borrow for the sixth. Encodes the deck logic applied by hand for sprint (3 Speed / 2 Power / friend) and medium pace-chaser
 * (2 Speed / 1 Stamina / 1 Power / 1 Wit / friend) builds.
 *
 * Pure and dependency-free so it is fully unit-testable without OCR-importing a real collection. The screenshot-import front-end
 * that builds the inventory is a separate concern that feeds this.
 */

export type CardType = "speed" | "stamina" | "power" | "guts" | "wit" | "friend"
export type Rarity = "SSR" | "SR" | "R"
export type Distance = "Sprint" | "Mile" | "Medium" | "Long"

/** A support card the player owns. */
export interface OwnedSupportCard {
    name: string
    type: CardType
    rarity: Rarity
    /** Limit break, 0-4 (4 = MLB / max limit break). */
    limitBreak: number
    /** Enhancement level, 1-50. */
    level: number
    /** Optional effect tags, e.g. "recovery", "hint". */
    tags?: string[]
}

/** The trainee we are building the deck for. */
export interface CharacterProfile {
    name: string
    distance: Distance
    /** Pace/Late chasers whose kit relies on recovery skills (e.g. Christmas Oguri Cap) want a Stamina slot even at shorter distances. */
    needsRecovery?: boolean
}

export interface DeckRecommendation {
    /** The owned cards chosen to fill five slots, strongest first. */
    own: OwnedSupportCard[]
    /** The sixth (borrowed) slot: which type to rent and why. */
    rental: { type: CardType; reason: string }
    /** The ideal 6-slot type distribution used. */
    distribution: Partial<Record<CardType, number>>
    /** Types the ideal distribution wants an owned card for but the inventory can't fill. */
    gaps: string[]
    /** Human-readable notes about the build. */
    notes: string[]
}

const RARITY_BASE: Record<Rarity, number> = { SSR: 100, SR: 60, R: 30 }

/**
 * Heuristic single-number strength of a support card. Rarity dominates, limit break is heavily weighted (MLB is a big deal), and
 * level is a smaller tie-breaker. Tuned so an SSR at LB2 and a fully MLB SR land close together, matching in-game intuition.
 *
 * @param card The owned card.
 * @returns A comparable strength score (higher is stronger).
 */
export function cardStrength(card: OwnedSupportCard): number {
    const rarity = RARITY_BASE[card.rarity] ?? 0
    const lb = Math.max(0, Math.min(4, card.limitBreak)) * 18
    const level = Math.max(0, Math.min(50, card.level)) * 0.4
    return rarity + lb + level
}

/** Ideal 6-slot type distribution per distance (own + the one rental slot), summing to 6. */
const IDEAL_DISTRIBUTION: Record<Distance, Partial<Record<CardType, number>>> = {
    Sprint: { speed: 3, power: 2, friend: 1 },
    Mile: { speed: 3, power: 1, stamina: 1, friend: 1 },
    Medium: { speed: 2, stamina: 1, power: 1, wit: 1, friend: 1 },
    Long: { speed: 2, stamina: 2, power: 1, friend: 1 },
}

const TYPE_DISPLAY: Record<CardType, string> = {
    speed: "Speed",
    stamina: "Stamina",
    power: "Power",
    guts: "Guts",
    wit: "Wit",
    friend: "Friend",
}

/** Sums a distribution's slot counts. */
const totalSlots = (dist: Partial<Record<CardType, number>>): number => Object.values(dist).reduce((a, b) => a + (b ?? 0), 0)

/**
 * Builds the ideal 6-slot distribution for a character, forcing in a Stamina slot when the kit needs recovery but the base
 * distance distribution has none (converts the lowest-value non-Speed slot to Stamina).
 *
 * @param profile The trainee profile.
 * @returns The ideal distribution and any notes generated while building it.
 */
function idealDistributionFor(profile: CharacterProfile): { distribution: Partial<Record<CardType, number>>; notes: string[] } {
    const distribution: Partial<Record<CardType, number>> = { ...IDEAL_DISTRIBUTION[profile.distance] }
    const notes: string[] = []
    if (profile.needsRecovery && (distribution.stamina ?? 0) < 1) {
        // Prefer to take the slot from Wit, then Guts, then Power - never from Speed or Friend.
        const donor: CardType | undefined = (["wit", "guts", "power"] as CardType[]).find((t) => (distribution[t] ?? 0) > 0)
        if (donor) {
            distribution[donor] = (distribution[donor] ?? 0) - 1
            if (distribution[donor] === 0) delete distribution[donor]
            distribution.stamina = (distribution.stamina ?? 0) + 1
            notes.push(`${profile.name} relies on recovery skills, so a Stamina slot was added (taken from ${TYPE_DISPLAY[donor]}).`)
        }
    }
    return { distribution, notes }
}

/** Groups owned cards by type, each list sorted strongest-first. */
function byTypeSortedByStrength(inventory: OwnedSupportCard[]): Map<CardType, OwnedSupportCard[]> {
    const map = new Map<CardType, OwnedSupportCard[]>()
    for (const card of inventory) {
        const list = map.get(card.type) ?? []
        list.push(card)
        map.set(card.type, list)
    }
    for (const list of map.values()) list.sort((a, b) => cardStrength(b) - cardStrength(a))
    return map
}

/**
 * Recommends a 5-own + 1-rental deck for a character from an owned-card inventory.
 *
 * Strategy: pick the ideal 6-slot distribution for the distance (adding a Stamina slot for recovery-reliant kits), rent the slot
 * where the inventory is weakest (defaulting to Friend, which players usually borrow), and fill the remaining five slots with the
 * strongest owned cards of each required type. Types that can't be filled are reported as gaps.
 *
 * @param inventory The player's owned support cards.
 * @param profile The trainee to build for.
 * @returns The deck recommendation.
 */
export function recommendDeck(inventory: OwnedSupportCard[], profile: CharacterProfile): DeckRecommendation {
    const { distribution, notes } = idealDistributionFor(profile)
    const byType = byTypeSortedByStrength(inventory)
    const coverage = (type: CardType): number => cardStrength(byType.get(type)?.[0] ?? { name: "", type, rarity: "R", limitBreak: 0, level: 0 }) - RARITY_BASE.R
    const hasAny = (type: CardType): boolean => (byType.get(type)?.length ?? 0) > 0

    // Choose the rental slot: the distribution slot where the player's own pool is weakest. Friend is the default when it is a
    // slot and the player's friend pool is not clearly their strongest, since a borrowed friend (e.g. Tazuna) is the norm.
    const slotTypes = Object.keys(distribution) as CardType[]
    let rentalType: CardType = slotTypes[0]
    let worst = Infinity
    for (const type of slotTypes) {
        const strength = hasAny(type) ? coverage(type) : -1
        if (strength < worst) {
            worst = strength
            rentalType = type
        }
    }
    // If Friend is a slot and the player owns no strong (SSR) friend card, prefer renting Friend - it is the conventional rental
    // and frees an own slot for a stat card they do have. But never override a hard stat gap: if a required stat type has no owned
    // card at all, rent that instead, since a missing stat card hurts far more than borrowing a friend.
    const strongFriend = (byType.get("friend") ?? []).some((c) => c.rarity === "SSR" && c.limitBreak >= 2)
    const anyStatGap = slotTypes.some((t) => t !== "friend" && !hasAny(t))
    if ((distribution.friend ?? 0) > 0 && !strongFriend && !anyStatGap) rentalType = "friend"

    const rentalReason =
        rentalType === "friend"
            ? "Borrow a friend card (Tazuna is ideal) - energy + healing lets the bot train more high-value turns, and you free an own slot for a stat card you already have."
            : `Borrow a ${TYPE_DISPLAY[rentalType]} card - it's the slot your own collection is weakest in for this build.`

    // Own target = distribution minus one slot for the rental type.
    const ownTarget: Partial<Record<CardType, number>> = { ...distribution }
    ownTarget[rentalType] = (ownTarget[rentalType] ?? 0) - 1
    if (ownTarget[rentalType] === 0) delete ownTarget[rentalType]

    const own: OwnedSupportCard[] = []
    const gaps: string[] = []
    for (const type of Object.keys(ownTarget) as CardType[]) {
        const need = ownTarget[type] ?? 0
        const available = byType.get(type) ?? []
        const taken = available.slice(0, need)
        own.push(...taken)
        if (taken.length < need) {
            const short = need - taken.length
            gaps.push(`${TYPE_DISPLAY[type]}: need ${need}, own ${taken.length} (${short} short) - borrow or the deck runs a slot light.`)
        }
    }
    own.sort((a, b) => cardStrength(b) - cardStrength(a))

    if (totalSlots(distribution) !== 6) notes.push(`Note: distribution sums to ${totalSlots(distribution)} slots, not 6.`)

    return { own, rental: { type: rentalType, reason: rentalReason }, distribution, gaps, notes }
}
