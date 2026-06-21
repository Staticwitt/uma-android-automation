/** Tunable scoring weights for the "StatAndAptitude" legacy-parent selection strategy. Mirrors
 *  `LegacyParentScorer.StatAptitudeWeights` in `LegacyParentScorer.kt` - keep both in sync. */
export interface LegacyParentStatAptitudeWeights {
    /** Bonus when OCR text has a skill-hint signal and "prioritize skill hints" is enabled. */
    skillHintBonus: number
    /** Bonus when OCR text signals a blue (stat) factor. */
    blueFactorBonus: number
    /** Bonus for a stat-priority keyword match at priority index 0. */
    statPriorityBase: number
    /** Subtracted from `statPriorityBase` per priority index step (lower-priority stats score less). */
    statPriorityDecay: number
    /** Bonus per distance/surface aptitude keyword found in OCR text. */
    aptitudeKeywordBonus: number
    /** Multiplier applied to parsed numeric stat values (e.g. "Speed +120"), weighted by priority. */
    statValueWeight: number
    /** Multiplier applied per aptitude-grade point (S=7..G=0) parsed from OCR text. */
    aptitudeGradeWeight: number
}

export const DEFAULT_LEGACY_PARENT_STAT_APTITUDE_WEIGHTS: LegacyParentStatAptitudeWeights = {
    skillHintBonus: 45,
    blueFactorBonus: 15,
    statPriorityBase: 120,
    statPriorityDecay: 12,
    aptitudeKeywordBonus: 90,
    statValueWeight: 0.35,
    aptitudeGradeWeight: 8,
}
