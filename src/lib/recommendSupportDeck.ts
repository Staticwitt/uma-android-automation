import characterPresetsData from "../data/characterPresets.json"
import {
    findCharacterPresetEntry,
    PARENT_FARMING_CHARACTER_BUNDLES,
    type ParentFarmingCharacterBundle,
} from "./parentFarmingCharacterBundles"
import { findParentFarmingGoalPreset } from "./parentFarmingGoalPresets"
import { findSupportBorrowPreset } from "./supportBorrowPresets"
import { findSupportDeckPreset } from "./supportDeckPresets"
import { supportCardType, type SupportCardType } from "./supportCardCatalog"
import { formatSupportCardMetadataSummary, getSupportCardMetadata } from "./supportCardMetadata"
import { rankSupportsForGoal, type LimitBreakResolver } from "./supportDeckScoring"
import { optimizeOwnedDeckFromInventory, missingOwnedCards as computeMissingOwnedCards } from "./optimizeSupportDeck"
import { APTITUDE_RANKS, type CharacterPresetEntry } from "./solver/constants"

export type SupportRecommendationSource = "character-bundle" | "goal-preset" | "aptitude-inferred"

export interface SupportDeckSlot {
    role: "trainee" | "owned" | "friend"
    cardName: string
    type?: SupportCardType
    note?: string
    metadataSummary?: string
}

export interface SupportDeckRecommendation {
    characterName: string
    goalPresetKey: string
    goalLabel: string
    archetype: string
    rationale: string
    source: SupportRecommendationSource
    bundleKey?: string
    /** Full lineup: trainee + four owned + friend borrow. */
    slots: SupportDeckSlot[]
    /** Four owned support slots (trainee card excluded). */
    ownedCards: string[]
    /** Ordered friend borrow list for auto-borrow (friend first, then alternates). */
    friendBorrowOrder: string[]
    /** Recommended owned cards not present in [RecommendSupportDeckOptions.ownedInventory]. */
    missingOwnedCards?: string[]
}

export interface RecommendSupportDeckOptions {
    /** When set, owned slots prefer cards from this inventory and swap unknowns when possible. */
    ownedInventory?: string[]
    /** Per-card limit break resolver; defaults to MLB when omitted. */
    getLimitBreak?: LimitBreakResolver
}

const CHARACTER_PRESETS = characterPresetsData as Record<string, CharacterPresetEntry>

const rankIndex = (grade: string): number => {
    const idx = APTITUDE_RANKS.indexOf(grade)
    return idx === -1 ? APTITUDE_RANKS.length : idx
}

const isGradeAtLeast = (grade: string, min: string): boolean => rankIndex(grade) <= rankIndex(min)

/**
 * Picks a parent-farming goal preset when no character bundle exists.
 */
export const inferGoalPresetKeyFromAptitudes = (preset: CharacterPresetEntry): string => {
    const d = preset.distanceAptitudes
    const s = preset.surfaceAptitudes

    if (isGradeAtLeast(s.Dirt, "B") && rankIndex(s.Turf) >= rankIndex("C")) return "dirt"
    if (isGradeAtLeast(d.Long, "A") && rankIndex(d.Sprint) >= rankIndex("C")) return "stayer-stamina"
    if (isGradeAtLeast(d.Medium, "A") && isGradeAtLeast(d.Long, "A")) return "classic-crown"
    if (isGradeAtLeast(d.Mile, "A") || isGradeAtLeast(d.Sprint, "A")) return "mile-sprint"
    if (isGradeAtLeast(d.Medium, "B")) return "medium-long"
    return "g1-fans"
}

const findBundleForCharacter = (characterName: string): ParentFarmingCharacterBundle | undefined =>
    PARENT_FARMING_CHARACTER_BUNDLES.find((b) => b.characterName === characterName)

const dedupeNames = (names: string[]): string[] => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const name of names) {
        if (!name || seen.has(name)) continue
        seen.add(name)
        out.push(name)
    }
    return out
}

const substituteIfTrainee = (owned: string[], traineeName: string, alternates: string[]): string[] => {
    const out = [...owned]
    for (let i = 0; i < out.length; i++) {
        if (out[i] === traineeName) {
            const replacement = alternates.find((alt) => alt !== traineeName && !out.includes(alt))
            if (replacement) out[i] = replacement
        }
    }
    return out
}

const preferInventoryOwned = (owned: string[], inventory: Set<string>, alternates: string[]): string[] => {
    if (inventory.size === 0) return owned
    return owned.map((name) => {
        if (inventory.has(name)) return name
        const swap = alternates.find((alt) => inventory.has(alt) && !owned.includes(alt))
        return swap ?? name
    })
}

/** Final owned slots: inventory-preferred, then trainee substituted out. */
const resolveOwnedSlots = (
    traineeName: string,
    presetOwned: string[],
    goalPresetKey: string,
    ownedInventory?: string[],
): string[] => {
    const alternates = findSupportBorrowPreset(goalPresetKey)
    const inventory = new Set(ownedInventory ?? [])
    const preferred = preferInventoryOwned(presetOwned, inventory, alternates)
    return substituteIfTrainee(preferred, traineeName, alternates)
}

const buildSlots = (traineeName: string, owned: string[], friend: string): SupportDeckSlot[] => {
    const slots: SupportDeckSlot[] = [
        {
            role: "trainee",
            cardName: traineeName,
            note: "Your trainee card slot",
        },
    ]

    for (const name of owned) {
        const meta = getSupportCardMetadata(name)
        slots.push({
            role: "owned",
            cardName: name,
            type: supportCardType(name),
            metadataSummary: meta ? formatSupportCardMetadataSummary(meta) : undefined,
        })
    }

    slots.push({
        role: "friend",
        cardName: friend,
        type: supportCardType(friend),
        note: "Friend borrow at career selection",
        metadataSummary: getSupportCardMetadata(friend)
            ? formatSupportCardMetadataSummary(getSupportCardMetadata(friend)!)
            : undefined,
    })

    return slots
}

/**
 * Ranked friend-borrow candidates against the *final* owned slots (post trainee-substitution),
 * so the friend pick never duplicates a card the owned deck already resolved to.
 */
const buildFriendBorrowOrder = (
    traineeName: string,
    owned: string[],
    deckFriend: string,
    goalPresetKey: string,
    bundleBorrow?: string[],
    getLimitBreak?: LimitBreakResolver,
): string[] => {
    const presetBorrow = dedupeNames([...(bundleBorrow ?? []), ...findSupportBorrowPreset(goalPresetKey)])
    const ownedSet = new Set(owned.map((n) => n.toLowerCase()))
    const isOwned = (name: string) => ownedSet.has(name.toLowerCase())

    // Borrowing a card already in the owned deck wastes the friend slot, so a genuinely
    // distinct candidate always outranks an owned-deck duplicate when one exists.
    const nonOwnedCandidates = presetBorrow.filter((n) => n !== traineeName && !isOwned(n))
    const ownedAlternates = owned.filter((n) => n !== traineeName)

    const rankedNonOwned = rankSupportsForGoal(nonOwnedCandidates, goalPresetKey, [traineeName], presetBorrow, undefined, getLimitBreak)
    const rankedOwned = rankSupportsForGoal(ownedAlternates, goalPresetKey, [traineeName], presetBorrow, undefined, getLimitBreak)

    if (rankedNonOwned.length > 0) return dedupeNames([...rankedNonOwned, ...rankedOwned])
    return dedupeNames([deckFriend, ...rankedOwned].filter(Boolean))
}

/**
 * Recommended support lineup for a specific Uma (trainee character).
 *
 * @param characterName Character preset name (e.g. "Grass Wonder").
 * @returns Recommendation, or null when the character is unknown.
 */
export const recommendSupportDeckForCharacter = (
    characterName: string,
    options?: RecommendSupportDeckOptions,
): SupportDeckRecommendation | null => {
    const preset = findCharacterPresetEntry(characterName) ?? CHARACTER_PRESETS[characterName]
    if (!preset) return null

    const bundle = findBundleForCharacter(characterName)
    let goalPresetKey: string
    let source: SupportRecommendationSource
    let bundleBorrow: string[] | undefined

    if (bundle) {
        goalPresetKey = bundle.goalPresetKey
        source = "character-bundle"
        bundleBorrow = bundle.supportBorrowCards
    } else {
        goalPresetKey = inferGoalPresetKeyFromAptitudes(preset)
        source = "goal-preset"
    }

    const goalPreset = findParentFarmingGoalPreset(goalPresetKey)
    const deck = findSupportDeckPreset(goalPresetKey)
    const inventory = options?.ownedInventory ?? []
    const getLimitBreak = options?.getLimitBreak
    const presetOwned =
        inventory.length >= 4
            ? optimizeOwnedDeckFromInventory(inventory, characterName, deck, deck.owned, goalPresetKey, getLimitBreak)
            : deck.owned
    const owned = resolveOwnedSlots(characterName, presetOwned, goalPresetKey, inventory.length >= 4 ? undefined : options?.ownedInventory)
    const friendBorrowOrder = buildFriendBorrowOrder(characterName, owned, deck.friend, goalPresetKey, bundleBorrow, getLimitBreak)
    const slots = buildSlots(characterName, owned, friendBorrowOrder[0])
    const ownedCards = slots.filter((s) => s.role === "owned").map((s) => s.cardName)

    const rationale =
        bundle
            ? `Matches the "${bundle.label}" parent-farming setup for this character.`
            : `No dedicated parent bundle — inferred "${goalPreset?.label ?? goalPresetKey}" from aptitudes (Sprint ${preset.distanceAptitudes.Sprint}, Mile ${preset.distanceAptitudes.Mile}, Medium ${preset.distanceAptitudes.Medium}, Long ${preset.distanceAptitudes.Long}, Turf ${preset.surfaceAptitudes.Turf}, Dirt ${preset.surfaceAptitudes.Dirt}).`

    return {
        characterName: preset.name,
        goalPresetKey,
        goalLabel: goalPreset?.label ?? goalPresetKey,
        archetype: deck.archetype,
        rationale,
        source,
        bundleKey: bundle?.key,
        slots,
        ownedCards,
        friendBorrowOrder,
        missingOwnedCards: inventory.length > 0 ? computeMissingOwnedCards(ownedCards, inventory) : undefined,
    }
}

/** Plain-text deck summary for clipboard or logs. */
export const formatSupportDeckClipboard = (recommendation: SupportDeckRecommendation): string => {
    const lines = [`Trainee: ${recommendation.characterName}`, `Route: ${recommendation.goalLabel}`]
    recommendation.ownedCards.forEach((name, index) => {
        const type = supportCardType(name)
        lines.push(`Support ${index + 1}: ${name}${type ? ` (${type})` : ""}`)
    })
    const friend = recommendation.slots.find((s) => s.role === "friend")
    if (friend) lines.push(`Friend borrow: ${friend.cardName}`)
    lines.push(`Auto-borrow priority: ${recommendation.friendBorrowOrder.join(" → ")}`)
    return lines.join("\n")
}

export const parseOwnedSupportCards = (json: string | undefined): string[] => {
    try {
        const parsed = JSON.parse(json || "[]")
        if (!Array.isArray(parsed)) return []
        return parsed.filter((n): n is string => typeof n === "string" && n.trim().length > 0)
    } catch {
        return []
    }
}

/** All character names available for the support finder UI. */
export const listCharactersForSupportFinder = (): CharacterPresetEntry[] =>
    Object.values(CHARACTER_PRESETS).sort((a, b) => a.name.localeCompare(b.name))
