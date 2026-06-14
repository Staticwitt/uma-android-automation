/**
 * Curated four-owned + one-friend support decks per parent-farming goal route.
 * Owned slots are the four support cards you bring; friend is the borrow priority at career selection.
 */
export interface SupportDeckPreset {
    goalPresetKey: string
    /** Short deck archetype label shown in the UI. */
    archetype: string
    /** Four owned support slots (trainee card is separate). */
    owned: string[]
    /** Preferred friend borrow when that card is not already in owned slots. */
    friend: string
}

export const SUPPORT_DECK_PRESETS: Record<string, SupportDeckPreset> = {
    "g1-fans": {
        goalPresetKey: "g1-fans",
        archetype: "G1 volume — Speed + Stamina + Guts core",
        owned: ["Kitasan Black", "Super Creek", "Symboli Rudolf", "Gold Ship"],
        friend: "Oguri Cap",
    },
    "classic-crown": {
        goalPresetKey: "classic-crown",
        archetype: "Classic crown — Stamina stack + Guts",
        owned: ["Super Creek", "Mejiro McQueen", "Biwa Hayahide", "Symboli Rudolf"],
        friend: "Gold Ship",
    },
    "triple-tiara": {
        goalPresetKey: "triple-tiara",
        archetype: "Queen's mile — Speed + Power mix",
        owned: ["King Halo", "Air Groove", "Vodka", "Daiwa Scarlet"],
        friend: "Grass Wonder",
    },
    "mile-sprint": {
        goalPresetKey: "mile-sprint",
        archetype: "Mile / sprint — 3 Speed + Wit",
        owned: ["Silence Suzuka", "Maruzensky", "King Halo", "Seiun Sky"],
        friend: "Grass Wonder",
    },
    dirt: {
        goalPresetKey: "dirt",
        archetype: "Dirt — Power + Guts + Wit",
        owned: ["Agnes Digital", "Gold Ship", "Matikanefukukitaru", "Haru Urara"],
        friend: "Matikanefukukitaru",
    },
    "skill-hints": {
        goalPresetKey: "skill-hints",
        archetype: "Skill hints — Wit-heavy",
        owned: ["Matikanefukukitaru", "Agnes Tachyon", "Seiun Sky", "Kitasan Black"],
        friend: "Super Creek",
    },
    "medium-long": {
        goalPresetKey: "medium-long",
        archetype: "Medium route — Stamina + balanced stats",
        owned: ["Super Creek", "Symboli Rudolf", "Tokai Teio", "Biwa Hayahide"],
        friend: "Gold Ship",
    },
    "stayer-stamina": {
        goalPresetKey: "stayer-stamina",
        archetype: "Stayer — Stamina wall",
        owned: ["Super Creek", "Mejiro McQueen", "Biwa Hayahide", "Symboli Rudolf"],
        friend: "Gold Ship",
    },
    "derby-stayer-line": {
        goalPresetKey: "derby-stayer-line",
        archetype: "Derby stayer line — Stamina focus",
        owned: ["Super Creek", "Mejiro McQueen", "Biwa Hayahide", "Symboli Rudolf"],
        friend: "Gold Ship",
    },
    "queens-race": {
        goalPresetKey: "queens-race",
        archetype: "Queen's races — Mile queens",
        owned: ["Air Groove", "Daiwa Scarlet", "King Halo", "Grass Wonder"],
        friend: "Vodka",
    },
    "turf-allrounder": {
        goalPresetKey: "turf-allrounder",
        archetype: "Turf all-rounder — Flexible core",
        owned: ["Matikanefukukitaru", "Symboli Rudolf", "Super Creek", "Kitasan Black"],
        friend: "Gold Ship",
    },
    "senior-finale": {
        goalPresetKey: "senior-finale",
        archetype: "Senior finale — Stamina + Guts",
        owned: ["Symboli Rudolf", "Super Creek", "Gold Ship", "Biwa Hayahide"],
        friend: "Tokai Teio",
    },
    "junior-star": {
        goalPresetKey: "junior-star",
        archetype: "Junior star — Early speed",
        owned: ["Special Week", "Kitasan Black", "Gold Ship", "Super Creek"],
        friend: "Oguri Cap",
    },
}

export const findSupportDeckPreset = (goalPresetKey: string): SupportDeckPreset =>
    SUPPORT_DECK_PRESETS[goalPresetKey] ?? SUPPORT_DECK_PRESETS["g1-fans"]
