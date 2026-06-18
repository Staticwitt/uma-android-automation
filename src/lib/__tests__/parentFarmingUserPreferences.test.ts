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
            enableParentFarmingColdStart: true,
            enableAutoBorrowSupportCard: false,
            enableParentFarmingMultiRun: true,
            parentFarmingMultiRunCount: 5,
            enableAutoEquipOwnedSupportDeck: false,
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
            enableParentFarmingColdStart: false,
            enableAutoBorrowSupportCard: true,
            enableParentFarmingMultiRun: false,
            parentFarmingMultiRunCount: 1,
            enableAutoEquipOwnedSupportDeck: true,
        }

        const merged = preserveParentFarmingUserRacing(seed, resolved)
        expect(merged.enableParentFarmingColdStart).toBe(true)
        expect(merged.enableAutoBorrowSupportCard).toBe(false)
        expect(merged.enableParentFarmingMultiRun).toBe(true)
        expect(merged.parentFarmingMultiRunCount).toBe(5)
        expect(merged.enableAutoEquipOwnedSupportDeck).toBe(false)
    })

    it("resolveParentFarmingSettings preserves user toggles by default on refresh", () => {
        const settings = createSettings()
        const result = resolveParentFarmingSettings(settings)
        expect(result.racing.enableParentFarmingColdStart).toBe(true)
        expect(result.racing.enableAutoBorrowSupportCard).toBe(false)
        expect(result.racing.enableParentFarmingMultiRun).toBe(true)
        expect(result.racing.parentFarmingMultiRunCount).toBe(5)
        expect(result.racing.enableAutoEquipOwnedSupportDeck).toBe(false)
    })

    it("resolveParentFarmingSettings can reset preset-owned toggles when preserveUserPreferences is false", () => {
        const settings = createSettings()
        const result = resolveParentFarmingSettings(settings, { preserveUserPreferences: false })
        expect(result.racing.enableAutoBorrowSupportCard).toBe(true)
        expect(result.racing.enableAutoEquipOwnedSupportDeck).toBe(true)
        expect(result.racing.enableParentFarmingMultiRun).toBe(true)
    })
})
