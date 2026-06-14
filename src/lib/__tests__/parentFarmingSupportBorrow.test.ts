import type { Settings } from "../../context/BotStateContext"
import { findParentFarmingCharacterBundle } from "../parentFarmingCharacterBundles"
import {
    parseSupportBorrowOverrides,
    resolveSupportBorrowCardsForBundle,
    resolveActiveSupportBorrowCards,
} from "../parentFarmingSupportBorrow"

describe("parentFarmingSupportBorrow", () => {
    const mejiroBundle = findParentFarmingCharacterBundle("mejiro-mcqueen-crown")!

    it("prefers user override over bundle defaults", () => {
        const overrides = { [mejiroBundle.key]: ["Kitasan Black", "Gold Ship"] }
        const cards = resolveSupportBorrowCardsForBundle(mejiroBundle, overrides)
        expect(cards).toEqual(["Kitasan Black", "Gold Ship"])
    })

    it("uses bundle defaults when no override exists", () => {
        const cards = resolveSupportBorrowCardsForBundle(mejiroBundle, {})
        expect(cards[0]).toBe("Super Creek")
        expect(cards).toContain("Mejiro McQueen")
    })

    it("resolveActiveSupportBorrowCards reads active bundle with overrides", () => {
        const settings = {
            racing: {
                enableParentFarmingMode: true,
                parentFarmingBundleKey: mejiroBundle.key,
                parentFarmingGoalPresetKey: "classic-crown",
                parentFarmingSupportBorrowOverrides: JSON.stringify({ [mejiroBundle.key]: ["Gold Ship"] }),
                supportBorrowPreferredCards: "[]",
                parentFarmingGoalPresetLabel: "",
                parentFarmingBundleLabel: "",
            },
        } as Settings

        expect(resolveActiveSupportBorrowCards(settings)).toEqual(["Gold Ship"])
    })

    it("parseSupportBorrowOverrides ignores invalid JSON", () => {
        expect(parseSupportBorrowOverrides("not-json")).toEqual({})
    })
})
