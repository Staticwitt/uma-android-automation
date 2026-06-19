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

export interface ParentFarmingBreedingPlanWarning {
    generationIndex: number
    label: string
    message: string
}

/**
 * Flags generations whose bundleKey/goalPresetKey don't resolve to a known entry. applyBreedingGenerationToSettings
 * silently no-ops on an unresolved key (the generation just inherits the previous generation's settings unchanged),
 * so this is the only signal the user gets that an imported/hand-edited plan has a stale or typo'd key.
 */
export const validateBreedingPlan = (plan: ParentFarmingBreedingPlan): ParentFarmingBreedingPlanWarning[] => {
    const warnings: ParentFarmingBreedingPlanWarning[] = []
    plan.generations.forEach((gen, index) => {
        const label = gen.label || `Gen ${index + 1}`
        if (gen.bundleKey) {
            if (!findParentFarmingCharacterBundle(gen.bundleKey)) {
                warnings.push({
                    generationIndex: index,
                    label,
                    message: `Unknown character bundle "${gen.bundleKey}" — this generation will keep the previous generation's settings unchanged.`,
                })
            }
        } else if (gen.goalPresetKey) {
            if (!findParentFarmingGoalPreset(gen.goalPresetKey)) {
                warnings.push({
                    generationIndex: index,
                    label,
                    message: `Unknown goal preset "${gen.goalPresetKey}" — this generation will keep the previous generation's settings unchanged.`,
                })
            }
        } else {
            warnings.push({
                generationIndex: index,
                label,
                message: "No goal preset or character bundle selected — this generation will keep the previous generation's settings unchanged.",
            })
        }
    })
    return warnings
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

export interface ParentFarmingBuiltInBreedingPlan {
    key: string
    label: string
    description: string
    plan: ParentFarmingBreedingPlan
}

/** Curated breeding plans selectable in the editor's empty state, without needing to hand-edit JSON. */
export const builtInBreedingPlans = (): ParentFarmingBuiltInBreedingPlan[] => [
    {
        key: "generic-2gen",
        label: "Generic 2-gen template",
        description: "Skill-hint base parent, then a fan/epithet chase with a factor target. Good starting point for any pair.",
        plan: defaultBreedingPlan(),
    },
    {
        key: "grass-wonder-oguri",
        label: "Grass Wonder → Ashen Miracle Oguri",
        description: "Mile parent first, then Oguri Cap inheriting Grass Wonder as legacy for Gourmand / Triple 7s / Corner Recovery.",
        plan: {
            generations: [
                {
                    label: "Gen 1 — Grass Wonder mile parent",
                    bundleKey: "grass-wonder-mile",
                    targetFactorSkills: [],
                    usePreviousAsLegacy: false,
                },
                {
                    label: "Gen 2 — Ashen Miracle Oguri",
                    bundleKey: "oguri-cap-g1",
                    targetFactorSkills: ["Gourmand", "Triple 7s", "Corner Recovery ○"],
                    usePreviousAsLegacy: true,
                },
            ],
        },
    },
    {
        key: "special-week-gold-ship",
        label: "Special Week → Gold Ship",
        description: "Two G1 / fan parents back to back — Special Week first, then Gold Ship inheriting her as legacy.",
        plan: {
            generations: [
                { label: "Gen 1 — Special Week G1 parent", bundleKey: "special-week-g1", targetFactorSkills: [], usePreviousAsLegacy: false },
                { label: "Gen 2 — Gold Ship G1 parent", bundleKey: "gold-ship-g1", targetFactorSkills: [], usePreviousAsLegacy: true },
            ],
        },
    },
    {
        key: "classic-crown-chain",
        label: "Mejiro McQueen → Biwa Hayahide → Rice Shower",
        description: "Three-generation Classic Crown chain — each parent inherits the previous generation's legacy.",
        plan: {
            generations: [
                { label: "Gen 1 — Mejiro McQueen Crown parent", bundleKey: "mejiro-mcqueen-crown", targetFactorSkills: [], usePreviousAsLegacy: false },
                { label: "Gen 2 — Biwa Hayahide Crown parent", bundleKey: "biwa-hayahide-crown", targetFactorSkills: [], usePreviousAsLegacy: true },
                { label: "Gen 3 — Rice Shower Crown parent", bundleKey: "rice-shower-crown", targetFactorSkills: [], usePreviousAsLegacy: true },
            ],
        },
    },
    {
        key: "vodka-king-halo",
        label: "Vodka → King Halo",
        description: "Triple Tiara parent pair — Vodka first, then King Halo inheriting her as legacy.",
        plan: {
            generations: [
                { label: "Gen 1 — Vodka Triple Tiara parent", bundleKey: "vodka-tiara", targetFactorSkills: [], usePreviousAsLegacy: false },
                { label: "Gen 2 — King Halo Triple Tiara parent", bundleKey: "king-halo-tiara", targetFactorSkills: [], usePreviousAsLegacy: true },
            ],
        },
    },
    {
        key: "agnes-tachyon-special-week",
        label: "Agnes Tachyon → Special Week (URA Finals)",
        description: "Skill-hint base parent, then Special Week chasing a URA Finals run with Agnes Tachyon as legacy.",
        plan: {
            generations: [
                { label: "Gen 1 — Agnes Tachyon skill-hint parent", bundleKey: "agnes-tachyon-skill-hints", targetFactorSkills: [], usePreviousAsLegacy: false },
                { label: "Gen 2 — Special Week URA Finals parent", bundleKey: "special-week-ura", targetFactorSkills: [], usePreviousAsLegacy: true },
            ],
        },
    },
    {
        key: "super-creek-symboli-rudolf",
        label: "Super Creek → Symboli Rudolf",
        description: "Stamina-focused stayer parent first, then Symboli Rudolf's Senior Finale run inheriting that stamina legacy.",
        plan: {
            generations: [
                { label: "Gen 1 — Super Creek stayer parent", bundleKey: "super-creek-stayer", targetFactorSkills: [], usePreviousAsLegacy: false },
                { label: "Gen 2 — Symboli Rudolf Senior Finale parent", bundleKey: "symboli-rudolf-senior", targetFactorSkills: [], usePreviousAsLegacy: true },
            ],
        },
    },
    {
        key: "tokai-teio-nice-nature-unity",
        label: "Tokai Teio → Nice Nature (Unity Aoharu)",
        description: "Both parents built for the Unity Aoharu scenario — Tokai Teio first, then Nice Nature inheriting her as legacy.",
        plan: {
            generations: [
                { label: "Gen 1 — Tokai Teio Unity Aoharu parent", bundleKey: "tokai-teio-unity", targetFactorSkills: [], usePreviousAsLegacy: false },
                { label: "Gen 2 — Nice Nature Unity Aoharu parent", bundleKey: "nice-nature-unity", targetFactorSkills: [], usePreviousAsLegacy: true },
            ],
        },
    },
    {
        key: "silence-suzuka-maruzensky",
        label: "Silence Suzuka → Maruzensky",
        description: "Mile / sprint parent pair distinct from the Grass Wonder route — Silence Suzuka first, then Maruzensky inheriting her as legacy.",
        plan: {
            generations: [
                { label: "Gen 1 — Silence Suzuka mile parent", bundleKey: "silence-suzuka-mile", targetFactorSkills: [], usePreviousAsLegacy: false },
                { label: "Gen 2 — Maruzensky sprint parent", bundleKey: "maruzensky-sprint", targetFactorSkills: [], usePreviousAsLegacy: true },
            ],
        },
    },
]
