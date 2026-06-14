/**
 * Preferred friend support cards per parent-farming goal preset.
 * Ordered by priority — the bot OCR-matches the first name found in the borrow dialog.
 * Names must exist in `src/data/supports.json`.
 */
export const SUPPORT_BORROW_PRESETS: Record<string, string[]> = {
    "g1-fans": ["Kitasan Black", "Super Creek", "Symboli Rudolf", "Gold Ship", "Oguri Cap"],
    "classic-crown": ["Super Creek", "Mejiro McQueen", "Biwa Hayahide", "Gold Ship", "Symboli Rudolf"],
    "triple-tiara": ["King Halo", "Air Groove", "Vodka", "Daiwa Scarlet", "Grass Wonder"],
    "mile-sprint": ["Silence Suzuka", "Grass Wonder", "Maruzensky", "Seiun Sky", "King Halo"],
    "dirt": ["Haru Urara", "Agnes Digital", "Gold Ship", "Matikanefukukitaru", "Super Creek"],
    "skill-hints": ["Kitasan Black", "Agnes Tachyon", "Matikanefukukitaru", "Super Creek", "Symboli Rudolf"],
    "medium-long": ["Super Creek", "Symboli Rudolf", "Tokai Teio", "Biwa Hayahide", "Gold Ship"],
    "stayer-stamina": ["Super Creek", "Mejiro McQueen", "Biwa Hayahide", "Symboli Rudolf", "Gold Ship"],
    "derby-stayer-line": ["Super Creek", "Mejiro McQueen", "Biwa Hayahide", "Symboli Rudolf", "Gold Ship"],
    "queens-race": ["Air Groove", "Daiwa Scarlet", "King Halo", "Grass Wonder", "Vodka"],
    "turf-allrounder": ["Matikanefukukitaru", "Symboli Rudolf", "Super Creek", "Gold Ship", "Kitasan Black"],
    "senior-finale": ["Symboli Rudolf", "Super Creek", "Gold Ship", "Biwa Hayahide", "Tokai Teio"],
    "junior-star": ["Special Week", "Kitasan Black", "Gold Ship", "Oguri Cap", "Super Creek"],
}

export const findSupportBorrowPreset = (goalPresetKey: string): string[] =>
    SUPPORT_BORROW_PRESETS[goalPresetKey] ?? SUPPORT_BORROW_PRESETS["g1-fans"]
