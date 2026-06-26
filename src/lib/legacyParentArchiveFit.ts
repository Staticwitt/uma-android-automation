import { formatQualityLabel, scoreParentRunArchiveEntry } from "./parentQuality"
import { aptitudesFromCharacterPreset, findCharacterPresetEntry, PARENT_FARMING_CHARACTER_BUNDLES } from "./parentFarmingCharacterBundles"
import { findParentFarmingGoalPreset } from "./parentFarmingGoalPresets"
import { inferGoalPresetKeyFromAptitudes } from "./recommendSupportDeck"
import type { ParentRunArchiveEntry } from "./parentRunArchive"
import { APTITUDE_RANKS, type AptitudeMap, type CharacterPresetEntry } from "./solver/constants"

export interface LegacyParentFitBreakdown {
    /** 0–50: weighted overlap between the parent's aptitudes and the target Uma's strongest categories. */
    aptitudeScore: number
    /** 0–30: the parent run's intrinsic quality score, scaled down. */
    qualityScore: number
    /** 0–20: how well the parent's sparks/factors line up with the target's build. */
    sparkRelevanceScore: number
    total: number
}

export interface LegacyParentRecommendation {
    run: ParentRunArchiveEntry
    fitScore: number
    fitBreakdown: LegacyParentFitBreakdown
    /** Real spark/factor text for this run — harvestFactors when available, else raw spark-pick option text. */
    sparks: string[]
    matchedSparkKeywords: string[]
    reasons: string[]
}

type AptitudeCategory = keyof AptitudeMap

const APTITUDE_CATEGORIES: AptitudeCategory[] = ["Sprint", "Mile", "Medium", "Long", "Turf", "Dirt"]

const rankIndex = (grade: string): number => {
    const idx = APTITUDE_RANKS.indexOf(grade)
    return idx === -1 ? APTITUDE_RANKS.length - 1 : idx
}

const isGradeAtLeast = (grade: string, min: string): boolean => rankIndex(grade) <= rankIndex(min)

const MAX_RANK_INDEX = APTITUDE_RANKS.length - 1

const parentAptitudeGrade = (run: ParentRunArchiveEntry, category: AptitudeCategory): string | undefined => {
    switch (category) {
        case "Sprint":
            return run.distanceAptitudes?.SPRINT
        case "Mile":
            return run.distanceAptitudes?.MILE
        case "Medium":
            return run.distanceAptitudes?.MEDIUM
        case "Long":
            return run.distanceAptitudes?.LONG
        case "Turf":
            return run.surfaceAptitudes?.TURF
        case "Dirt":
            return run.surfaceAptitudes?.DIRT
    }
}

/**
 * Weighted aptitude-overlap score (0–50). Categories the target Uma is already strong in are weighted
 * higher, since a legacy parent reinforces aptitudes the trainee already favors rather than unrelated ones.
 */
const scoreAptitudeFit = (run: ParentRunArchiveEntry, target: AptitudeMap): { score: number; hasData: boolean } => {
    let weightedSum = 0
    let weightTotal = 0
    let presentCount = 0

    // Weight totals span every category (not just ones this run recorded), so a run missing data for
    // categories the target cares about most loses out on those points rather than being scored on
    // only the few categories it happens to have.
    for (const category of APTITUDE_CATEGORIES) {
        const weight = MAX_RANK_INDEX + 1 - rankIndex(target[category])
        weightTotal += weight

        const parentGrade = parentAptitudeGrade(run, category)
        if (!parentGrade) continue
        presentCount++
        const parentMatch = (MAX_RANK_INDEX - rankIndex(parentGrade)) / MAX_RANK_INDEX
        weightedSum += weight * parentMatch
    }

    if (presentCount === 0 || weightTotal === 0) return { score: 25, hasData: false }
    return { score: (weightedSum / weightTotal) * 50, hasData: true }
}

const SPARK_HINT_KEYWORDS = ["hint", "skill", "white", "unique", "factor", "golden", "gold"]

const DISTANCE_TERM_BY_CATEGORY: Record<"Sprint" | "Mile" | "Medium" | "Long", string> = {
    Sprint: "sprint",
    Mile: "mile",
    Medium: "medium",
    Long: "long",
}

/** Keywords describing the target Uma's build, used to judge spark/factor relevance. */
const buildTargetKeywords = (target: AptitudeMap, goalLabel: string): string[] => {
    const keywords = new Set<string>()
    for (const word of goalLabel.toLowerCase().split(/[^a-z]+/)) {
        if (word.length > 2) keywords.add(word)
    }
    for (const [category, term] of Object.entries(DISTANCE_TERM_BY_CATEGORY) as [keyof typeof DISTANCE_TERM_BY_CATEGORY, string][]) {
        if (isGradeAtLeast(target[category], "B")) keywords.add(term)
    }
    if (isGradeAtLeast(target.Turf, "B")) keywords.add("turf")
    if (isGradeAtLeast(target.Dirt, "B")) keywords.add("dirt")
    return Array.from(keywords)
}

/** Real spark/factor text for a run: harvest-scanned factor names when available, else raw spark-pick option text. */
export const collectSparkTexts = (run: ParentRunArchiveEntry): string[] => {
    if (run.harvestFactors && run.harvestFactors.length > 0) return run.harvestFactors
    return run.sparkPicks
        .map((pick) => pick.optionTexts[pick.pickIndex])
        .filter((text): text is string => Boolean(text && text.trim().length > 0))
}

const scoreSparkRelevance = (sparkTexts: string[], keywords: string[]): { score: number; matched: string[] } => {
    if (sparkTexts.length === 0) return { score: 5, matched: [] }

    const matched = new Set<string>()
    let hintHits = 0
    for (const text of sparkTexts) {
        const lower = text.toLowerCase()
        for (const keyword of keywords) {
            if (lower.includes(keyword)) matched.add(keyword)
        }
        if (SPARK_HINT_KEYWORDS.some((keyword) => lower.includes(keyword))) hintHits++
    }

    const keywordScore = Math.min(14, matched.size * 5)
    const hintScore = Math.min(6, hintHits * 2)
    return { score: keywordScore + hintScore, matched: Array.from(matched) }
}

const goalLabelForPreset = (preset: CharacterPresetEntry): { goalPresetKey: string; goalLabel: string } => {
    const bundle = PARENT_FARMING_CHARACTER_BUNDLES.find((b) => b.characterName === preset.name)
    const goalPresetKey = bundle?.goalPresetKey ?? inferGoalPresetKeyFromAptitudes(preset)
    const goalPreset = findParentFarmingGoalPreset(goalPresetKey)
    return { goalPresetKey, goalLabel: goalPreset?.label ?? goalPresetKey }
}

const scoreLegacyParentFitForPreset = (run: ParentRunArchiveEntry, preset: CharacterPresetEntry): LegacyParentRecommendation => {
    const target = aptitudesFromCharacterPreset(preset)
    const { goalLabel } = goalLabelForPreset(preset)

    const { score: aptitudeScore, hasData } = scoreAptitudeFit(run, target)
    const quality = scoreParentRunArchiveEntry(run)
    const qualityScore = quality.score * 0.3
    const sparks = collectSparkTexts(run)
    const keywords = buildTargetKeywords(target, goalLabel)
    const { score: sparkRelevanceScore, matched } = scoreSparkRelevance(sparks, keywords)

    const total = Math.round(Math.min(100, Math.max(0, aptitudeScore + qualityScore + sparkRelevanceScore)))

    const reasons: string[] = []
    if (hasData) {
        const strongCategories = APTITUDE_CATEGORIES.filter((category) => {
            const parentGrade = parentAptitudeGrade(run, category)
            return parentGrade && isGradeAtLeast(parentGrade, "A") && isGradeAtLeast(target[category], "B")
        })
        if (strongCategories.length > 0) reasons.push(`Strong ${strongCategories.join("/")} aptitude reinforces this build`)
    } else {
        reasons.push("No aptitude data recorded for this run")
    }
    reasons.push(`Run quality: ${formatQualityLabel(quality)}`)
    if (matched.length > 0) reasons.push(`Sparks match this build: ${matched.join(", ")}`)

    return {
        run,
        fitScore: total,
        fitBreakdown: {
            aptitudeScore: Math.round(aptitudeScore * 10) / 10,
            qualityScore: Math.round(qualityScore * 10) / 10,
            sparkRelevanceScore: Math.round(sparkRelevanceScore * 10) / 10,
            total,
        },
        sparks,
        matchedSparkKeywords: matched,
        reasons,
    }
}

/**
 * Scores how well an archived legacy parent fits a specific target Uma's training needs.
 *
 * @param run Archived parent run to score.
 * @param targetCharacterName Character preset name of the Uma currently being trained.
 * @returns A fit score breakdown, or null when the target character is unknown.
 */
export const scoreLegacyParentFitForCharacter = (
    run: ParentRunArchiveEntry,
    targetCharacterName: string,
): LegacyParentRecommendation | null => {
    const preset = findCharacterPresetEntry(targetCharacterName)
    if (!preset) return null
    return scoreLegacyParentFitForPreset(run, preset)
}

/** All archived legacy parents ranked by fit for a target Uma, best first. Empty when the character is unknown. */
export const rankLegacyParentsForCharacter = (
    runs: ParentRunArchiveEntry[],
    targetCharacterName: string,
): LegacyParentRecommendation[] => {
    const preset = findCharacterPresetEntry(targetCharacterName)
    if (!preset) return []
    return runs.map((run) => scoreLegacyParentFitForPreset(run, preset)).sort((a, b) => b.fitScore - a.fitScore)
}

/** Best-fitting archived legacy parent for a target Uma, or null when there are no runs or an unknown character. */
export const findBestLegacyParentForCharacter = (
    runs: ParentRunArchiveEntry[],
    targetCharacterName: string,
): LegacyParentRecommendation | null => {
    const ranked = rankLegacyParentsForCharacter(runs, targetCharacterName)
    return ranked.length > 0 ? ranked[0] : null
}
