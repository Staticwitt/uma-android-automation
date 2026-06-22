import type { SupportCardType } from "./supportCardCatalog"
import { supportCardType } from "./supportCardCatalog"
import { getSupportCardMetadata, type SupportCardMetadata } from "./supportCardMetadata"

export type SupportTypeTargets = Partial<Record<SupportCardType, number>>

export interface SupportGoalScoringProfile {
    statWeights: Partial<Record<"speed" | "stamina" | "power" | "guts" | "wit", number>>
    hintWeight: number
    skillPointWeight: number
    energyWeight: number
    moodWeight: number
    typeTargets: SupportTypeTargets
    /** Bonus when a card's hint skill name contains any keyword (case-insensitive). */
    hintKeywordBonus: Array<{ keywords: string[]; bonus: number }>
    friendshipWeight?: number
    trainingEffectivenessWeight?: number
    specialtyPriorityWeight?: number
    initialFriendshipWeight?: number
    fanBonusWeight?: number
    hintFrequencyWeight?: number
    hintLevelWeight?: number
    initStatWeight?: number
}

const DEFAULT_MANUAL_WEIGHTS = {
    friendshipWeight: 0.25,
    trainingEffectivenessWeight: 0.2,
    specialtyPriorityWeight: 0.15,
    initialFriendshipWeight: 0.1,
    fanBonusWeight: 0.15,
    hintFrequencyWeight: 0.2,
    hintLevelWeight: 1.0,
    initStatWeight: 0.03,
} as const

const RARITY_SCORE: Record<"SSR" | "SR" | "R", number> = { SSR: 6, SR: 2, R: 0 }

/** Friend borrow sort modes: goal-fit scoring (default) vs. pure in-kit race bonus. */
export const SUPPORT_BORROW_SORT_MODES = [
    { value: "goal", label: "Goal fit (default)" },
    { value: "raceBonus", label: "Race bonus" },
] as const

export type SupportBorrowSortMode = (typeof SUPPORT_BORROW_SORT_MODES)[number]["value"]

export const DEFAULT_SUPPORT_BORROW_SORT_MODE: SupportBorrowSortMode = "goal"

/** A support card's in-kit race bonus stat (% boost to race rewards), 0 when unknown. */
export const raceBonusScore = (name: string): number => getSupportCardMetadata(name)?.stats?.raceBonus ?? 0

/** Parent-farming goal → how much each support trait matters for deck ranking. */
export const SUPPORT_GOAL_SCORING_PROFILES: Record<string, SupportGoalScoringProfile> = {
    "g1-fans": {
        statWeights: { speed: 1.2, wit: 0.8, stamina: 0.5 },
        hintWeight: 1.5,
        skillPointWeight: 0.4,
        energyWeight: 0.3,
        moodWeight: 0.2,
        typeTargets: { Speed: 2, Wit: 2 },
        hintKeywordBonus: [{ keywords: ["fan", "popularity", "media"], bonus: 8 }],
        fanBonusWeight: 0.45,
    },
    "mile-sprint": {
        statWeights: { speed: 1.8, power: 0.6, wit: 0.5 },
        hintWeight: 1.0,
        skillPointWeight: 0.3,
        energyWeight: 0.2,
        moodWeight: 0.1,
        typeTargets: { Speed: 3, Wit: 1 },
        hintKeywordBonus: [
            { keywords: ["sprint", "mile", "front", "pace", "late", "end closer"], bonus: 6 },
            { keywords: ["straightaway", "corner"], bonus: 3 },
        ],
        specialtyPriorityWeight: 0.25,
        initStatWeight: 0.05,
    },
    "classic-crown": {
        statWeights: { stamina: 1.8, power: 0.7, guts: 0.6, wit: 0.4 },
        hintWeight: 1.2,
        skillPointWeight: 0.35,
        energyWeight: 0.25,
        moodWeight: 0.15,
        typeTargets: { Stamina: 2, Power: 1, Wit: 1 },
        hintKeywordBonus: [{ keywords: ["stamina", "long", "medium", "corner"], bonus: 5 }],
    },
    "triple-tiara": {
        statWeights: { speed: 1.4, power: 1.0, wit: 0.5 },
        hintWeight: 1.1,
        skillPointWeight: 0.35,
        energyWeight: 0.2,
        moodWeight: 0.15,
        typeTargets: { Speed: 2, Power: 1, Wit: 1 },
        hintKeywordBonus: [{ keywords: ["mile", "queen", "pace"], bonus: 5 }],
    },
    dirt: {
        statWeights: { power: 1.5, guts: 1.2, wit: 0.6 },
        hintWeight: 1.4,
        skillPointWeight: 0.35,
        energyWeight: 0.2,
        moodWeight: 0.1,
        typeTargets: { Power: 2, Guts: 1, Wit: 1 },
        hintKeywordBonus: [
            { keywords: ["dirt", "wet", "rainy", "mud", "heavy"], bonus: 8 },
            { keywords: ["power", "guts"], bonus: 4 },
        ],
        hintFrequencyWeight: 0.35,
    },
    "skill-hints": {
        statWeights: { wit: 1.5, speed: 0.4 },
        hintWeight: 3.0,
        skillPointWeight: 0.8,
        energyWeight: 0.15,
        moodWeight: 0.1,
        typeTargets: { Wit: 3, Speed: 1 },
        hintKeywordBonus: [{ keywords: ["hint", "skill", "focus", "savvy"], bonus: 4 }],
        hintFrequencyWeight: 0.45,
        hintLevelWeight: 2.5,
    },
    "medium-long": {
        statWeights: { stamina: 1.5, speed: 0.7, wit: 0.5 },
        hintWeight: 1.2,
        skillPointWeight: 0.35,
        energyWeight: 0.25,
        moodWeight: 0.15,
        typeTargets: { Stamina: 2, Speed: 1, Wit: 1 },
        hintKeywordBonus: [{ keywords: ["stamina", "medium", "long", "hydrate"], bonus: 5 }],
    },
    "stayer-stamina": {
        statWeights: { stamina: 2.0, guts: 0.8, wit: 0.4 },
        hintWeight: 1.1,
        skillPointWeight: 0.3,
        energyWeight: 0.25,
        moodWeight: 0.15,
        typeTargets: { Stamina: 3, Wit: 1 },
        hintKeywordBonus: [{ keywords: ["stamina", "long", "hydrate", "corner"], bonus: 6 }],
    },
    "derby-stayer-line": {
        statWeights: { stamina: 1.9, power: 0.6, guts: 0.7 },
        hintWeight: 1.1,
        skillPointWeight: 0.3,
        energyWeight: 0.25,
        moodWeight: 0.15,
        typeTargets: { Stamina: 2, Power: 1, Wit: 1 },
        hintKeywordBonus: [{ keywords: ["stamina", "long", "derby"], bonus: 6 }],
    },
    "queens-race": {
        statWeights: { speed: 1.3, power: 1.0, wit: 0.5 },
        hintWeight: 1.2,
        skillPointWeight: 0.35,
        energyWeight: 0.2,
        moodWeight: 0.15,
        typeTargets: { Speed: 2, Power: 1, Wit: 1 },
        hintKeywordBonus: [{ keywords: ["mile", "queen", "pace"], bonus: 5 }],
    },
    "turf-allrounder": {
        statWeights: { speed: 0.9, stamina: 0.9, wit: 0.8, power: 0.6 },
        hintWeight: 1.3,
        skillPointWeight: 0.4,
        energyWeight: 0.2,
        moodWeight: 0.15,
        typeTargets: { Speed: 1, Stamina: 1, Wit: 1, Power: 1 },
        hintKeywordBonus: [{ keywords: ["turf", "flex", "all"], bonus: 3 }],
    },
    "senior-finale": {
        statWeights: { stamina: 1.2, speed: 0.8, wit: 0.6, guts: 0.5 },
        hintWeight: 1.2,
        skillPointWeight: 0.35,
        energyWeight: 0.25,
        moodWeight: 0.15,
        typeTargets: { Stamina: 2, Speed: 1, Wit: 1 },
        hintKeywordBonus: [{ keywords: ["finale", "stamina", "long"], bonus: 4 }],
    },
    "junior-star": {
        statWeights: { speed: 1.2, wit: 0.7, stamina: 0.5 },
        hintWeight: 1.3,
        skillPointWeight: 0.45,
        energyWeight: 0.35,
        moodWeight: 0.25,
        typeTargets: { Speed: 2, Wit: 1, Stamina: 1 },
        hintKeywordBonus: [{ keywords: ["energy", "mood", "skill"], bonus: 4 }],
    },
}

/** Goal-route archetype → preferred support types (derived from scoring profiles). */
export const SUPPORT_TYPE_TARGETS_BY_GOAL: Record<string, SupportTypeTargets> = Object.fromEntries(
    Object.entries(SUPPORT_GOAL_SCORING_PROFILES).map(([key, profile]) => [key, profile.typeTargets]),
)

const resolveManualWeights = (profile: SupportGoalScoringProfile) => ({
    ...DEFAULT_MANUAL_WEIGHTS,
    ...Object.fromEntries(
        Object.entries(DEFAULT_MANUAL_WEIGHTS).map(([key]) => [
            key,
            profile[key as keyof typeof DEFAULT_MANUAL_WEIGHTS] ?? DEFAULT_MANUAL_WEIGHTS[key as keyof typeof DEFAULT_MANUAL_WEIGHTS],
        ]),
    ),
})

const defaultProfile = (): SupportGoalScoringProfile => SUPPORT_GOAL_SCORING_PROFILES["g1-fans"]

export const getSupportGoalScoringProfile = (goalPresetKey: string): SupportGoalScoringProfile =>
    SUPPORT_GOAL_SCORING_PROFILES[goalPresetKey] ?? defaultProfile()

const scoreTypeFit = (type: SupportCardType | undefined, targets: SupportTypeTargets): number => {
    if (!type) return 0
    const target = targets[type] ?? 0
    return target > 0 ? target * 6 : 0
}

const scoreHintKeywords = (meta: SupportCardMetadata, profile: SupportGoalScoringProfile): number => {
    if (meta.hintSkills.length === 0 || profile.hintKeywordBonus.length === 0) return 0
    let bonus = 0
    for (const hint of meta.hintSkills) {
        const lower = hint.toLowerCase()
        for (const rule of profile.hintKeywordBonus) {
            if (rule.keywords.some((keyword) => lower.includes(keyword))) {
                bonus += rule.bonus
                break
            }
        }
    }
    return bonus
}

const scoreCardStats = (meta: SupportCardMetadata, profile: SupportGoalScoringProfile): number => {
    const stats = meta.stats
    if (!stats) return 0

    const weights = resolveManualWeights(profile)
    let score = 0
    if (stats.friendshipBonus) score += stats.friendshipBonus * weights.friendshipWeight
    if (stats.trainingEffectiveness) score += stats.trainingEffectiveness * weights.trainingEffectivenessWeight
    if (stats.specialtyPriority) score += stats.specialtyPriority * weights.specialtyPriorityWeight * 0.1
    if (stats.initialFriendship) score += stats.initialFriendship * weights.initialFriendshipWeight * 0.15
    if (stats.moodEffect) score += stats.moodEffect * profile.moodWeight * 0.08
    if (stats.fanBonus) score += stats.fanBonus * weights.fanBonusWeight
    if (stats.raceBonus) score += stats.raceBonus * 0.12
    if (stats.hintFrequency) score += stats.hintFrequency * weights.hintFrequencyWeight
    if (stats.hintLevel) score += stats.hintLevel * weights.hintLevelWeight
    if (stats.failureProtection) score += stats.failureProtection * 0.08
    if (stats.energyCostReduction) score += stats.energyCostReduction * profile.energyWeight * 0.05
    score += RARITY_SCORE[stats.rarity]

    for (const [stat, value] of Object.entries(stats.initStats ?? {})) {
        if (!value) continue
        const statWeight = profile.statWeights[stat as keyof typeof profile.statWeights] ?? 0.4
        score += value * statWeight * weights.initStatWeight
    }

    return score
}

/** Scores one support card for a parent-farming goal using event + scraped metadata. */
export const scoreSupportCardForGoal = (name: string, goalPresetKey: string, presetBonus = 0): number => {
    const meta = getSupportCardMetadata(name)
    const profile = getSupportGoalScoringProfile(goalPresetKey)
    const type = supportCardType(name)

    if (!meta) {
        return scoreTypeFit(type, profile.typeTargets) + presetBonus
    }

    let score = scoreTypeFit(meta.type, profile.typeTargets) + presetBonus
    for (const [stat, weight] of Object.entries(profile.statWeights) as Array<
        [keyof SupportGoalScoringProfile["statWeights"], number]
    >) {
        if (!weight) continue
        score += (meta.totals[stat] ?? 0) * weight * 0.08
    }
    score += meta.totals.hintPoints * profile.hintWeight * 0.5
    score += meta.totals.skillPoints * profile.skillPointWeight * 0.02
    score += meta.totals.energy * profile.energyWeight * 0.05
    score += meta.totals.mood * profile.moodWeight * 0.5
    score += scoreHintKeywords(meta, profile)
    score += scoreCardStats(meta, profile)
    score += Math.min(meta.eventCount, 12) * 0.5
    return score
}

/** Scores a four-card owned subset for a goal (higher is better). */
export const scoreOwnedSupportDeck = (
    cards: string[],
    goalPresetKey: string,
    presetOwned: string[] = [],
): number => {
    let score = 0
    const typeCounts: Record<SupportCardType, number> = {
        Speed: 0,
        Stamina: 0,
        Power: 0,
        Guts: 0,
        Wit: 0,
        Groupe: 0,
    }

    for (const name of cards) {
        score += scoreSupportCardForGoal(name, goalPresetKey, presetOwned.includes(name) ? 3 : 0)
        const type = supportCardType(name)
        if (type) typeCounts[type] += 1
    }

    const targets = getSupportGoalScoringProfile(goalPresetKey).typeTargets
    for (const [type, target] of Object.entries(targets) as Array<[SupportCardType, number]>) {
        const have = typeCounts[type] ?? 0
        score += Math.min(have, target) * 4
        if (have < target) score -= (target - have) * 2
    }

    return score
}

/** Ranks support names for friend borrow (best first), excluding [excludeNames]. */
export const rankSupportsForGoal = (
    names: string[],
    goalPresetKey: string,
    excludeNames: string[] = [],
    presetBonusNames: string[] = [],
    sortMode: SupportBorrowSortMode = DEFAULT_SUPPORT_BORROW_SORT_MODE,
): string[] => {
    const excluded = new Set(excludeNames.map((name) => name.toLowerCase()))
    const unique = [...new Set(names)].filter((name) => !excluded.has(name.toLowerCase()))
    return unique.sort((left, right) => {
        if (sortMode === "raceBonus") {
            const raceBonusDiff = raceBonusScore(right) - raceBonusScore(left)
            if (raceBonusDiff !== 0) return raceBonusDiff
        }
        const leftScore = scoreSupportCardForGoal(left, goalPresetKey, presetBonusNames.includes(left) ? 2 : 0)
        const rightScore = scoreSupportCardForGoal(right, goalPresetKey, presetBonusNames.includes(right) ? 2 : 0)
        if (rightScore !== leftScore) return rightScore - leftScore
        return left.localeCompare(right)
    })
}

export const pickBestFriendBorrow = (
    candidates: string[],
    ownedCards: string[],
    goalPresetKey: string,
    traineeName: string,
): string | null => {
    const ranked = rankSupportsForGoal(candidates, goalPresetKey, [traineeName, ...ownedCards])
    return ranked[0] ?? null
}
