import { PARENT_FARMING_CHARACTER_BUNDLES } from "../parentFarmingCharacterBundles"

describe("parentFarmingCharacterBundles support borrow", () => {
    it("defines support borrow cards that exist in supports data", () => {
        const supports = require("../../data/supports.json") as Record<string, unknown>
        const knownNames = new Set(Object.keys(supports))
        for (const bundle of PARENT_FARMING_CHARACTER_BUNDLES) {
            expect(bundle.supportBorrowCards.length).toBeGreaterThan(0)
            for (const name of bundle.supportBorrowCards) {
                expect(knownNames.has(name)).toBe(true)
            }
        }
    })
})
