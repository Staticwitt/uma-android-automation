import type { SupportDeckPreset } from "./supportDeckPresets"
import {
    rankSupportsForGoal,
    scoreOwnedSupportDeck,
    SUPPORT_TYPE_TARGETS_BY_GOAL,
    type SupportTypeTargets,
} from "./supportDeckScoring"

export type { SupportTypeTargets }
export { SUPPORT_TYPE_TARGETS_BY_GOAL }

const scoreSubset = (cards: string[], goalPresetKey: string, presetOwned: string[]): number =>
    scoreOwnedSupportDeck(cards, goalPresetKey, presetOwned)

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
    const pool = inventory.filter((name) => name && name !== traineeName)
    if (pool.length < 4) return fallbackOwned

    const rankedPool = rankSupportsForGoal(pool, goalPresetKey, [traineeName])
    const searchPool = rankedPool.length > 24 ? rankedPool.slice(0, 24) : rankedPool
    const combos = combinationsOfFour(searchPool)
    if (combos.length === 0) return fallbackOwned

    let best = combos[0]
    let bestScore = scoreSubset(best, goalPresetKey, deck.owned)

    for (const combo of combos) {
        const score = scoreSubset(combo, goalPresetKey, deck.owned)
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
