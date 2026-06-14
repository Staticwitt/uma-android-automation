import { optimizeOwnedDeckFromInventory, missingOwnedCards } from "../optimizeSupportDeck"
import { findSupportDeckPreset } from "../supportDeckPresets"

describe("optimizeOwnedDeckFromInventory", () => {
    it("prefers stamina-heavy picks for stayer routes", () => {
        const deck = findSupportDeckPreset("stayer-stamina")
        const inventory = [
            "Super Creek",
            "Mejiro McQueen",
            "Biwa Hayahide",
            "Symboli Rudolf",
            "Silence Suzuka",
            "Maruzensky",
            "King Halo",
            "Seiun Sky",
        ]
        const picked = optimizeOwnedDeckFromInventory(inventory, "Special Week", deck, deck.owned, "stayer-stamina")
        const staminaCount = picked.filter((name) =>
            ["Super Creek", "Mejiro McQueen", "Biwa Hayahide", "Symboli Rudolf", "Mejiro Ryan"].includes(name),
        ).length
        expect(staminaCount).toBeGreaterThanOrEqual(2)
    })
})

describe("missingOwnedCards", () => {
    it("lists cards not in inventory", () => {
        expect(missingOwnedCards(["A", "B", "C"], ["A", "B"])).toEqual(["C"])
    })
})
