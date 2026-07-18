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

/** Tunable scoring weights for the "WhiteFactor" legacy-parent selection strategy. Mirrors
 *  `LegacyParentScorer.WhiteFactorWeights` in `LegacyParentScorer.kt` - keep both in sync.
 *  WhiteFactor deliberately doesn't score stat-priority keywords - it's only about factor/skill signal quality. */
export interface LegacyParentWhiteFactorWeights {
    /** Bonus when OCR text signals a white factor. */
    whiteFactorBonus: number
    /** Bonus when OCR text signals a blue (stat) factor. */
    blueFactorBonus: number
    /** Bonus when OCR text has a skill-hint signal. */
    skillHintBonus: number
    /** Bonus per star (★/*) glyph detected in OCR text. */
    starBonus: number
    /** Bonus per distance/surface aptitude keyword found in OCR text. */
    aptitudeKeywordBonus: number
    /** Multiplier applied to parsed numeric stat values, weighted by priority. */
    statValueWeight: number
    /** Multiplier applied per aptitude-grade point (S=7..G=0) parsed from OCR text. */
    aptitudeGradeWeight: number
}

export const DEFAULT_LEGACY_PARENT_WHITE_FACTOR_WEIGHTS: LegacyParentWhiteFactorWeights = {
    whiteFactorBonus: 240,
    blueFactorBonus: 200,
    skillHintBonus: 100,
    starBonus: 40,
    aptitudeKeywordBonus: 20,
    statValueWeight: 0.08,
    aptitudeGradeWeight: 2,
}

/** Tunable scoring weights for the "SkillHints" legacy-parent selection strategy. Mirrors
 *  `LegacyParentScorer.SkillHintsWeights` in `LegacyParentScorer.kt` - keep both in sync. */
export interface LegacyParentSkillHintsWeights {
    /** Bonus when OCR text has a skill-hint signal. */
    skillHintBonus: number
    /** Bonus when OCR text signals a blue (stat) factor. */
    blueFactorBonus: number
    /** Flat bonus for a stat-priority keyword match, regardless of priority index. */
    statPriorityBonus: number
    /** Bonus per distance/surface aptitude keyword found in OCR text. */
    aptitudeKeywordBonus: number
    /** Multiplier applied to parsed numeric stat values, weighted by priority. */
    statValueWeight: number
    /** Multiplier applied per aptitude-grade point (S=7..G=0) parsed from OCR text. */
    aptitudeGradeWeight: number
}

export const DEFAULT_LEGACY_PARENT_SKILL_HINTS_WEIGHTS: LegacyParentSkillHintsWeights = {
    skillHintBonus: 200,
    blueFactorBonus: 40,
    statPriorityBonus: 30,
    aptitudeKeywordBonus: 20,
    statValueWeight: 0.08,
    aptitudeGradeWeight: 2,
}

/** Tunable scoring weights for the "Balanced" legacy-parent selection strategy. Mirrors
 *  `LegacyParentScorer.BalancedWeights` in `LegacyParentScorer.kt` - keep both in sync. */
export interface LegacyParentBalancedWeights {
    /** Bonus when OCR text has a skill-hint signal. */
    skillHintBonus: number
    /** Bonus when OCR text signals a blue (stat) factor. */
    blueFactorBonus: number
    /** Bonus for a stat-priority keyword match at priority index 0. */
    statPriorityBase: number
    /** Subtracted from `statPriorityBase` per priority index step. */
    statPriorityDecay: number
    /** Bonus per distance/surface aptitude keyword found in OCR text. */
    aptitudeKeywordBonus: number
    /** Multiplier applied to parsed numeric stat values, weighted by priority. */
    statValueWeight: number
    /** Multiplier applied per aptitude-grade point (S=7..G=0) parsed from OCR text. */
    aptitudeGradeWeight: number
}

export const DEFAULT_LEGACY_PARENT_BALANCED_WEIGHTS: LegacyParentBalancedWeights = {
    skillHintBonus: 80,
    blueFactorBonus: 25,
    statPriorityBase: 70,
    statPriorityDecay: 8,
    aptitudeKeywordBonus: 50,
    statValueWeight: 0.2,
    aptitudeGradeWeight: 5,
}
