import type { Settings } from "../context/BotStateContext"
import characterPresetsData from "../data/characterPresets.json"
import epithetsData from "../data/epithets.json"
import { applyParentFarmingPreset } from "./parentFarmingPreset"
import {
    applyParentFarmingGoalPresetToRacing,
    applyParentFarmingGoalPresetToTraining,
    PARENT_FARMING_GOAL_PRESETS,
    type ParentFarmingGoalPreset,
} from "./parentFarmingGoalPresets"
import { AptitudeMap, CharacterPresetEntry, EpithetEntry, type WeightsMap } from "./solver/constants"
import { charactersForEpithet, scenariosForEpithet } from "./solver/scoring"

export interface ParentFarmingCharacterBundle {
    key: string
    /** Short card title, e.g. "Grass Wonder — Mile Parent". */
    label: string
    description: string
    characterName: string
    goalPresetKey: string
    trainingOverrides?: Partial<Settings["training"]>
    weightOverrides?: Partial<WeightsMap>
}

const CHARACTER_PRESETS = characterPresetsData as Record<string, CharacterPresetEntry>
const ALL_EPITHETS = Object.values(epithetsData) as EpithetEntry[]

export const PARENT_FARMING_CHARACTER_BUNDLES: ParentFarmingCharacterBundle[] = [
    {
        key: "grass-wonder-mile",
        label: "Grass Wonder — Mile Parent",
        description: "Mile-focused G1 and fan epithets with Mile training bias.",
        characterName: "Grass Wonder",
        goalPresetKey: "mile-sprint",
    },
    {
        key: "oguri-cap-g1",
        label: "Oguri Cap — G1 / Fan Parent",
        description: "High fan volume and broad G1 inheritance history.",
        characterName: "Oguri Cap",
        goalPresetKey: "g1-fan",
    },
    {
        key: "maruzensky-sprint",
        label: "Maruzensky — Sprint Parent",
        description: "Sprint and mile G1 clusters for short-distance inheritance.",
        characterName: "Maruzensky",
        goalPresetKey: "mile-sprint",
        trainingOverrides: { preferredDistanceOverride: "Sprint" },
    },
    {
        key: "silence-suzuka-mile",
        label: "Silence Suzuka — Mile Parent",
        description: "Mile and sprint epithets tuned for Suzuka's mile strengths.",
        characterName: "Silence Suzuka",
        goalPresetKey: "mile-sprint",
    },
    {
        key: "haru-urara-dirt",
        label: "Haru Urara — Dirt Parent",
        description: "Dirt race history and dirt G1 epithets with OP race support.",
        characterName: "Haru Urara",
        goalPresetKey: "dirt",
    },
    {
        key: "mejiro-mcqueen-crown",
        label: "Mejiro McQueen — Crown Parent",
        description: "Classic crown routes and long-distance epithets.",
        characterName: "Mejiro McQueen",
        goalPresetKey: "classic-crown",
    },
    {
        key: "biwa-hayahide-crown",
        label: "Biwa Hayahide — Crown Parent",
        description: "Triple Crown and senior crown epithets for stamina parents.",
        characterName: "Biwa Hayahide",
        goalPresetKey: "classic-crown",
        trainingOverrides: { preferredDistanceOverride: "Medium" },
    },
    {
        key: "rice-shower-crown",
        label: "Rice Shower — Crown Parent",
        description: "Classic crown line with long-distance training bias.",
        characterName: "Rice Shower",
        goalPresetKey: "classic-crown",
    },
    {
        key: "special-week-g1",
        label: "Special Week — G1 / Fan Parent",
        description: "General high-fan G1 parent for broad inheritance history.",
        characterName: "Special Week",
        goalPresetKey: "g1-fan",
    },
    {
        key: "gold-ship-g1",
        label: "Gold Ship — G1 / Fan Parent",
        description: "Fan-heavy G1 routing for versatile inheritance parents.",
        characterName: "Gold Ship",
        goalPresetKey: "g1-fan",
    },
    {
        key: "vodka-tiara",
        label: "Vodka — Triple Tiara Parent",
        description: "Oka Sho, Oaks, and Shuka Sho inheritance routes.",
        characterName: "Vodka",
        goalPresetKey: "triple-tiara",
    },
    {
        key: "tokai-teio-medium",
        label: "Tokai Teio — Medium Parent",
        description: "Medium-distance G1 and stayer epithets for Tokai Teio-style parents.",
        characterName: "Tokai Teio",
        goalPresetKey: "medium-long",
    },
    {
        key: "symboli-rudolf-senior",
        label: "Symboli Rudolf — Senior Parent",
        description: "Senior finale and end-year G1 epithets for long-route inheritance.",
        characterName: "Symboli Rudolf",
        goalPresetKey: "senior-finale",
    },
    {
        key: "daiwa-scarlet-queens",
        label: "Daiwa Scarlet — Queen's Race Parent",
        description: "Queen's race and mile queen epithets for female inheritance routes.",
        characterName: "Daiwa Scarlet",
        goalPresetKey: "queens-race",
    },
    {
        key: "super-creek-stayer",
        label: "Super Creek — Stayer Parent",
        description: "Stamina and stayer epithets for endurance-focused parents.",
        characterName: "Super Creek",
        goalPresetKey: "stayer-stamina",
    },
    {
        key: "matikanefukukitaru-turf",
        label: "Matikanefukukitaru — Turf Parent",
        description: "Turf all-rounder epithets for flexible inheritance history.",
        characterName: "Matikanefukukitaru",
        goalPresetKey: "turf-allrounder",
    },
]

/** Builds aptitude grades from a bundled character preset entry. */
export const aptitudesFromCharacterPreset = (preset: CharacterPresetEntry): AptitudeMap => ({
    Sprint: preset.distanceAptitudes.Sprint,
    Mile: preset.distanceAptitudes.Mile,
    Medium: preset.distanceAptitudes.Medium,
    Long: preset.distanceAptitudes.Long,
    Turf: preset.surfaceAptitudes.Turf,
    Dirt: preset.surfaceAptitudes.Dirt,
})

/**
 * Epithet names visible for a scenario + character gate. Used when applying character bundles so
 * character-locked epithets are included after the preset character is selected.
 */
export const buildAllowedEpithetNamesForParentBundle = (scenario: string, characterName: string): Set<string> => {
    const activePreset = characterName.toLowerCase()
    const scenarioLower = scenario.toLowerCase()
    const names = new Set<string>()
    for (const epithet of ALL_EPITHETS) {
        const scenarios = scenariosForEpithet(epithet)
        if (scenarios.length > 0 && !scenarios.some((s) => s.toLowerCase() === scenarioLower)) continue
        const chars = charactersForEpithet(epithet)
        if (chars.length > 0 && !chars.some((c) => c.toLowerCase() === activePreset)) continue
        names.add(epithet.name)
    }
    return names
}

export const findParentFarmingGoalPreset = (key: string): ParentFarmingGoalPreset | undefined =>
    PARENT_FARMING_GOAL_PRESETS.find((preset) => preset.key === key)

export const findParentFarmingCharacterBundle = (key: string): ParentFarmingCharacterBundle | undefined =>
    PARENT_FARMING_CHARACTER_BUNDLES.find((bundle) => bundle.key === key)

export const findCharacterPresetEntry = (characterName: string): CharacterPresetEntry | undefined => CHARACTER_PRESETS[characterName]

/**
 * Counts how many of a bundle's goal epithets are visible for the active scenario and character.
 *
 * @param bundle Character bundle to inspect.
 * @param scenario Active campaign scenario name.
 * @returns Number of goal epithets that pass scenario and character gates.
 */
export const countEligibleBundleTargetEpithets = (bundle: ParentFarmingCharacterBundle, scenario: string): number => {
    const goalPreset = findParentFarmingGoalPreset(bundle.goalPresetKey)
    if (!goalPreset) return 0
    const allowedNames = buildAllowedEpithetNamesForParentBundle(scenario, bundle.characterName)
    return goalPreset.targetEpithets.filter((name) => allowedNames.has(name)).length
}

/**
 * Applies a one-tap parent-farming bundle: full parent-farming preset, character preset + aptitudes,
 * fresh goal epithets/weights, cleared manual locks, and optional training/weight overrides.
 *
 * @param settings Current settings snapshot.
 * @param bundle Character + goal bundle to apply.
 * @returns Updated settings. Returns the input unchanged when the bundle references missing data.
 */
export const applyParentFarmingCharacterBundle = (settings: Settings, bundle: ParentFarmingCharacterBundle): Settings => {
    const characterPreset = findCharacterPresetEntry(bundle.characterName)
    const goalPreset = findParentFarmingGoalPreset(bundle.goalPresetKey)
    if (!characterPreset || !goalPreset) return settings

    const base = applyParentFarmingPreset(settings)
    const allowedNames = buildAllowedEpithetNamesForParentBundle(base.general.scenario, bundle.characterName)

    const racingSeed: Settings["racing"] = {
        ...base.racing,
        smartRaceSolverCharacterPreset: characterPreset.name,
        smartRaceSolverAptitudes: JSON.stringify(aptitudesFromCharacterPreset(characterPreset)),
        smartRaceSolverManualLocks: "{}",
    }

    const goalRacing = applyParentFarmingGoalPresetToRacing(racingSeed, goalPreset, allowedNames, { mergeEpithets: false })

    let smartRaceSolverWeights = goalRacing.smartRaceSolverWeights
    if (bundle.weightOverrides && smartRaceSolverWeights) {
        try {
            const parsed = JSON.parse(smartRaceSolverWeights)
            smartRaceSolverWeights = JSON.stringify({ ...parsed, ...bundle.weightOverrides })
        } catch {
            // Keep goal preset weights if parsing fails.
        }
    }

    const mergedWeights =
        smartRaceSolverWeights ?? goalRacing.smartRaceSolverWeights ?? base.racing.smartRaceSolverWeights

    return {
        ...base,
        racing: {
            ...base.racing,
            ...goalRacing,
            smartRaceSolverCharacterPreset: characterPreset.name,
            smartRaceSolverAptitudes: JSON.stringify(aptitudesFromCharacterPreset(characterPreset)),
            smartRaceSolverManualLocks: "{}",
            smartRaceSolverWeights: mergedWeights,
            parentFarmingBundleKey: bundle.key,
            parentFarmingBundleLabel: bundle.label,
            parentFarmingGoalPresetKey: goalPreset.key,
            parentFarmingGoalPresetLabel: goalPreset.label,
        },
        training: {
            ...base.training,
            ...applyParentFarmingGoalPresetToTraining(base.training, goalPreset),
            ...bundle.trainingOverrides,
        },
    }
}
