import type { Settings } from "../context/BotStateContext"
import { normalizeSkillPlans } from "./skillPlanSettings"

/** Racing flags for end-to-end unattended parent careers. */
export const PARENT_FARMING_FULL_UNATTENDED_RACING: Pick<
    Settings["racing"],
    "enableCaratRaceRetry" | "maxCaratRaceRetriesPerRun" | "enableParentFarmingFullUnattended"
> = {
    enableParentFarmingFullUnattended: true,
    enableCaratRaceRetry: true,
    maxCaratRaceRetriesPerRun: 2,
}

/** Enables career-complete skill spending for unattended parent runs. */
export const applyParentFarmingFullUnattendedSkills = (settings: Settings): Settings["skills"] => {
    const plans = normalizeSkillPlans(settings.skills?.plans ?? {})
    return {
        ...settings.skills,
        plans: {
            ...plans,
            careerComplete: {
                ...plans.careerComplete,
                enabled: true,
            },
        },
    }
}

/** Applies full unattended racing + skill plan patches when the flag is on. */
export const applyParentFarmingFullUnattended = (settings: Settings): Settings => {
    if (!settings.racing.enableParentFarmingFullUnattended) return settings
    return {
        ...settings,
        racing: {
            ...settings.racing,
            ...PARENT_FARMING_FULL_UNATTENDED_RACING,
        },
        skills: applyParentFarmingFullUnattendedSkills(settings),
    }
}
