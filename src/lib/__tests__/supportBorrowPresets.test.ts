import { SUPPORT_BORROW_PRESETS, findSupportBorrowPreset } from "../supportBorrowPresets"

describe("supportBorrowPresets", () => {
    it("returns goal-specific support lists with known names", () => {
        const crown = findSupportBorrowPreset("classic-crown")
        expect(crown[0]).toBe("Super Creek")
        expect(crown).toContain("Mejiro McQueen")
    })

    it("falls back to g1-fans when goal key is unknown", () => {
        expect(findSupportBorrowPreset("unknown-goal")).toEqual(SUPPORT_BORROW_PRESETS["g1-fans"])
    })

    it("only references supports that exist in bundled data", () => {
        const supports = require("../../data/supports.json") as Record<string, unknown>
        const knownNames = new Set(Object.keys(supports))
        for (const names of Object.values(SUPPORT_BORROW_PRESETS)) {
            for (const name of names) {
                expect(knownNames.has(name)).toBe(true)
            }
        }
    })
})
