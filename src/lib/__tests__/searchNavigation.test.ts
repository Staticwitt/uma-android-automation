import { isSettingsStackPage, searchPageLabel, SETTINGS_STACK_PAGES, SEARCH_PAGE_LABELS } from "../searchNavigation"

describe("searchNavigation", () => {
    it("maps known pages to human-readable labels", () => {
        expect(searchPageLabel("ParentFarmingSettings")).toBe("Parent Farming")
        expect(searchPageLabel("Chat")).toBe("Ask the Docs")
        expect(searchPageLabel("UnknownRoute")).toBe("UnknownRoute")
    })

    it("includes recently added settings stack routes", () => {
        for (const page of ["ParentFarmingSettings", "SmartRaceSolverSettings", "LLMSettings", "Skills", "Chat"]) {
            expect(SEARCH_PAGE_LABELS).toHaveProperty(page)
        }
    })

    it("classifies settings stack pages", () => {
        expect(isSettingsStackPage("TrainingSettings")).toBe(true)
        expect(isSettingsStackPage("ParentFarmingSettings")).toBe(true)
        expect(isSettingsStackPage("Home")).toBe(false)
        expect(isSettingsStackPage("Chat")).toBe(false)
    })

    it("keeps SETTINGS_STACK_PAGES aligned with labeled routes except drawer-only pages", () => {
        for (const page of SETTINGS_STACK_PAGES) {
            expect(SEARCH_PAGE_LABELS).toHaveProperty(page)
        }
    })
})
