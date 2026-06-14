import { skillPlanSettingsPages } from "../pages/SkillPlanSettings/config"

/** Shape of a single skill plan entry in settings. */
export interface SkillPlanConfig {
    enabled: boolean
    strategy: string
    enableBuyNegativeSkills: boolean
    plan: string
    blacklist: string
    excludeGreenSkills: boolean
    excludeRedSkills: boolean
    excludeUniqueSkills: boolean
}

/** All registered skill plan keys from the settings page config. */
export const SKILL_PLAN_KEYS = Object.keys(skillPlanSettingsPages)

const EMPTY_SKILL_PLAN: SkillPlanConfig = {
    enabled: false,
    strategy: "default",
    enableBuyNegativeSkills: false,
    plan: "",
    blacklist: "",
    excludeGreenSkills: false,
    excludeRedSkills: false,
    excludeUniqueSkills: false,
}

/** Default skill plan map keyed by registered plan identifiers. */
export const defaultSkillPlans: Record<string, SkillPlanConfig> = SKILL_PLAN_KEYS.reduce(
    (acc, planKey) => {
        acc[planKey] = { ...EMPTY_SKILL_PLAN }
        return acc
    },
    {} as Record<string, SkillPlanConfig>
)

/**
 * Merge a partial per-plan update with defaults so persisted settings always include required fields.
 * @param planKey Registered plan key (e.g. `preFinals`).
 * @param partial Optional persisted or in-flight partial plan object.
 * @returns A complete plan configuration object.
 */
export const mergeSkillPlanConfig = (planKey: string, partial?: Partial<SkillPlanConfig>): SkillPlanConfig => ({
    ...defaultSkillPlans[planKey],
    ...partial,
})

/**
 * Normalize every plan entry under `skills.plans` by merging with defaults.
 * @param plans Persisted plan map (may contain partial entries).
 * @returns Plan map with all required keys filled from defaults.
 */
export const normalizeSkillPlans = (plans: Record<string, Partial<SkillPlanConfig>>): Record<string, SkillPlanConfig> => {
    const normalized: Record<string, SkillPlanConfig> = {}
    for (const planKey of SKILL_PLAN_KEYS) {
        normalized[planKey] = mergeSkillPlanConfig(planKey, plans[planKey])
    }
    return normalized
}

/**
 * Parse a comma-separated skill ID list into numeric IDs, ignoring invalid tokens.
 * @param csv Comma-separated skill IDs from settings.
 * @returns Parsed positive integer skill IDs.
 */
export const parseSkillIdCsv = (csv: string | undefined | null): number[] => {
    if (!csv || typeof csv !== "string") return []
    return csv
        .split(",")
        .map((token) => Number(token.trim()))
        .filter((id) => Number.isFinite(id) && id > 0)
}
