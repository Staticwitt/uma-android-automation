import type { Settings } from "../context/BotStateContext"
import type { ParentFarmingCharacterBundle } from "./parentFarmingCharacterBundles"
import { findParentFarmingCharacterBundle } from "./parentFarmingCharacterBundles"
import { findSupportBorrowPreset } from "./supportBorrowPresets"

/** User overrides: bundle key → ordered support card names. */
export type ParentFarmingSupportBorrowOverrides = Record<string, string[]>

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

/**
 * Ordered borrow list for a bundle: user override → bundle default → goal preset fallback.
 */
export const resolveSupportBorrowCardsForBundle = (
    bundle: ParentFarmingCharacterBundle,
    overrides?: ParentFarmingSupportBorrowOverrides,
): string[] => {
    const custom = overrides?.[bundle.key]
    if (custom && custom.length > 0) return [...custom]
    if (bundle.supportBorrowCards?.length) return [...bundle.supportBorrowCards]
    return [...findSupportBorrowPreset(bundle.goalPresetKey)]
}

/** Resolves borrow cards for the active parent-farming bundle or goal preset on settings. */
export const resolveActiveSupportBorrowCards = (settings: Settings): string[] => {
    const overrides = parseSupportBorrowOverrides(settings.racing.parentFarmingSupportBorrowOverrides)
    const bundleKey = settings.racing.parentFarmingBundleKey
    if (bundleKey) {
        const bundle = findParentFarmingCharacterBundle(bundleKey)
        if (bundle) return resolveSupportBorrowCardsForBundle(bundle, overrides)
    }
    const goalKey = settings.racing.parentFarmingGoalPresetKey
    if (goalKey) return [...findSupportBorrowPreset(goalKey)]
    try {
        const parsed = JSON.parse(settings.racing.supportBorrowPreferredCards || "[]")
        if (Array.isArray(parsed)) return parsed.filter((n): n is string => typeof n === "string")
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
