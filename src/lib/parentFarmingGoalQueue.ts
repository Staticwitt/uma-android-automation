import type { Settings } from "../context/BotStateContext"
import { buildFullDeckApplyRacingPatch } from "./parentFarmingCareerAutomation"
import {
    applyParentFarmingCharacterBundle,
    applyParentFarmingGoalPreset,
    enableParentFarmingCharacterBundle,
} from "./parentFarmingResolver"
import { aptitudesFromCharacterPreset, findCharacterPresetEntry, findParentFarmingCharacterBundle } from "./parentFarmingCharacterBundles"
import { findParentFarmingGoalPreset } from "./parentFarmingGoalPresets"

export interface ParentFarmingGoalQueueItem {
    type: "bundle" | "preset"
    key: string
    label?: string
}

/** Compact patch stored for Kotlin to apply between multi-run careers without React. */
export interface ParentFarmingGoalQueueResolvedPatch {
    label: string
    bundleKey: string
    goalPresetKey: string
    scenario: string
    characterPreset: string
    aptitudes: string
    targetEpithets: string
    forcedEpithets: string
    weights: string
    sparkStrategy: string
    legacyStrategy: string
    supportBorrow: string
    preferredDistanceOverride: string
    enablePrioritizeSkillHints: boolean
}

export const parseParentFarmingGoalQueue = (json: string | undefined): ParentFarmingGoalQueueItem[] => {
    try {
        const parsed = JSON.parse(json || "[]")
        if (!Array.isArray(parsed)) return []
        return parsed
            .map((raw): ParentFarmingGoalQueueItem | null => {
                if (!raw || typeof raw !== "object") return null
                const item = raw as Record<string, unknown>
                const type = item.type === "bundle" || item.type === "preset" ? item.type : null
                const key = typeof item.key === "string" ? item.key : ""
                if (!type || !key) return null
                return {
                    type,
                    key,
                    ...(typeof item.label === "string" ? { label: item.label } : {}),
                }
            })
            .filter((item): item is ParentFarmingGoalQueueItem => item !== null)
    } catch {
        return []
    }
}

export const parseParentFarmingGoalQueueResolved = (json: string | undefined): ParentFarmingGoalQueueResolvedPatch[] => {
    try {
        const parsed = JSON.parse(json || "[]")
        if (!Array.isArray(parsed)) return []
        return parsed.filter((item): item is ParentFarmingGoalQueueResolvedPatch => {
            return Boolean(item && typeof item === "object" && typeof (item as ParentFarmingGoalQueueResolvedPatch).label === "string")
        })
    } catch {
        return []
    }
}

const resolveQueueItem = (settings: Settings, item: ParentFarmingGoalQueueItem): Settings => {
    if (item.type === "bundle") {
        const bundle = findParentFarmingCharacterBundle(item.key)
        if (!bundle) return settings
        return applyParentFarmingCharacterBundle(settings, bundle)
    }
    const preset = findParentFarmingGoalPreset(item.key)
    if (!preset) return settings
    return applyParentFarmingGoalPreset(settings, preset, undefined, { mergeEpithets: false })
}

const patchFromSettings = (settings: Settings, label: string): ParentFarmingGoalQueueResolvedPatch => ({
    label,
    bundleKey: settings.racing.parentFarmingBundleKey || "",
    goalPresetKey: settings.racing.parentFarmingGoalPresetKey || "",
    scenario: settings.general?.scenario || "Trackblazer",
    characterPreset: settings.racing.smartRaceSolverCharacterPreset || "Special Week",
    aptitudes: settings.racing.smartRaceSolverAptitudes || "{}",
    targetEpithets: settings.racing.smartRaceSolverTargetEpithets || "[]",
    forcedEpithets: settings.racing.smartRaceSolverForcedEpithets || "[]",
    weights: settings.racing.smartRaceSolverWeights || "{}",
    sparkStrategy: settings.racing.sparkSelectionStrategy || "Default",
    legacyStrategy: settings.racing.legacyParentSelectionStrategy || "Default",
    supportBorrow: settings.racing.supportBorrowPreferredCards || "[]",
    preferredDistanceOverride: settings.training.preferredDistanceOverride || "Default",
    enablePrioritizeSkillHints: settings.training.enablePrioritizeSkillHints ?? false,
})

/** Resolves each queue item into a Kotlin-readable patch list. */
export const buildParentFarmingGoalQueueResolved = (settings: Settings, items: ParentFarmingGoalQueueItem[]): ParentFarmingGoalQueueResolvedPatch[] =>
    items.map((item) => {
        const resolved = resolveQueueItem(settings, item)
        const label =
            item.label ||
            (item.type === "bundle"
                ? findParentFarmingCharacterBundle(item.key)?.label
                : findParentFarmingGoalPreset(item.key)?.label) ||
            item.key
        return patchFromSettings(resolved, label)
    })

export const serializeParentFarmingGoalQueueResolved = (patches: ParentFarmingGoalQueueResolvedPatch[]): string => JSON.stringify(patches)

export const formatGoalQueueSummary = (items: ParentFarmingGoalQueueItem[]): string => {
    if (items.length === 0) return "No goals queued"
    const labels = items.map((item) => item.label || item.key)
    if (labels.length <= 3) return labels.join(" → ")
    return `${labels.slice(0, 2).join(" → ")} → … (${labels.length} goals)`
}

/** Applies bundle with optional owned-deck auto-equip when inventory is saved. */
export const applyCharacterBundleWithOwnedDeck = (
    settings: Settings,
    bundleKey: string,
    options?: { autoApplyOwnedDeck?: boolean },
): Settings => {
    let next = enableParentFarmingCharacterBundle(settings, bundleKey)
    if (!options?.autoApplyOwnedDeck) return next

    const owned = (() => {
        try {
            const parsed = JSON.parse(next.racing.ownedSupportCards || "[]")
            return Array.isArray(parsed) ? parsed.filter((n): n is string => typeof n === "string" && n.length > 0) : []
        } catch {
            return []
        }
    })()
    if (owned.length < 4) return next

    const bundle = findParentFarmingCharacterBundle(bundleKey)
    const characterName = bundle?.characterName || next.racing.smartRaceSolverCharacterPreset
    const preset = findCharacterPresetEntry(characterName)
    const aptitudesJson = preset ? JSON.stringify(aptitudesFromCharacterPreset(preset)) : undefined
    let borrowOrder: string[] = []
    try {
        borrowOrder = JSON.parse(next.racing.supportBorrowPreferredCards || "[]")
    } catch {
        borrowOrder = []
    }

    return {
        ...next,
        racing: buildFullDeckApplyRacingPatch(next.racing, owned, borrowOrder, characterName, aptitudesJson),
    }
}
