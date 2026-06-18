import type { Settings } from "../context/BotStateContext"
import { refreshParentFarmingSettings } from "./parentFarmingPreset"
import { applyParentFarmingScenarioSync } from "./parentFarmingScenarioSync"
import {
    applyBreedingGenerationToSettings,
    breedingPlanToGoalQueue,
    buildBreedingPlanGoalQueueResolved,
    parseParentFarmingBreedingPlan,
} from "./parentFarmingBreedingPlan"
import { serializeParentFarmingGoalQueueResolved } from "./parentFarmingGoalQueue"

/**
 * Final settings snapshot written to SQLite before the native bot service starts.
 * Re-resolves parent-farming slices so Kotlin reads preset-aligned training and racing values.
 */
export const prepareSettingsForBotStart = (settings: Settings): Settings => {
    let next = refreshParentFarmingSettings(applyParentFarmingScenarioSync(settings))
    if (next.racing.enableParentFarmingBreedingPlan) {
        const plan = parseParentFarmingBreedingPlan(next.racing.parentFarmingBreedingPlan)
        const queueItems = breedingPlanToGoalQueue(plan)
        if (queueItems.length > 0) {
            const resolved = buildBreedingPlanGoalQueueResolved(next, plan)
            next = refreshParentFarmingSettings(applyParentFarmingScenarioSync(applyBreedingGenerationToSettings(next, 0)))
            const generationCount = plan.generations.length
            next = {
                ...next,
                racing: {
                    ...next.racing,
                    enableParentFarmingGoalQueue: true,
                    enableParentFarmingMultiRun: true,
                    parentFarmingMultiRunCount: Math.max(next.racing.parentFarmingMultiRunCount ?? 1, generationCount),
                    parentFarmingGoalQueue: JSON.stringify(queueItems),
                    parentFarmingGoalQueueResolved: serializeParentFarmingGoalQueueResolved(resolved),
                },
            }
        }
    }
    return next
}
