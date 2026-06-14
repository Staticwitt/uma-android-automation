/** Spark inheritance selection strategies exposed in Racing Settings. */
export const SPARK_SELECTION_STRATEGIES = [
    { value: "Default", label: "Default (first option)" },
    { value: "StatAndAptitude", label: "Stat & aptitude (parent farming)" },
    { value: "SkillHints", label: "Skill hints & white factors" },
    { value: "Balanced", label: "Balanced" },
] as const

export type SparkSelectionStrategy = (typeof SPARK_SELECTION_STRATEGIES)[number]["value"]

export const DEFAULT_SPARK_SELECTION_STRATEGY: SparkSelectionStrategy = "Default"
export const PARENT_FARMING_SPARK_SELECTION_STRATEGY: SparkSelectionStrategy = "StatAndAptitude"
