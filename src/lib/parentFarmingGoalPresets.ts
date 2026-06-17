import type { Settings } from "../context/BotStateContext"
import { DEFAULT_WEIGHTS, type WeightsMap } from "./solver/constants"
import type { SparkSelectionStrategy } from "./sparkSelection"
import type { LegacyParentSelectionStrategy } from "./legacyParentSelection"
import { legacyStrategyFromSparkStrategy } from "./legacyParentSelection"
import { buildEpithetTiersFromLists } from "./epithetTiers"
import {
    buildParentFarmingTrainingSettings,
    PARENT_FARMING_GOAL_RACING_BASE,
    PARENT_FARMING_SOLVER_WEIGHT_OVERRIDES,
} from "./parentFarmingConstants"
import { findSupportBorrowPreset } from "./supportBorrowPresets"
import { excludeTraineeFromSupportList } from "./parentFarmingSupportBorrow"

export interface ParentFarmingGoalPreset {
    key: string
    label: string
    description: string
    targetEpithets: string[]
    forcedEpithets?: string[]
    weightOverrides?: Partial<WeightsMap>
    /** Training distance bias and stat priorities applied with the goal preset. */
    trainingOverrides?: Partial<Settings["training"]>
    /** Inheritance spark picker override for this parent route. */
    sparkSelectionStrategy?: SparkSelectionStrategy
    /** Legacy parent OCR scoring when no preferred names are set. Defaults from spark strategy. */
    legacyParentSelectionStrategy?: LegacyParentSelectionStrategy
    /** Optional multi-run quality target applied with the preset (enables stop-on-quality). */
    qualityTargetScore?: number
}

const TARGET_PRIORITY_WEIGHTS: Partial<WeightsMap> = {
    ...PARENT_FARMING_SOLVER_WEIGHT_OVERRIDES,
}

/** Solver tuning for epithet-critical routes: spacing between races and softer consecutive-race stacking. */
const QUALITY_ROUTE_WEIGHTS: Partial<WeightsMap> = {
    minimumRaceGapTurns: 1,
    consecutiveRacePenalty: 3.0,
}

/** G1 / fan routes: keep speed and stamina up between scheduled G1 races. */
const statPriorityProfile = (order: string[]): Pick<Settings["training"], "statPrioritization" | "eventChoiceStatPriority" | "summerTrainingStatPriority"> => ({
    statPrioritization: order,
    eventChoiceStatPriority: [...order],
    summerTrainingStatPriority: [...order],
})

const G1_FAN_TRAINING: Partial<Settings["training"]> = {
    preferredDistanceOverride: "Auto",
    ...statPriorityProfile(["Speed", "Stamina", "Power", "Wit", "Guts"]),
}

const MILE_SPRINT_TRAINING: Partial<Settings["training"]> = {
    preferredDistanceOverride: "Mile",
    ...statPriorityProfile(["Speed", "Power", "Stamina", "Wit", "Guts"]),
}

const MILE_QUEEN_TRAINING: Partial<Settings["training"]> = {
    preferredDistanceOverride: "Mile",
    ...statPriorityProfile(["Speed", "Stamina", "Power", "Wit", "Guts"]),
}

const MEDIUM_STAMINA_TRAINING: Partial<Settings["training"]> = {
    preferredDistanceOverride: "Medium",
    ...statPriorityProfile(["Stamina", "Power", "Speed", "Wit", "Guts"]),
}

const LONG_STAMINA_TRAINING: Partial<Settings["training"]> = {
    preferredDistanceOverride: "Long",
    ...statPriorityProfile(["Stamina", "Power", "Speed", "Wit", "Guts"]),
}

const DIRT_TRAINING: Partial<Settings["training"]> = {
    preferredDistanceOverride: "Auto",
    ...statPriorityProfile(["Power", "Speed", "Stamina", "Wit", "Guts"]),
}

const SKILL_HINT_TRAINING: Partial<Settings["training"]> = {
    preferredDistanceOverride: "Auto",
    ...statPriorityProfile(["Wit", "Speed", "Stamina", "Power", "Guts"]),
    enablePrioritizeSkillHints: true,
}

const JUNIOR_STAR_TRAINING: Partial<Settings["training"]> = {
    preferredDistanceOverride: "Auto",
    ...statPriorityProfile(["Speed", "Power", "Stamina", "Wit", "Guts"]),
}

export const PARENT_FARMING_GOAL_PRESETS: ParentFarmingGoalPreset[] = [
    {
        key: "g1-fans",
        label: "G1 / Fan Parent",
        description: "Pushes high-value G1 volume for fan count and broad inheritance race history.",
        targetEpithets: ["G1 Hunter", "Epoch Pioneer", "First Step to Glory", "The GOAT"],
        weightOverrides: {
            fanWeight: 1.5e-3,
            raceCostPct: 70.0,
            consecutiveRacePenalty: 2.0,
            minimumFanTarget: 120000,
            minWinRateGuard: 0.75,
        },
        trainingOverrides: G1_FAN_TRAINING,
        qualityTargetScore: 80,
    },
    {
        key: "classic-crown",
        label: "Classic Crown Parent",
        description: "Forces Triple Crown completion and targets senior crown epithets for classic-route parents.",
        targetEpithets: ["Triple Crown", "Way of Kings", "Stunning", "Senior Spring Triple Crown", "Senior Autumn Triple Crown", "Spring Champion", "Fall Champion"],
        forcedEpithets: ["Triple Crown"],
        weightOverrides: {
            ...TARGET_PRIORITY_WEIGHTS,
            ...QUALITY_ROUTE_WEIGHTS,
            minWinRateGuard: 0.82,
        },
        trainingOverrides: { ...LONG_STAMINA_TRAINING, disableStatTargets: false },
        qualityTargetScore: 90,
    },
    {
        key: "triple-tiara",
        label: "Triple Tiara Parent",
        description: "Forces Triple Tiara completion and targets Oaks / queen-route epithets.",
        targetEpithets: ["Triple Tiara", "Way of Queens", "Lady", "Double Tiara"],
        forcedEpithets: ["Triple Tiara"],
        weightOverrides: {
            ...TARGET_PRIORITY_WEIGHTS,
            ...QUALITY_ROUTE_WEIGHTS,
            minWinRateGuard: 0.82,
        },
        trainingOverrides: { ...MILE_QUEEN_TRAINING, disableStatTargets: false },
        qualityTargetScore: 90,
    },
    {
        key: "mile-sprint",
        label: "Mile / Sprint Parent",
        description: "Targets common mile and sprint G1 clusters for short-distance parents.",
        targetEpithets: ["Breakneck Miler", "Mile a Minute", "Speed Star", "Sprint Speedster", "Sprint Go-Getter"],
        weightOverrides: {
            ...TARGET_PRIORITY_WEIGHTS,
            fanWeight: 1.0e-3,
            minWinRateGuard: 0.7,
        },
        trainingOverrides: MILE_SPRINT_TRAINING,
    },
    {
        key: "dirt",
        label: "Dirt Parent",
        description: "Forces Dirt G1 Dominator and targets dirt race history epithets. Best with Dirt aptitude raised.",
        targetEpithets: ["Kicking Up Dust", "Dirt G1 Achiever", "Dirt G1 Star", "Dirt G1 Powerhouse", "Dirt G1 Dominator", "All-Rounder", "Dirt Dancer"],
        forcedEpithets: ["Dirt G1 Dominator"],
        weightOverrides: {
            ...TARGET_PRIORITY_WEIGHTS,
            includeOpAndPreOp: true,
            fanWeight: 1.0e-3,
        },
        trainingOverrides: DIRT_TRAINING,
    },
    {
        key: "skill-hints",
        label: "Skill Hint Parent",
        description: "Forces Legendary and emphasizes hint-reward epithets for white-factor parents.",
        targetEpithets: ["Mile a Minute", "Dirt G1 Dominator", "Legendary"],
        forcedEpithets: ["Legendary"],
        weightOverrides: {
            ...TARGET_PRIORITY_WEIGHTS,
            hintWeight: 18.0,
            minWinRateGuard: 0.65,
        },
        trainingOverrides: SKILL_HINT_TRAINING,
        sparkSelectionStrategy: "SkillHints",
        legacyParentSelectionStrategy: "WhiteFactor",
        qualityTargetScore: 85,
    },
    {
        key: "medium-long",
        label: "Medium / Long Parent",
        description: "Targets stamina G1 clusters, stayers, and long-distance inheritance history.",
        targetEpithets: [
            "Colossus",
            "Emperor",
            "Globe-Trotter",
            "Kikuka Krazy",
            "Tenno Sweep",
            "Stamina Stockpile",
            "Speedy Stayer",
            "Superb Stayer",
            "Powerhouse",
            "Stunning",
            "Long Shot",
        ],
        weightOverrides: {
            ...TARGET_PRIORITY_WEIGHTS,
            fanWeight: 1.0e-3,
            allowSummerRacing: true,
        },
        trainingOverrides: MEDIUM_STAMINA_TRAINING,
    },
    {
        key: "stayer-stamina",
        label: "Stayer / Stamina Parent",
        description: "Prioritizes stayer epithets and stamina-focused G1 routes for endurance parents.",
        targetEpithets: [
            "Stamina Stockpile",
            "Speedy Stayer",
            "Superb Stayer",
            "Sprinter Stayer",
            "Stress-Free Stayer",
            "Colossus",
            "Powerhouse",
            "Long Shot",
        ],
        weightOverrides: {
            ...TARGET_PRIORITY_WEIGHTS,
            raceCostPct: 80.0,
        },
        trainingOverrides: LONG_STAMINA_TRAINING,
    },
    {
        key: "derby-stayer-line",
        label: "Derby / Stayer Line",
        description: "Forces Derby Dreamer and targets derby / stayer epithets along the Triple Crown axis.",
        targetEpithets: [
            "Derby Dreamer",
            "Derby Umamusume",
            "Globe-Trotter",
            "Kikuka Krazy",
            "Stunning",
            "Way of Kings",
            "True Way of Kings",
            "Double Crown",
            "Divergent Double Crown",
        ],
        forcedEpithets: ["Derby Dreamer"],
        weightOverrides: {
            ...TARGET_PRIORITY_WEIGHTS,
            ...QUALITY_ROUTE_WEIGHTS,
            minWinRateGuard: 0.82,
        },
        trainingOverrides: { ...LONG_STAMINA_TRAINING, disableStatTargets: false },
    },
    {
        key: "queens-race",
        label: "Queen's Race Parent",
        description: "Forces Oaks Obsessed and targets queen-route epithets for female inheritance lines.",
        targetEpithets: [
            "Queen of the Amazons",
            "Mile Queen",
            "Empress",
            "Extraordinary Empress",
            "Best Actress",
            "Lady",
            "Way of Queens",
            "Oaks Obsessed",
            "Oaks Umamusume",
        ],
        forcedEpithets: ["Oaks Obsessed"],
        weightOverrides: {
            ...TARGET_PRIORITY_WEIGHTS,
            ...QUALITY_ROUTE_WEIGHTS,
            fanWeight: 1.0e-3,
            minWinRateGuard: 0.8,
        },
        trainingOverrides: { ...MILE_QUEEN_TRAINING, disableStatTargets: false },
    },
    {
        key: "turf-allrounder",
        label: "Turf All-Rounder",
        description: "Broad turf G1 history and versatile race-distance epithets for flexible parents.",
        targetEpithets: [
            "All-Rounder",
            "Turf Terror",
            "Turf Sorceress",
            "Miss All Turf",
            "Globe-Trotter",
            "G1 Hunter",
            "Epoch Pioneer",
            "Consistent",
            "Comeback Champion",
        ],
        weightOverrides: {
            fanWeight: 1.2e-3,
            raceCostPct: 72.0,
            minimumFanTarget: 100000,
        },
        trainingOverrides: G1_FAN_TRAINING,
        sparkSelectionStrategy: "Balanced",
    },
    {
        key: "senior-finale",
        label: "Senior / Finale Parent",
        description: "Autumn, spring, and end-year G1 epithets including Tenno Sho and Arima routes.",
        targetEpithets: [
            "Fall Champion",
            "Spring Champion",
            "Finals Champion",
            "Tenno Sweep",
            "Emperor",
            "Comeback Champion",
            "Ruler of Japan",
            "Senior Autumn Triple Crown",
            "Senior Spring Triple Crown",
        ],
        weightOverrides: {
            ...TARGET_PRIORITY_WEIGHTS,
            allowSummerRacing: true,
        },
        trainingOverrides: LONG_STAMINA_TRAINING,
    },
    {
        key: "junior-star",
        label: "Junior Star Parent",
        description: "Early-career showcase epithets useful for junior-heavy inheritance histories.",
        targetEpithets: ["Junior Jewel", "Blooming Sakura", "Derby Dreamer", "First Step to Glory", "G1 Winner"],
        weightOverrides: {
            ...TARGET_PRIORITY_WEIGHTS,
            fanWeight: 1.0e-3,
            includeOpAndPreOp: true,
            minWinRateGuard: 0.68,
        },
        trainingOverrides: JUNIOR_STAR_TRAINING,
    },
    {
        key: "ura-finals",
        label: "URA Finals Parent",
        description: "Forces URA Finals Final and targets legend-route epithets for URA Finale scenario parents.",
        targetEpithets: ["Finals Champion", "Legendary Diva", "G1 Hunter", "Epoch Pioneer", "The GOAT", "Ruler of Japan"],
        forcedEpithets: ["Finals Champion"],
        weightOverrides: {
            ...TARGET_PRIORITY_WEIGHTS,
            ...QUALITY_ROUTE_WEIGHTS,
            fanWeight: 1.3e-3,
            minimumFanTarget: 150000,
            minWinRateGuard: 0.8,
        },
        trainingOverrides: G1_FAN_TRAINING,
        qualityTargetScore: 88,
    },
    {
        key: "unity-aoharu",
        label: "Unity Cup / Aoharu Parent",
        description: "Targets Unity Cup team-training epithets including Dream Team and Spirit Burst routes.",
        targetEpithets: ["Dream Team", "Hearts United", "Team Player", "Spirit Burst", "Witness to Legend", "Team Player Star Slayer"],
        forcedEpithets: ["Dream Team"],
        weightOverrides: {
            ...TARGET_PRIORITY_WEIGHTS,
            hintWeight: 14.0,
            minWinRateGuard: 0.72,
        },
        trainingOverrides: SKILL_HINT_TRAINING,
        sparkSelectionStrategy: "Balanced",
        qualityTargetScore: 82,
    },
]

export const findParentFarmingGoalPreset = (key: string): ParentFarmingGoalPreset | undefined =>
    PARENT_FARMING_GOAL_PRESETS.find((preset) => preset.key === key)

const parseStringList = (json: string | undefined): string[] => {
    try {
        const parsed = JSON.parse(json || "[]")
        return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []
    } catch {
        return []
    }
}

const parseWeights = (json: string | undefined): WeightsMap => {
    try {
        const parsed = JSON.parse(json || "{}")
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return { ...DEFAULT_WEIGHTS, ...parsed }
    } catch {
        // Fall through to defaults.
    }
    return { ...DEFAULT_WEIGHTS }
}

const mergeNames = (current: string[], additions: string[], allowedNames?: Set<string>): string[] => {
    const next = new Set(current)
    for (const name of additions) {
        if (allowedNames && !allowedNames.has(name)) continue
        next.add(name)
    }
    return Array.from(next)
}

export interface ParentFarmingGoalPresetApplyOptions {
    /** When false, target and forced epithets are replaced with the preset lists instead of merged. */
    mergeEpithets?: boolean
}

export const applyParentFarmingGoalPresetToRacing = (
    racing: Settings["racing"],
    preset: ParentFarmingGoalPreset,
    allowedNames?: Set<string>,
    options?: ParentFarmingGoalPresetApplyOptions
): Partial<Settings["racing"]> => {
    const mergeEpithets = options?.mergeEpithets ?? true
    const filterAllowed = (names: string[]): string[] => {
        if (!allowedNames) return names
        return names.filter((name) => allowedNames.has(name))
    }
    const targetEpithets = mergeEpithets
        ? mergeNames(parseStringList(racing.smartRaceSolverTargetEpithets), preset.targetEpithets, allowedNames)
        : filterAllowed(preset.targetEpithets)
    const forcedEpithets = mergeEpithets
        ? mergeNames(parseStringList(racing.smartRaceSolverForcedEpithets), preset.forcedEpithets ?? [], allowedNames)
        : filterAllowed(preset.forcedEpithets ?? [])
    const weights = parseWeights(racing.smartRaceSolverWeights)
    const sparkSelectionStrategy = preset.sparkSelectionStrategy ?? PARENT_FARMING_GOAL_RACING_BASE.sparkSelectionStrategy
    const legacyParentSelectionStrategy =
        preset.legacyParentSelectionStrategy ?? legacyStrategyFromSparkStrategy(sparkSelectionStrategy)

    return {
        ...PARENT_FARMING_GOAL_RACING_BASE,
        smartRaceSolverTargetEpithets: JSON.stringify(targetEpithets),
        smartRaceSolverForcedEpithets: JSON.stringify(forcedEpithets),
        smartRaceSolverEpithetTiers: JSON.stringify(buildEpithetTiersFromLists(forcedEpithets, targetEpithets)),
        smartRaceSolverWeights: JSON.stringify({
            ...weights,
            ...TARGET_PRIORITY_WEIGHTS,
            ...preset.weightOverrides,
        }),
        sparkSelectionStrategy,
        legacyParentSelectionStrategy,
        ...(preset.qualityTargetScore != null
            ? {
                  enableParentFarmingStopOnQualityTarget: true,
                  parentFarmingQualityTargetScore: preset.qualityTargetScore,
              }
            : {}),
        supportBorrowPreferredCards: JSON.stringify(
            excludeTraineeFromSupportList(
                findSupportBorrowPreset(preset.key),
                racing.smartRaceSolverCharacterPreset,
                findSupportBorrowPreset(preset.key),
            ),
        ),
        parentFarmingGoalPresetKey: preset.key,
        parentFarmingGoalPresetLabel: preset.label,
        parentFarmingBundleKey: "",
        parentFarmingBundleLabel: "",
    }
}

/** Applies parent-farming training defaults plus goal-specific distance and stat priorities. */
export const applyParentFarmingGoalPresetToTraining = (
    training: Settings["training"],
    preset: ParentFarmingGoalPreset,
): Partial<Settings["training"]> => ({
    ...buildParentFarmingTrainingSettings(training),
    ...(preset.trainingOverrides ?? {}),
})
