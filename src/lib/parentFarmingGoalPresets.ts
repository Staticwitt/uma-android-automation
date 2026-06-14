import type { Settings } from "../context/BotStateContext"
import { DEFAULT_WEIGHTS, type WeightsMap } from "./solver/constants"

export interface ParentFarmingGoalPreset {
    key: string
    label: string
    description: string
    targetEpithets: string[]
    forcedEpithets?: string[]
    weightOverrides?: Partial<WeightsMap>
}

const TARGET_PRIORITY_WEIGHTS: Partial<WeightsMap> = {
    targetEpithetMultiplier: 4.0,
    minimumRaceGapTurns: 1,
}

export const PARENT_FARMING_GOAL_PRESETS: ParentFarmingGoalPreset[] = [
    {
        key: "g1-fans",
        label: "G1 / Fan Parent",
        description: "Pushes high-value G1 volume for fan count and broad inheritance race history.",
        targetEpithets: ["G1 Hunter", "Epoch Pioneer", "First Step to Glory", "The GOAT"],
        weightOverrides: {
            ...TARGET_PRIORITY_WEIGHTS,
            fanWeight: 1.5e-3,
            raceCostPct: 70.0,
            consecutiveRacePenalty: 2.0,
        },
    },
    {
        key: "classic-crown",
        label: "Classic Crown Parent",
        description: "Targets the Classic Triple Crown line plus senior spring/autumn crown routes.",
        targetEpithets: ["Triple Crown", "Way of Kings", "Stunning", "Senior Spring Triple Crown", "Senior Autumn Triple Crown", "Spring Champion", "Fall Champion"],
        weightOverrides: TARGET_PRIORITY_WEIGHTS,
    },
    {
        key: "triple-tiara",
        label: "Triple Tiara Parent",
        description: "Targets Oka Sho, Japanese Oaks, and Shuka Sho inheritance routes.",
        targetEpithets: ["Triple Tiara", "Way of Queens", "Lady", "Double Tiara"],
        weightOverrides: TARGET_PRIORITY_WEIGHTS,
    },
    {
        key: "mile-sprint",
        label: "Mile / Sprint Parent",
        description: "Targets common mile and sprint G1 clusters for short-distance parents.",
        targetEpithets: ["Breakneck Miler", "Mile a Minute", "Speed Star", "Sprint Speedster", "Sprint Go-Getter"],
        weightOverrides: {
            ...TARGET_PRIORITY_WEIGHTS,
            fanWeight: 1.0e-3,
        },
    },
    {
        key: "dirt",
        label: "Dirt Parent",
        description: "Targets dirt race history and dirt G1 achievements. Best with Dirt aptitude raised.",
        targetEpithets: ["Kicking Up Dust", "Dirt G1 Achiever", "Dirt G1 Star", "Dirt G1 Powerhouse", "Dirt G1 Dominator", "All-Rounder", "Dirt Dancer"],
        weightOverrides: {
            ...TARGET_PRIORITY_WEIGHTS,
            includeOpAndPreOp: true,
            fanWeight: 1.0e-3,
        },
    },
    {
        key: "skill-hints",
        label: "Skill Hint Parent",
        description: "Emphasizes hint-reward epithets useful for white-factor-focused parent attempts.",
        targetEpithets: ["Mile a Minute", "Dirt G1 Dominator"],
        weightOverrides: {
            ...TARGET_PRIORITY_WEIGHTS,
            hintWeight: 18.0,
        },
    },
]

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

    return {
        enableParentFarmingMode: true,
        enableSmartRaceSolver: true,
        enableForceRacing: false,
        enableUserInGameRaceAgenda: false,
        smartRaceSolverTargetEpithets: JSON.stringify(targetEpithets),
        smartRaceSolverForcedEpithets: JSON.stringify(forcedEpithets),
        smartRaceSolverWeights: JSON.stringify({
            ...weights,
            ...TARGET_PRIORITY_WEIGHTS,
            ...preset.weightOverrides,
        }),
    }
}
