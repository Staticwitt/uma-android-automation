import { TrainingScoringConstants } from "./types"

/**
 * Multiplier applied to a training's primary-stat contribution based on its OCR-detected level (1-5) and the stat's position in the user's priority list. Ports `Training.kt:643`.
 *
 * @param priorityRank 1-based position in the active priority list (1 = top priority).
 * @param trainingLevel Level 1-5 from OCR, or null if unknown.
 * @param constants Tunable scoring constants.
 * @returns Multiplier in [1.0, 1.75] under defaults.
 */
export function levelBoostMultiplier(priorityRank: number, trainingLevel: number | null, constants: TrainingScoringConstants): number {
    const level = trainingLevel ?? 1
    if (level <= 1) return 1.0
    const priorityFactor = priorityRank === 1 ? constants.levelBoostRank1Factor : priorityRank === 2 ? constants.levelBoostRank2Factor : priorityRank === 3 ? constants.levelBoostRank3Factor : 0.0
    const levelFactor = (level - 1) / 4.0
    return 1.0 + priorityFactor * levelFactor
}
