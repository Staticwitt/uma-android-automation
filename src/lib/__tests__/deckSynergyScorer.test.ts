import { scoreDeck, type SupportCard } from "../deckSynergyScorer"

const card = (type: SupportCard["type"], rarity: SupportCard["rarity"] = "SSR"): SupportCard => ({ type, rarity })

// A strong sprint deck: 3 Speed, 2 Power/Wit, 1 Friend, all SSR.
const strongSprint: SupportCard[] = [card("Speed"), card("Speed"), card("Speed"), card("Power"), card("Wit"), card("Friend")]

describe("scoreDeck", () => {
    it("scores a well-built SSR sprint deck highly", () => {
        const result = scoreDeck(strongSprint, "Sprint")
        expect(result.score).toBeGreaterThan(80)
        expect(result.warnings).toEqual([])
    })

    it("penalizes a deck with no Friend card and warns", () => {
        const noFriend: SupportCard[] = [card("Speed"), card("Speed"), card("Speed"), card("Power"), card("Wit"), card("Power")]
        const result = scoreDeck(noFriend, "Sprint")
        const friend = result.components.find((c) => c.id === "friend-slot")!
        expect(friend.value).toBeLessThan(1)
        expect(result.warnings.some((w) => w.includes("No Friend"))).toBe(true)
    })

    it("penalizes and warns on two Friend cards", () => {
        const twoFriends: SupportCard[] = [card("Speed"), card("Speed"), card("Speed"), card("Power"), card("Friend"), card("Friend")]
        const result = scoreDeck(twoFriends, "Sprint")
        expect(result.warnings.some((w) => w.includes("Friend cards"))).toBe(true)
    })

    it("warns when a low-rarity deck lacks SSR density", () => {
        const lowRarity: SupportCard[] = [card("Speed", "SR"), card("Speed", "SR"), card("Power", "R"), card("Wit", "R"), card("Guts", "R"), card("Friend", "SR")]
        const result = scoreDeck(lowRarity, "Sprint")
        expect(result.warnings.some((w) => w.includes("SSR"))).toBe(true)
        expect(result.score).toBeLessThan(scoreDeck(strongSprint, "Sprint").score)
    })

    it("rewards type fit: a sprint deck scores higher on Sprint than on Long", () => {
        const sprintFit = scoreDeck(strongSprint, "Sprint").components.find((c) => c.id === "type-fit")!.value
        const longFit = scoreDeck(strongSprint, "Long").components.find((c) => c.id === "type-fit")!.value
        expect(sprintFit).toBeGreaterThan(longFit)
    })

    it("warns about over-investing an off-profile stat type", () => {
        // 3 Stamina cards on a sprint build — dead weight.
        const staminaHeavy: SupportCard[] = [card("Speed"), card("Stamina"), card("Stamina"), card("Stamina"), card("Wit"), card("Friend")]
        const result = scoreDeck(staminaHeavy, "Sprint")
        expect(result.warnings.some((w) => w.includes("Stamina"))).toBe(true)
    })

    it("warns when the deck has no stat-training cards", () => {
        const noStats: SupportCard[] = [card("Friend"), card("Group"), card("Pal")]
        const result = scoreDeck(noStats, "Sprint")
        expect(result.warnings.some((w) => w.includes("stat-training"))).toBe(true)
        const fit = result.components.find((c) => c.id === "type-fit")!
        expect(fit.value).toBe(0)
    })

    it("keeps the score within 0..100", () => {
        expect(scoreDeck([], "Sprint").score).toBeGreaterThanOrEqual(0)
        expect(scoreDeck(strongSprint, "Sprint").score).toBeLessThanOrEqual(100)
    })
})
