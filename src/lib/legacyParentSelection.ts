/** Legacy parent pair selection strategies (OCR scoring when no preferred names are set). */
export const LEGACY_PARENT_SELECTION_STRATEGIES = [
    { value: "Default", label: "Default (in-game Auto-Select)", shortLabel: "Auto-Select" },
    { value: "StatAndAptitude", label: "Stat & aptitude factors", shortLabel: "Stat & aptitude" },
    { value: "SkillHints", label: "Skill hints & white factors", shortLabel: "Skill hints" },
    { value: "Balanced", label: "Balanced", shortLabel: "Balanced" },
] as const

export type LegacyParentSelectionStrategy = (typeof LEGACY_PARENT_SELECTION_STRATEGIES)[number]["value"]

export const DEFAULT_LEGACY_PARENT_SELECTION_STRATEGY: LegacyParentSelectionStrategy = "Default"
export const PARENT_FARMING_LEGACY_PARENT_SELECTION_STRATEGY: LegacyParentSelectionStrategy = "StatAndAptitude"

/** Display label for the active legacy parent strategy value. */
export const formatLegacyParentStrategyLabel = (value: string | undefined): string => {
    const match = LEGACY_PARENT_SELECTION_STRATEGIES.find((option) => option.value === value)
    if (match) return match.shortLabel
    return value ?? "Default"
}

/** Maps spark inheritance strategy to a matching legacy parent OCR strategy. */
export const legacyStrategyFromSparkStrategy = (sparkStrategy: string | undefined): LegacyParentSelectionStrategy => {
    if (sparkStrategy === "SkillHints" || sparkStrategy === "StatAndAptitude" || sparkStrategy === "Balanced") {
        return sparkStrategy
    }
    return DEFAULT_LEGACY_PARENT_SELECTION_STRATEGY
}
