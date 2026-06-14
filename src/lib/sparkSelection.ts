/** Spark inheritance selection strategies exposed in Racing Settings. */
export const SPARK_SELECTION_STRATEGIES = [
    { value: "Default", label: "Default (first option)", shortLabel: "First option" },
    { value: "StatAndAptitude", label: "Stat & aptitude (parent farming)", shortLabel: "Stat & aptitude" },
    { value: "SkillHints", label: "Skill hints & white factors", shortLabel: "Skill hints" },
    { value: "Balanced", label: "Balanced", shortLabel: "Balanced" },
] as const

export type SparkSelectionStrategy = (typeof SPARK_SELECTION_STRATEGIES)[number]["value"]

export const DEFAULT_SPARK_SELECTION_STRATEGY: SparkSelectionStrategy = "Default"
export const PARENT_FARMING_SPARK_SELECTION_STRATEGY: SparkSelectionStrategy = "StatAndAptitude"

/** Display label for the active spark strategy value. */
export const formatSparkStrategyLabel = (value: string | undefined): string => {
    const match = SPARK_SELECTION_STRATEGIES.find((option) => option.value === value)
    if (match) return match.shortLabel
    return value ?? "Default"
}
