/**
 * Suggested legacy parent pairs per parent-farming goal preset.
 * Names are OCR hints — the bot matches visible parent cards at career selection.
 */
export const LEGACY_PARENT_PRESETS: Record<string, string[]> = {
    "g1-fans": ["Symboli Rudolf", "Super Creek"],
    "classic-crown": ["Symboli Rudolf", "Mejiro McQueen"],
    "triple-tiara": ["King Halo", "Air Groove"],
    "mile-sprint": ["Silence Suzuka", "Grass Wonder"],
    "dirt": ["Gold Ship", "Agnes Digital"],
    "skill-hints": ["Kitasan Black", "Agnes Tachyon"],
    "medium-long": ["Super Creek", "Symboli Rudolf"],
    "stayer-stamina": ["Mejiro McQueen", "Biwa Hayahide"],
    "derby-stayer-line": ["Mejiro McQueen", "Super Creek"],
    "queens-race": ["Air Groove", "Daiwa Scarlet"],
    "turf-allrounder": ["Matikanefukukitaru", "Symboli Rudolf"],
    "senior-finale": ["Symboli Rudolf", "Super Creek"],
    "junior-star": ["Special Week", "Kitasan Black"],
}

export interface LegacyParentRecommendation {
    parentOne: string
    parentTwo: string
    rationale: string
    source: "preset" | "strategy"
}

export const findLegacyParentPreset = (goalPresetKey: string): string[] =>
    LEGACY_PARENT_PRESETS[goalPresetKey] ?? LEGACY_PARENT_PRESETS["g1-fans"]

/** Builds a suggested parent pair for the active goal preset and legacy strategy. */
export const recommendLegacyParents = (
    goalPresetKey: string | undefined,
    legacyStrategy: string | undefined,
): LegacyParentRecommendation => {
    const key = goalPresetKey?.trim() || "g1-fans"
    const pair = findLegacyParentPreset(key)
    const strategy = legacyStrategy || "StatAndAptitude"
    const rationale =
        strategy === "SkillHints"
            ? "Prioritize white-factor and skill-hint parents for this route."
            : strategy === "Balanced"
              ? "Balance stat factors, aptitudes, and occasional skill hints."
              : "Prioritize stat and aptitude factors aligned with the goal preset."
    return {
        parentOne: pair[0] ?? "",
        parentTwo: pair[1] ?? "",
        rationale,
        source: "preset",
    }
}

export const formatLegacyParentRecommendation = (rec: LegacyParentRecommendation): string => {
    const names = [rec.parentOne, rec.parentTwo].filter(Boolean).join(" · ")
    return names ? `${names} — ${rec.rationale}` : rec.rationale
}
