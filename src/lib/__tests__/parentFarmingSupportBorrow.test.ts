import type { Settings } from "../../context/BotStateContext"
import { findParentFarmingCharacterBundle } from "../parentFarmingCharacterBundles"
import {
    excludeTraineeFromSupportList,
    namesMatchTrainee,
    parseSupportBorrowOverrides,
    resolveActiveSupportBorrowCards,
    resolveSupportBorrowCardsForBundle,
    substituteTraineeInOwnedDeck,
} from "../parentFarmingSupportBorrow"

describe("parentFarmingSupportBorrow", () => {
    const mejiroBundle = findParentFarmingCharacterBundle("mejiro-mcqueen-crown")!
    const grassBundle = findParentFarmingCharacterBundle("grass-wonder-mile")!

    it("namesMatchTrainee compares case-insensitively", () => {
        expect(namesMatchTrainee("Grass Wonder", "grass wonder")).toBe(true)
        expect(namesMatchTrainee("Oguri Cap", "Kitasan Black")).toBe(false)
    })

    it("excludeTraineeFromSupportList removes trainee and backfills alternates", () => {
        const cards = excludeTraineeFromSupportList(
            ["Grass Wonder", "Silence Suzuka"],
            "Grass Wonder",
            ["Maruzensky", "King Halo"],
        )
        expect(cards).not.toContain("Grass Wonder")
        expect(cards[0]).toBe("Silence Suzuka")
        expect(cards).toContain("Maruzensky")
    })

    it("substituteTraineeInOwnedDeck replaces trainee slots", () => {
        const owned = substituteTraineeInOwnedDeck(
            ["Speed", "Grass Wonder", "Stamina", "Power"],
            "Grass Wonder",
            ["Silence Suzuka", "Maruzensky", "King Halo"],
        )
        expect(owned).not.toContain("Grass Wonder")
        expect(owned.length).toBe(4)
    })

    it("substituteTraineeInOwnedDeck drops duplicate slots so the same card is never assigned twice", () => {
        const owned = substituteTraineeInOwnedDeck(
            ["Kitasan Black", "Gold Ship", "kitasan black", "Power"],
            "Grass Wonder",
            ["Silence Suzuka"],
        )
        expect(owned).toEqual(["Kitasan Black", "Gold Ship", "Power"])
    })

    it("prefers user override over bundle defaults", () => {
        const overrides = { [mejiroBundle.key]: ["Kitasan Black", "Gold Ship"] }
        const cards = resolveSupportBorrowCardsForBundle(mejiroBundle, overrides)
        expect(cards).toEqual(expect.arrayContaining(["Kitasan Black", "Gold Ship"]))
        expect(cards.length).toBe(2)
    })

    it("uses bundle defaults when no override exists and excludes trainee", () => {
        const cards = resolveSupportBorrowCardsForBundle(mejiroBundle, {})
        expect(cards.length).toBeGreaterThan(0)
        expect(cards).not.toContain("Mejiro McQueen")
        expect(cards).toContain("Super Creek")
    })

    it("excludes trainee from grass wonder bundle borrow list", () => {
        const cards = resolveSupportBorrowCardsForBundle(grassBundle, {})
        expect(cards).not.toContain("Grass Wonder")
        expect(cards.length).toBeGreaterThan(0)
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
                smartRaceSolverCharacterPreset: "Mejiro McQueen",
            },
        } as Settings

        expect(resolveActiveSupportBorrowCards(settings)).toEqual(["Gold Ship"])
    })

    it("parseSupportBorrowOverrides ignores invalid JSON", () => {
        expect(parseSupportBorrowOverrides("not-json")).toEqual({})
    })
})
