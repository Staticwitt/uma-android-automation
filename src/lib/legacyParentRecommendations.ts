/**
 * Suggested legacy parent pairs per parent-farming goal preset.
 * Names are OCR hints — the bot matches visible parent cards at career selection.
 */
import { namesMatchTrainee } from "./parentFarmingSupportBorrow"

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

/** All distinct parent names across goal presets — used to backfill when trainee is in the default pair. */
export const allLegacyParentAlternates = (): string[] => {
    const seen = new Set<string>()
    const names: string[] = []
    for (const pair of Object.values(LEGACY_PARENT_PRESETS)) {
        for (const name of pair) {
            if (!seen.has(name)) {
                seen.add(name)
                names.push(name)
            }
        }
    }
    return names
}

/** Removes the trainee from a two-parent suggestion and backfills from [alternates]. */
export const excludeTraineeFromLegacyParentPair = (
    pair: string[],
    traineeName: string,
    alternates: string[] = allLegacyParentAlternates(),
): [string, string] => {
    if (!traineeName.trim()) return [pair[0] ?? "", pair[1] ?? ""]

    const chosen: string[] = []
    for (const name of pair) {
        if (!namesMatchTrainee(name, traineeName) && !chosen.some((slot) => namesMatchTrainee(slot, name))) {
            chosen.push(name)
        }
    }
    for (const alt of alternates) {
        if (chosen.length >= 2) break
        if (!namesMatchTrainee(alt, traineeName) && !chosen.some((slot) => namesMatchTrainee(slot, alt))) {
            chosen.push(alt)
        }
    }
    return [chosen[0] ?? "", chosen[1] ?? ""]
}

/** Builds a suggested parent pair for the active goal preset and legacy strategy. */
export const recommendLegacyParents = (
    goalPresetKey: string | undefined,
    legacyStrategy: string | undefined,
    traineeName?: string,
): LegacyParentRecommendation => {
    const key = goalPresetKey?.trim() || "g1-fans"
    const rawPair = findLegacyParentPreset(key)
    const [parentOne, parentTwo] = excludeTraineeFromLegacyParentPair(rawPair, traineeName ?? "")
    const strategy = legacyStrategy || "StatAndAptitude"
    const rationale =
        strategy === "SkillHints"
            ? "Prioritize white-factor and skill-hint parents for this route."
            : strategy === "Balanced"
              ? "Balance stat factors, aptitudes, and occasional skill hints."
              : "Prioritize stat and aptitude factors aligned with the goal preset."
    return {
        parentOne,
        parentTwo,
        rationale,
        source: "preset",
    }
}

export const formatLegacyParentRecommendation = (rec: LegacyParentRecommendation): string => {
    const names = [rec.parentOne, rec.parentTwo].filter(Boolean).join(" · ")
    return names ? `${names} — ${rec.rationale}` : rec.rationale
}
