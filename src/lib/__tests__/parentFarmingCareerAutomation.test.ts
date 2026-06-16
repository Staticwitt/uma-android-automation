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
        enableAutoEquipOwnedSupportDeck: false,
        enableAutoBorrowSupportCard: false,
        enableAutoSelectLegacyParents: false,
        enableAutoStartCareer: false,
        enableParentFarmingMultiRun: false,
        parentFarmingMultiRunCount: 3,
    }) as Settings["racing"]

describe("parentFarmingCareerAutomation", () => {
    it("buildFullDeckApplyRacingPatch enables all automation flags", () => {
        const next = buildFullDeckApplyRacingPatch(baseRacing(), ["A", "B", "C", "D"], ["Friend"], "Special Week")
        expect(next.enableAutoEquipOwnedSupportDeck).toBe(true)
        expect(next.enableAutoBorrowSupportCard).toBe(true)
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

    it("isCareerSelectionReady requires setup, deck/borrow, and full automation", () => {
        const partial: Settings = {
            racing: {
                ...baseRacing(),
                ...PARENT_FARMING_CAREER_AUTOMATION_FLAGS,
                supportBorrowPreferredCards: '["Kitasan Black"]',
            },
        } as Settings
        expect(isCareerSelectionReady(partial)).toBe(true)

        const noBorrow: Settings = {
            racing: {
                ...baseRacing(),
                ...PARENT_FARMING_CAREER_AUTOMATION_FLAGS,
            },
        } as Settings
        expect(isCareerSelectionReady(noBorrow)).toBe(false)
    })

    it("formatCareerAutomationSummary reflects readiness", () => {
        const ready: Settings = {
            racing: {
                ...baseRacing(),
                ...PARENT_FARMING_CAREER_AUTOMATION_FLAGS,
                supportBorrowPreferredCards: '["Gold Ship"]',
            },
        } as Settings
        expect(formatCareerAutomationSummary(ready)).toContain("Full automation")

        const partial: Settings = {
            racing: {
                ...baseRacing(),
                enableAutoBorrowSupportCard: true,
            },
        } as Settings
        expect(formatCareerAutomationSummary(partial)).toContain("1/4")
    })

    it("getCareerAutomationSteps warns when auto-equip has no saved deck", () => {
        const settings: Settings = {
            racing: {
                ...baseRacing(),
                enableAutoEquipOwnedSupportDeck: true,
            },
        } as Settings
        const equipStep = getCareerAutomationSteps(settings).find((step) => step.id === "auto-equip")
        expect(equipStep?.status).toBe("warning")
    })

    it("isFullCareerAutomationEnabled checks all four toggles", () => {
        expect(isFullCareerAutomationEnabled({ racing: { ...baseRacing(), ...PARENT_FARMING_CAREER_AUTOMATION_FLAGS } } as Settings)).toBe(true)
        expect(isFullCareerAutomationEnabled({ racing: baseRacing() } as Settings)).toBe(false)
    })
})
