// src/lib/training/scoring/calculateMiscScore.ts
import { TrainingConfig, TrainingOption } from "./types"

/**
 * Apply misc bonuses based on training properties (skill hints). Ports `calculateMiscScore` in `Training.kt`.
 *
 * @param config Global scoring inputs.
 * @param training The training option to score.
 * @returns Score in [0, 100] normally, or above 100 when `enablePrioritizeSkillHints` triggers the override.
 */
export function calculateMiscScore(config: TrainingConfig, training: TrainingOption): number {
    let score = 50.0

    const numSkillHints = config.skillHintsPerLocation[training.name] ?? 0
    score += config.scoring.skillHintPerHintScore * numSkillHints

    if (config.enablePrioritizeSkillHints && numSkillHints > 0) {
        return config.scoring.skillHintOverrideScore + score
    }

    return Math.max(0, Math.min(100, score))
}
