import type { Settings } from "../context/BotStateContext"
import type { ParentFarmingCharacterBundle } from "./parentFarmingCharacterBundles"
import { findParentFarmingCharacterBundle } from "./parentFarmingCharacterBundles"
import { findSupportBorrowPreset } from "./supportBorrowPresets"
import { DEFAULT_SUPPORT_BORROW_SORT_MODE, rankSupportsForGoal, type SupportBorrowSortMode } from "./supportDeckScoring"

/** User overrides: bundle key → ordered support card names. */
export type ParentFarmingSupportBorrowOverrides = Record<string, string[]>

/** Case-insensitive match for trainee vs support card name. */
export const namesMatchTrainee = (name: string, traineeName: string): boolean =>
    name.trim().toLowerCase() === traineeName.trim().toLowerCase()

/**
 * Removes the trainee character from a borrow priority list and backfills from [alternates]
 * so auto-borrow never targets the Uma being trained.
 */
export const excludeTraineeFromSupportList = (
    names: string[],
    traineeName: string,
    alternates: string[] = [],
): string[] => {
    if (!traineeName.trim()) return [...names]
    const filtered = names.filter((name) => !namesMatchTrainee(name, traineeName))
    if (filtered.length === names.length) return filtered
    for (const alt of alternates) {
        if (!namesMatchTrainee(alt, traineeName) && !filtered.some((name) => namesMatchTrainee(name, alt))) {
            filtered.push(alt)
        }
    }
    return filtered
}

/** Removes case-insensitive duplicate names, keeping the first occurrence's casing. */
const dedupeCaseInsensitive = (names: string[]): string[] => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const name of names) {
        const key = name.trim().toLowerCase()
        if (!key || seen.has(key)) continue
        seen.add(key)
        out.push(name)
    }
    return out
}

/**
 * Replaces owned support slots that match the trainee with alternates from the borrow preset,
 * and drops duplicate slots so the same card is never assigned to two slots.
 */
export const substituteTraineeInOwnedDeck = (
    owned: string[],
    traineeName: string,
    alternates: string[],
): string[] => {
    const out = [...owned]
    for (let i = 0; i < out.length; i++) {
        if (namesMatchTrainee(out[i], traineeName)) {
            const replacement = alternates.find((alt) => !namesMatchTrainee(alt, traineeName) && !out.some((slot) => namesMatchTrainee(slot, alt)))
            if (replacement) out[i] = replacement
        }
    }
    return dedupeCaseInsensitive(out.filter((name) => !namesMatchTrainee(name, traineeName)))
}

export const parseSupportBorrowOverrides = (json: string | undefined): ParentFarmingSupportBorrowOverrides => {
    try {
        const parsed = JSON.parse(json || "{}")
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
        const result: ParentFarmingSupportBorrowOverrides = {}
        for (const [key, value] of Object.entries(parsed)) {
            if (Array.isArray(value)) {
                result[key] = value.filter((name): name is string => typeof name === "string" && name.trim().length > 0)
            }
        }
        return result
    } catch {
        return {}
    }
}

/** Re-ranks borrow candidates using parsed event metadata for the bundle's goal route. */
export const rankSupportBorrowCardsForBundle = (
    names: string[],
    bundle: ParentFarmingCharacterBundle,
    sortMode: SupportBorrowSortMode = DEFAULT_SUPPORT_BORROW_SORT_MODE,
): string[] => rankSupportsForGoal(names, bundle.goalPresetKey, [bundle.characterName], names, sortMode)

/**
 * Ordered borrow list for a bundle: user override → bundle default → goal preset fallback.
 */
export const resolveSupportBorrowCardsForBundle = (
    bundle: ParentFarmingCharacterBundle,
    overrides?: ParentFarmingSupportBorrowOverrides,
    sortMode: SupportBorrowSortMode = DEFAULT_SUPPORT_BORROW_SORT_MODE,
): string[] => {
    const alternates = findSupportBorrowPreset(bundle.goalPresetKey)
    const custom = overrides?.[bundle.key]
    let cards: string[]
    if (custom && custom.length > 0) {
        cards = [...custom]
    } else if (bundle.supportBorrowCards?.length) {
        cards = [...bundle.supportBorrowCards]
    } else {
        cards = [...alternates]
    }
    return rankSupportBorrowCardsForBundle(
        excludeTraineeFromSupportList(cards, bundle.characterName, alternates),
        bundle,
        sortMode,
    )
}

/** Resolves borrow cards for the active parent-farming bundle or goal preset on settings. */
export const resolveActiveSupportBorrowCards = (settings: Settings): string[] => {
    const traineeName = settings.racing.smartRaceSolverCharacterPreset || ""
    const overrides = parseSupportBorrowOverrides(settings.racing.parentFarmingSupportBorrowOverrides)
    const sortMode = (settings.racing.supportBorrowSortMode as SupportBorrowSortMode) || DEFAULT_SUPPORT_BORROW_SORT_MODE
    const bundleKey = settings.racing.parentFarmingBundleKey
    if (bundleKey) {
        const bundle = findParentFarmingCharacterBundle(bundleKey)
        if (bundle) return resolveSupportBorrowCardsForBundle(bundle, overrides, sortMode)
    }
    const goalKey = settings.racing.parentFarmingGoalPresetKey
    if (goalKey) {
        return rankSupportsForGoal(
            excludeTraineeFromSupportList(findSupportBorrowPreset(goalKey), traineeName, findSupportBorrowPreset(goalKey)),
            goalKey,
            traineeName ? [traineeName] : [],
            findSupportBorrowPreset(goalKey),
            sortMode,
        )
    }
    try {
        const parsed = JSON.parse(settings.racing.supportBorrowPreferredCards || "[]")
        if (Array.isArray(parsed)) {
            const names = parsed.filter((n): n is string => typeof n === "string")
            return excludeTraineeFromSupportList(names, traineeName, names)
        }
    } catch {
        // Fall through.
    }
    return []
}

export const formatSupportBorrowPreview = (names: string[], max = 3): string => {
    if (names.length === 0) return "None selected"
    const head = names.slice(0, max).join(" → ")
    return names.length > max ? `${head} …` : head
}
