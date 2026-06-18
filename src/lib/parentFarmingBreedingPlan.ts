import type { Settings } from "../context/BotStateContext"
import type { ParentFarmingGoalQueueItem, ParentFarmingGoalQueueResolvedPatch } from "./parentFarmingGoalQueue"
import { patchFromSettingsForBreeding } from "./parentFarmingGoalQueue"
import {
    applyParentFarmingCharacterBundle,
    applyParentFarmingGoalPreset,
} from "./parentFarmingResolver"
import { refreshParentFarmingSettings } from "./parentFarmingPreset"
import { applyParentFarmingScenarioSync } from "./parentFarmingScenarioSync"
import { findParentFarmingCharacterBundle } from "./parentFarmingCharacterBundles"
import { findParentFarmingGoalPreset } from "./parentFarmingGoalPresets"

export interface ParentFarmingBreedingGeneration {
    label: string
    bundleKey?: string
    goalPresetKey?: string
    targetFactorSkills: string[]
    usePreviousAsLegacy: boolean
}

export interface ParentFarmingBreedingPlan {
    generations: ParentFarmingBreedingGeneration[]
}

export const parseParentFarmingBreedingPlan = (json: string | undefined): ParentFarmingBreedingPlan => {
    try {
        const parsed = JSON.parse(json || "{}") as ParentFarmingBreedingPlan
        if (!parsed || !Array.isArray(parsed.generations)) return { generations: [] }
        return {
            generations: parsed.generations
                .filter((gen) => gen && typeof gen.label === "string")
                .map((gen) => ({
                    label: gen.label,
                    bundleKey: gen.bundleKey,
                    goalPresetKey: gen.goalPresetKey,
                    targetFactorSkills: Array.isArray(gen.targetFactorSkills)
                        ? gen.targetFactorSkills.filter((skill): skill is string => typeof skill === "string")
                        : [],
                    usePreviousAsLegacy: Boolean(gen.usePreviousAsLegacy),
                })),
        }
    } catch {
        return { generations: [] }
    }
}

export const serializeParentFarmingBreedingPlan = (plan: ParentFarmingBreedingPlan): string => JSON.stringify(plan)

/** Parses comma-separated factor skill input without dropping a trailing comma mid-edit. */
export const parseTargetFactorSkillsInput = (text: string): string[] =>
    text
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)

export const formatTargetFactorSkillsInput = (skills: string[]): string => skills.join(", ")

/** Converts breeding generations into goal-queue items for Kotlin multi-run cycling. */
export const breedingPlanToGoalQueue = (plan: ParentFarmingBreedingPlan): ParentFarmingGoalQueueItem[] => {
    const items: ParentFarmingGoalQueueItem[] = []
    for (const gen of plan.generations) {
        if (gen.bundleKey) items.push({ type: "bundle", key: gen.bundleKey, label: gen.label })
        else if (gen.goalPresetKey) items.push({ type: "preset", key: gen.goalPresetKey, label: gen.label })
    }
    return items
}

/** Applies one breeding generation (bundle/preset, factors, labels) through the full resolver. */
export const applyBreedingGenerationToSettings = (settings: Settings, generationIndex: number): Settings => {
    const plan = parseParentFarmingBreedingPlan(settings.racing.parentFarmingBreedingPlan)
    const gen = plan.generations[generationIndex]
    if (!gen) return settings

    let next: Settings
    if (gen.bundleKey) {
        const bundle = findParentFarmingCharacterBundle(gen.bundleKey)
        if (!bundle) return settings
        next = applyParentFarmingCharacterBundle(settings, bundle)
    } else if (gen.goalPresetKey) {
        const preset = findParentFarmingGoalPreset(gen.goalPresetKey)
        if (!preset) return settings
        next = applyParentFarmingGoalPreset(settings, preset, undefined, { mergeEpithets: false })
    } else {
        return settings
    }

    return {
        ...next,
        racing: {
            ...next.racing,
            parentFarmingTargetFactorSkills: JSON.stringify(gen.targetFactorSkills),
        },
    }
}

/** Resolves each breeding generation into Kotlin patches, wiring previous-gen legacy when requested. */
export const buildBreedingPlanGoalQueueResolved = (
    settings: Settings,
    plan: ParentFarmingBreedingPlan,
): ParentFarmingGoalQueueResolvedPatch[] => {
    const patches: ParentFarmingGoalQueueResolvedPatch[] = []

    for (let index = 0; index < plan.generations.length; index++) {
        const gen = plan.generations[index]
        let resolved = refreshParentFarmingSettings(applyParentFarmingScenarioSync(applyBreedingGenerationToSettings(settings, index)))

        if (gen.usePreviousAsLegacy && index > 0) {
            const previousCharacter = patches[index - 1]?.characterPreset?.trim()
            if (previousCharacter) {
                resolved = {
                    ...resolved,
                    racing: {
                        ...resolved.racing,
                        legacyParentPreferredPair: JSON.stringify([previousCharacter, ""]),
                    },
                }
            }
        }

        patches.push(
            patchFromSettingsForBreeding(resolved, gen.label || `Gen ${index + 1}`, {
                targetFactorSkills: JSON.stringify(gen.targetFactorSkills),
                usePreviousAsLegacy: gen.usePreviousAsLegacy,
            }),
        )
    }

    return patches
}

export const defaultBreedingPlan = (): ParentFarmingBreedingPlan => ({
    generations: [
        {
            label: "Gen 1 — base parent",
            goalPresetKey: "skill-hints",
            targetFactorSkills: [],
            usePreviousAsLegacy: false,
        },
        {
            label: "Gen 2 — factor chase",
            goalPresetKey: "g1-fans",
            targetFactorSkills: ["Professor of Curvature"],
            usePreviousAsLegacy: true,
        },
    ],
})
