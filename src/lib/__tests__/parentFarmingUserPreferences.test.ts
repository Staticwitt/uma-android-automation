import type { Settings } from "../../context/BotStateContext"
import { resolveParentFarmingSettings } from "../parentFarmingResolver"
import { preserveParentFarmingUserRacing } from "../parentFarmingUserPreferences"

const createSettings = (): Settings =>
    ({
        general: { scenario: "Trackblazer", enableStopBeforeFinals: true },
        racing: {
            enableParentFarmingMode: true,
            parentFarmingGoalPresetKey: "g1-fans",
            parentFarmingGoalPresetLabel: "G1 / Fans Parent",
            parentFarmingBundleKey: "",
            parentFarmingResolverRevision: 0,
            smartRaceSolverCharacterPreset: "Special Week",
            enableParentFarmingBreedingPlan: true,
            enableAutoStartCareer: false,
            enableParentFarmingMultiRun: true,
            parentFarmingMultiRunCount: 5,
            enableAutoSelectLegacyParents: false,
        },
        skills: { enableSkillPointCheck: true },
        training: {
            maximumFailureChance: 20,
            preferredDistanceOverride: "Default",
            enablePrioritizeSkillHints: false,
            disableStatTargets: false,
            statPrioritization: ["Guts", "Wit", "Power", "Stamina", "Speed"],
        },
    }) as Settings

describe("parentFarmingUserPreferences", () => {
    it("preserveParentFarmingUserRacing keeps user toggles over preset defaults", () => {
        const seed = createSettings().racing
        const resolved = {
            ...seed,
            enableParentFarmingBreedingPlan: false,
            enableAutoStartCareer: true,
            enableParentFarmingMultiRun: false,
            parentFarmingMultiRunCount: 1,
            enableAutoSelectLegacyParents: true,
        }

        const merged = preserveParentFarmingUserRacing(seed, resolved)
        expect(merged.enableParentFarmingBreedingPlan).toBe(true)
        expect(merged.enableAutoStartCareer).toBe(false)
        expect(merged.enableParentFarmingMultiRun).toBe(true)
        expect(merged.parentFarmingMultiRunCount).toBe(5)
        expect(merged.enableAutoSelectLegacyParents).toBe(false)
    })

    it("resolveParentFarmingSettings preserves user toggles by default on refresh", () => {
        const settings = createSettings()
        const result = resolveParentFarmingSettings(settings)
        expect(result.racing.enableParentFarmingBreedingPlan).toBe(true)
        expect(result.racing.enableAutoStartCareer).toBe(false)
        expect(result.racing.enableParentFarmingMultiRun).toBe(true)
        expect(result.racing.parentFarmingMultiRunCount).toBe(5)
        expect(result.racing.enableAutoSelectLegacyParents).toBe(false)
    })

    it("resolveParentFarmingSettings can reset preset-owned toggles when preserveUserPreferences is false", () => {
        const settings = createSettings()
        const result = resolveParentFarmingSettings(settings, { preserveUserPreferences: false })
        expect(result.racing.enableAutoStartCareer).toBe(true)
        expect(result.racing.enableAutoSelectLegacyParents).toBe(true)
        expect(result.racing.enableParentFarmingMultiRun).toBe(true)
    })
})
