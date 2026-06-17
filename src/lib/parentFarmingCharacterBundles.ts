import type { Settings } from "../context/BotStateContext"
import characterPresetsData from "../data/characterPresets.json"
import epithetsData from "../data/epithets.json"
import { findParentFarmingGoalPreset } from "./parentFarmingGoalPresets"
import { findSupportBorrowPreset } from "./supportBorrowPresets"
import { AptitudeMap, CharacterPresetEntry, EpithetEntry, type WeightsMap } from "./solver/constants"
import { charactersForEpithet, scenariosForEpithet } from "./solver/scoring"

export interface ParentFarmingCharacterBundle {
    key: string
    /** Short card title, e.g. "Grass Wonder — Mile Parent". */
    label: string
    description: string
    characterName: string
    goalPresetKey: string
    /** Default friend support borrow order when no per-bundle override is stored. */
    supportBorrowCards: string[]
    trainingOverrides?: Partial<Settings["training"]>
    weightOverrides?: Partial<WeightsMap>
}

const CHARACTER_PRESETS = characterPresetsData as Record<string, CharacterPresetEntry>
const ALL_EPITHETS = Object.values(epithetsData) as EpithetEntry[]

/** Bundle-specific borrow defaults; falls back to goal preset list when omitted at resolve time. */
const bundleBorrow = (goalPresetKey: string, cards: string[]): string[] => cards.length > 0 ? cards : findSupportBorrowPreset(goalPresetKey)

export const PARENT_FARMING_CHARACTER_BUNDLES: ParentFarmingCharacterBundle[] = [
    {
        key: "grass-wonder-mile",
        label: "Grass Wonder — Mile Parent",
        description: "Mile-focused G1 and fan epithets with Mile training bias.",
        characterName: "Grass Wonder",
        goalPresetKey: "mile-sprint",
        supportBorrowCards: bundleBorrow("mile-sprint", ["Grass Wonder", "Silence Suzuka", "Maruzensky", "King Halo"]),
    },
    {
        key: "oguri-cap-g1",
        label: "Oguri Cap — G1 / Fan Parent",
        description: "High fan volume and broad G1 inheritance history.",
        characterName: "Oguri Cap",
        goalPresetKey: "g1-fans",
        supportBorrowCards: bundleBorrow("g1-fans", ["Oguri Cap", "Kitasan Black", "Super Creek", "Gold Ship"]),
    },
    {
        key: "maruzensky-sprint",
        label: "Maruzensky — Sprint Parent",
        description: "Sprint and mile G1 clusters for short-distance inheritance.",
        characterName: "Maruzensky",
        goalPresetKey: "mile-sprint",
        supportBorrowCards: bundleBorrow("mile-sprint", ["Maruzensky", "Silence Suzuka", "King Halo", "Grass Wonder"]),
        trainingOverrides: { preferredDistanceOverride: "Sprint" },
    },
    {
        key: "silence-suzuka-mile",
        label: "Silence Suzuka — Mile Parent",
        description: "Mile and sprint epithets tuned for Suzuka's mile strengths.",
        characterName: "Silence Suzuka",
        goalPresetKey: "mile-sprint",
        supportBorrowCards: bundleBorrow("mile-sprint", ["Silence Suzuka", "Grass Wonder", "Maruzensky", "King Halo"]),
    },
    {
        key: "haru-urara-dirt",
        label: "Haru Urara — Dirt Parent",
        description: "Dirt race history and dirt G1 epithets with OP race support.",
        characterName: "Haru Urara",
        goalPresetKey: "dirt",
        supportBorrowCards: bundleBorrow("dirt", ["Haru Urara", "Agnes Digital", "Gold Ship", "Matikanefukukitaru"]),
    },
    {
        key: "mejiro-mcqueen-crown",
        label: "Mejiro McQueen — Crown Parent",
        description: "Classic crown routes and long-distance epithets.",
        characterName: "Mejiro McQueen",
        goalPresetKey: "classic-crown",
        supportBorrowCards: bundleBorrow("classic-crown", ["Super Creek", "Mejiro McQueen", "Biwa Hayahide", "Symboli Rudolf"]),
    },
    {
        key: "biwa-hayahide-crown",
        label: "Biwa Hayahide — Crown Parent",
        description: "Triple Crown and senior crown epithets for stamina parents.",
        characterName: "Biwa Hayahide",
        goalPresetKey: "classic-crown",
        supportBorrowCards: bundleBorrow("classic-crown", ["Biwa Hayahide", "Super Creek", "Mejiro McQueen", "Gold Ship"]),
        trainingOverrides: { preferredDistanceOverride: "Medium" },
    },
    {
        key: "rice-shower-crown",
        label: "Rice Shower — Crown Parent",
        description: "Classic crown line with long-distance training bias.",
        characterName: "Rice Shower",
        goalPresetKey: "classic-crown",
        supportBorrowCards: bundleBorrow("classic-crown", ["Super Creek", "Rice Shower", "Mejiro McQueen", "Biwa Hayahide"]),
    },
    {
        key: "special-week-g1",
        label: "Special Week — G1 / Fan Parent",
        description: "General high-fan G1 parent for broad inheritance history.",
        characterName: "Special Week",
        goalPresetKey: "g1-fans",
        supportBorrowCards: bundleBorrow("g1-fans", ["Special Week", "Kitasan Black", "Oguri Cap", "Gold Ship"]),
    },
    {
        key: "gold-ship-g1",
        label: "Gold Ship — G1 / Fan Parent",
        description: "Fan-heavy G1 routing for versatile inheritance parents.",
        characterName: "Gold Ship",
        goalPresetKey: "g1-fans",
        supportBorrowCards: bundleBorrow("g1-fans", ["Gold Ship", "Kitasan Black", "Super Creek", "Oguri Cap"]),
    },
    {
        key: "vodka-tiara",
        label: "Vodka — Triple Tiara Parent",
        description: "Oka Sho, Oaks, and Shuka Sho inheritance routes.",
        characterName: "Vodka",
        goalPresetKey: "triple-tiara",
        supportBorrowCards: bundleBorrow("triple-tiara", ["Vodka", "King Halo", "Air Groove", "Daiwa Scarlet"]),
    },
    {
        key: "tokai-teio-medium",
        label: "Tokai Teio — Medium Parent",
        description: "Medium-distance G1 and stayer epithets for Tokai Teio-style parents.",
        characterName: "Tokai Teio",
        goalPresetKey: "medium-long",
        supportBorrowCards: bundleBorrow("medium-long", ["Tokai Teio", "Super Creek", "Symboli Rudolf", "Biwa Hayahide"]),
    },
    {
        key: "symboli-rudolf-senior",
        label: "Symboli Rudolf — Senior Parent",
        description: "Senior finale and end-year G1 epithets for long-route inheritance.",
        characterName: "Symboli Rudolf",
        goalPresetKey: "senior-finale",
        supportBorrowCards: bundleBorrow("senior-finale", ["Symboli Rudolf", "Super Creek", "Gold Ship", "Biwa Hayahide"]),
    },
    {
        key: "daiwa-scarlet-queens",
        label: "Daiwa Scarlet — Queen's Race Parent",
        description: "Queen's race and mile queen epithets for female inheritance routes.",
        characterName: "Daiwa Scarlet",
        goalPresetKey: "queens-race",
        supportBorrowCards: bundleBorrow("queens-race", ["Daiwa Scarlet", "Air Groove", "King Halo", "Vodka"]),
    },
    {
        key: "super-creek-stayer",
        label: "Super Creek — Stayer Parent",
        description: "Stamina and stayer epithets for endurance-focused parents.",
        characterName: "Super Creek",
        goalPresetKey: "stayer-stamina",
        supportBorrowCards: bundleBorrow("stayer-stamina", ["Super Creek", "Mejiro McQueen", "Biwa Hayahide", "Symboli Rudolf"]),
    },
    {
        key: "matikanefukukitaru-turf",
        label: "Matikanefukukitaru — Turf Parent",
        description: "Turf all-rounder epithets for flexible inheritance history.",
        characterName: "Matikanefukukitaru",
        goalPresetKey: "turf-allrounder",
        supportBorrowCards: bundleBorrow("turf-allrounder", ["Matikanefukukitaru", "Symboli Rudolf", "Super Creek", "Kitasan Black"]),
    },
    {
        key: "kitasan-black-skill-hints",
        label: "Kitasan Black — Skill Hint Parent",
        description: "White-factor and hint-reward epithets with skill-hint spark picking.",
        characterName: "Kitasan Black",
        goalPresetKey: "skill-hints",
        supportBorrowCards: bundleBorrow("skill-hints", ["Kitasan Black", "Agnes Tachyon", "Super Creek", "Symboli Rudolf"]),
    },
    {
        key: "special-week-junior",
        label: "Special Week — Junior Star Parent",
        description: "Junior showcase epithets and early G1 history for flexible parents.",
        characterName: "Special Week",
        goalPresetKey: "junior-star",
        supportBorrowCards: bundleBorrow("junior-star", ["Special Week", "Kitasan Black", "Oguri Cap", "Gold Ship"]),
    },
    {
        key: "agnes-tachyon-skill-hints",
        label: "Agnes Tachyon — Skill Hint Parent",
        description: "Skill-hint and white-factor route with Tachyon-friendly training bias.",
        characterName: "Agnes Tachyon",
        goalPresetKey: "skill-hints",
        supportBorrowCards: bundleBorrow("skill-hints", ["Agnes Tachyon", "Kitasan Black", "Symboli Rudolf", "Super Creek"]),
    },
    {
        key: "king-halo-tiara",
        label: "King Halo — Triple Tiara Parent",
        description: "Oka Sho / Oaks / Shuka Sho inheritance with queen-route epithets.",
        characterName: "King Halo",
        goalPresetKey: "triple-tiara",
        supportBorrowCards: bundleBorrow("triple-tiara", ["King Halo", "Air Groove", "Vodka", "Daiwa Scarlet"]),
    },
    {
        key: "symboli-rudolf-g1",
        label: "Symboli Rudolf — G1 / Fan Parent",
        description: "High fan volume and senior-route G1 epithets for versatile parents.",
        characterName: "Symboli Rudolf",
        goalPresetKey: "g1-fans",
        supportBorrowCards: bundleBorrow("g1-fans", ["Symboli Rudolf", "Super Creek", "Kitasan Black", "Gold Ship"]),
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
