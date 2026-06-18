import type { Settings } from "../context/BotStateContext"
import { findParentFarmingGoalPreset } from "./parentFarmingGoalPresets"

const GOAL_PRESET_SCENARIO: Record<string, string> = {
    "ura-finals": "URA Finale",
    "unity-aoharu": "Unity Cup",
}

/** Scenario implied by the active parent goal preset or bundle goal key. */
export const resolveParentFarmingScenario = (settings: Settings): string | null => {
    if (!settings.racing.enableParentFarmingAutoScenario) return null
    const presetKey = settings.racing.parentFarmingGoalPresetKey
    if (presetKey && GOAL_PRESET_SCENARIO[presetKey]) return GOAL_PRESET_SCENARIO[presetKey]
    const preset = findParentFarmingGoalPreset(presetKey)
    if (presetKey === "ura-finals" || preset?.key === "ura-finals") return "URA Finale"
    if (presetKey === "unity-aoharu" || preset?.key === "unity-aoharu") return "Unity Cup"
    return null
}

/** Applies scenario from parent goal when auto-scenario is enabled. */
export const applyParentFarmingScenarioSync = (settings: Settings): Settings => {
    const scenario = resolveParentFarmingScenario(settings)
    if (!scenario || settings.general.scenario === scenario) return settings
    return {
        ...settings,
        general: {
            ...settings.general,
            scenario,
        },
    }
}
