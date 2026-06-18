import type { Settings } from "../context/BotStateContext"
import { findParentFarmingCharacterBundle } from "./parentFarmingCharacterBundles"
import { findParentFarmingGoalPreset } from "./parentFarmingGoalPresets"
import type { ParentFarmingGoalQueueItem } from "./parentFarmingGoalQueue"

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

/** Applies active breeding generation target factors to racing settings for harvest OCR. */
export const applyBreedingGenerationToSettings = (settings: Settings, generationIndex: number): Settings => {
    const plan = parseParentFarmingBreedingPlan(settings.racing.parentFarmingBreedingPlan)
    const gen = plan.generations[generationIndex]
    if (!gen) return settings

    let next = {
        ...settings,
        racing: {
            ...settings.racing,
            parentFarmingTargetFactorSkills: JSON.stringify(gen.targetFactorSkills),
        },
    }

    if (gen.bundleKey) {
        const bundle = findParentFarmingCharacterBundle(gen.bundleKey)
        if (bundle) {
            next = {
                ...next,
                racing: {
                    ...next.racing,
                    parentFarmingBundleKey: bundle.key,
                    parentFarmingBundleLabel: bundle.label,
                    parentFarmingGoalPresetKey: bundle.goalPresetKey,
                    smartRaceSolverCharacterPreset: bundle.characterName,
                },
            }
        }
    } else if (gen.goalPresetKey) {
        const preset = findParentFarmingGoalPreset(gen.goalPresetKey)
        if (preset) {
            next = {
                ...next,
                racing: {
                    ...next.racing,
                    parentFarmingGoalPresetKey: preset.key,
                    parentFarmingGoalPresetLabel: preset.label,
                },
            }
        }
    }

    return next
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
