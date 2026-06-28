/** Aptitude/quality letter grades from best to worst, matching the in-game S..G scale. */
export const APTITUDE_GRADE_ORDER = ["S", "A", "B", "C", "D", "E", "F", "G"] as const

export type AptitudeGrade = (typeof APTITUDE_GRADE_ORDER)[number]

/** Background/text color pair for a single grade cell. Colors are fixed (not theme-dependent) so the
 * green-to-red scale reads consistently in both light and dark mode. */
const GRADE_COLORS: Record<AptitudeGrade, { bg: string; text: string }> = {
    S: { bg: "#16a34a", text: "#ffffff" },
    A: { bg: "#65a30d", text: "#ffffff" },
    B: { bg: "#facc15", text: "#1c1917" },
    C: { bg: "#fb923c", text: "#1c1917" },
    D: { bg: "#f87171", text: "#ffffff" },
    E: { bg: "#ef4444", text: "#ffffff" },
    F: { bg: "#94a3b8", text: "#1c1917" },
    G: { bg: "#64748b", text: "#ffffff" },
}

/** Fallback color for missing/unrecognized aptitude data. */
const UNKNOWN_GRADE_COLOR = { bg: "rgba(128,128,128,0.15)", text: "#78716c" }

/**
 * Returns the background/text color pair for an aptitude grade letter, falling back to a neutral
 * gray when the grade is missing or not one of S..G.
 * @param grade The aptitude grade letter (e.g. "S", "A", "B").
 * @returns The background and text color to render the grade cell with.
 */
export const getAptitudeGradeColor = (grade: string | undefined): { bg: string; text: string } => {
    if (!grade) return UNKNOWN_GRADE_COLOR
    const normalized = grade.toUpperCase() as AptitudeGrade
    return GRADE_COLORS[normalized] ?? UNKNOWN_GRADE_COLOR
}
