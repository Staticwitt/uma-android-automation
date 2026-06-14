import type { SupportCardType } from "./supportCardCatalog"
import { supportCardType } from "./supportCardCatalog"
import type { SupportDeckPreset } from "./supportDeckPresets"

/** Target stat-type counts for owned support slots (four cards). */
export type SupportTypeTargets = Partial<Record<SupportCardType, number>>

/** Goal-route archetype → preferred support types. */
export const SUPPORT_TYPE_TARGETS_BY_GOAL: Record<string, SupportTypeTargets> = {
    "g1-fans": { Speed: 2, Wit: 2 },
    "mile-sprint": { Speed: 3, Wit: 1 },
    "medium-long": { Stamina: 2, Speed: 1, Wit: 1 },
    "classic-crown": { Stamina: 2, Power: 1, Wit: 1 },
    "stayer-stamina": { Stamina: 3, Wit: 1 },
    "dirt": { Power: 2, Guts: 1, Wit: 1 },
    "skill-hints": { Wit: 3, Speed: 1 },
    "triple-tiara": { Speed: 2, Power: 1, Wit: 1 },
    "derby-stayer-line": { Stamina: 2, Power: 1, Wit: 1 },
}

const countTypes = (cards: string[]): Record<SupportCardType, number> => {
    const counts: Record<SupportCardType, number> = {
        Speed: 0,
        Stamina: 0,
        Power: 0,
        Guts: 0,
        Wit: 0,
        Groupe: 0,
    }
    for (const name of cards) {
        const type = supportCardType(name)
        if (type) counts[type] += 1
    }
    return counts
}

const scoreSubset = (cards: string[], targets: SupportTypeTargets, presetOwned: string[]): number => {
    const counts = countTypes(cards)
    let score = 0
    for (const [type, target] of Object.entries(targets) as Array<[SupportCardType, number]>) {
        const have = counts[type] ?? 0
        score += Math.min(have, target) * 10
        if (have < target) score -= (target - have) * 4
    }
    for (const name of cards) {
        if (presetOwned.includes(name)) score += 2
    }
    return score
}

const combinationsOfFour = (pool: string[]): string[][] => {
    const out: string[][] = []
    const n = pool.length
    for (let a = 0; a < n; a++) {
        for (let b = a + 1; b < n; b++) {
            for (let c = b + 1; c < n; c++) {
                for (let d = c + 1; d < n; d++) {
                    out.push([pool[a], pool[b], pool[c], pool[d]])
                }
            }
        }
    }
    return out
}

/**
 * Picks the best four owned supports from inventory for a route archetype.
 * Falls back to [fallbackOwned] when inventory is too small for a search.
 */
export const optimizeOwnedDeckFromInventory = (
    inventory: string[],
    traineeName: string,
    deck: SupportDeckPreset,
    fallbackOwned: string[],
    goalPresetKey: string,
): string[] => {
    const targets = SUPPORT_TYPE_TARGETS_BY_GOAL[goalPresetKey] ?? SUPPORT_TYPE_TARGETS_BY_GOAL["g1-fans"]
    const pool = inventory.filter((name) => name && name !== traineeName)
    if (pool.length < 4) return fallbackOwned

    const searchPool = pool.length > 24 ? pool.slice(0, 24) : pool
    const combos = combinationsOfFour(searchPool)
    if (combos.length === 0) return fallbackOwned

    let best = combos[0]
    let bestScore = scoreSubset(best, targets, [])

    for (const combo of combos) {
        const score = scoreSubset(combo, targets, [])
        if (score > bestScore) {
            bestScore = score
            best = combo
        }
    }
    return best
}

/** Cards in a recommended owned deck that are not in the user's owned inventory. */
export const missingOwnedCards = (ownedCards: string[], inventory: string[]): string[] => {
    if (inventory.length === 0) return []
    const owned = new Set(inventory)
    return ownedCards.filter((name) => !owned.has(name))
}
