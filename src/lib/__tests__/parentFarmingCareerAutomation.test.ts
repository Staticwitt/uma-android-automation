import type { Settings } from "../../context/BotStateContext"
import {
    buildFullDeckApplyRacingPatch,
    formatCareerAutomationSummary,
    getCareerAutomationSteps,
    isCareerSelectionReady,
    isFullCareerAutomationEnabled,
    PARENT_FARMING_CAREER_AUTOMATION_FLAGS,
} from "../parentFarmingCareerAutomation"

const baseRacing = (): Settings["racing"] =>
    ({
        enableParentFarmingMode: true,
        parentFarmingBundleKey: "mejiro-mcqueen-crown",
        parentFarmingGoalPresetKey: "classic-crown",
        supportDeckOwnedCards: "[]",
        supportBorrowPreferredCards: "[]",
        enableAutoSelectLegacyParents: false,
        enableAutoStartCareer: false,
        enableParentFarmingMultiRun: false,
        parentFarmingMultiRunCount: 3,
    }) as Settings["racing"]

describe("parentFarmingCareerAutomation", () => {
    it("buildFullDeckApplyRacingPatch enables all automation flags", () => {
        const next = buildFullDeckApplyRacingPatch(baseRacing(), ["A", "B", "C", "D"], ["Friend"], "Special Week")
        expect(next.enableAutoSelectLegacyParents).toBe(true)
        expect(next.enableAutoStartCareer).toBe(true)
        expect(JSON.parse(next.supportDeckOwnedCards)).toEqual(["A", "B", "C", "D"])
    })

    it("buildFullDeckApplyRacingPatch excludes trainee from borrow and owned lists", () => {
        const next = buildFullDeckApplyRacingPatch(
            baseRacing(),
            ["Speed", "Grass Wonder", "Stamina", "Power"],
            ["Grass Wonder", "Silence Suzuka"],
            "Grass Wonder",
        )
        const owned = JSON.parse(next.supportDeckOwnedCards) as string[]
        const borrow = JSON.parse(next.supportBorrowPreferredCards) as string[]
        expect(owned).not.toContain("Grass Wonder")
        expect(borrow).not.toContain("Grass Wonder")
        expect(borrow[0]).toBe("Silence Suzuka")
    })

    it("isCareerSelectionReady requires setup and full automation", () => {
        const ready: Settings = {
            racing: {
                ...baseRacing(),
                ...PARENT_FARMING_CAREER_AUTOMATION_FLAGS,
            },
        } as Settings
        expect(isCareerSelectionReady(ready)).toBe(true)

        const noSetup: Settings = {
            racing: {
                ...baseRacing(),
                ...PARENT_FARMING_CAREER_AUTOMATION_FLAGS,
                parentFarmingBundleKey: "",
                parentFarmingGoalPresetKey: "",
            },
        } as Settings
        expect(isCareerSelectionReady(noSetup)).toBe(false)
    })

    it("formatCareerAutomationSummary reflects readiness", () => {
        const ready: Settings = {
            racing: {
                ...baseRacing(),
                ...PARENT_FARMING_CAREER_AUTOMATION_FLAGS,
            },
        } as Settings
        expect(formatCareerAutomationSummary(ready)).toContain("Full automation")

        const partial: Settings = {
            racing: {
                ...baseRacing(),
                enableAutoSelectLegacyParents: true,
            },
        } as Settings
        expect(formatCareerAutomationSummary(partial)).toContain("1/2")
    })

    it("getCareerAutomationSteps warns when owned deck has no saved slots", () => {
        const settings: Settings = { racing: baseRacing() } as Settings
        const ownedDeckStep = getCareerAutomationSteps(settings).find((step) => step.id === "owned-deck")
        expect(ownedDeckStep?.status).toBe("warning")
    })

    it("isFullCareerAutomationEnabled checks both toggles", () => {
        expect(isFullCareerAutomationEnabled({ racing: { ...baseRacing(), ...PARENT_FARMING_CAREER_AUTOMATION_FLAGS } } as Settings)).toBe(true)
        expect(isFullCareerAutomationEnabled({ racing: baseRacing() } as Settings)).toBe(false)
    })
})
