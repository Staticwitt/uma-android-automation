import { recommendDeck, cardStrength } from "../deckRecommender"
import type { OwnedSupportCard, CharacterProfile } from "../deckRecommender"

const card = (over: Partial<OwnedSupportCard> & Pick<OwnedSupportCard, "name" | "type">): OwnedSupportCard => ({
    rarity: "SSR",
    limitBreak: 4,
    level: 50,
    ...over,
})

/** An inventory shaped like the player's real collection: deep Speed/Power/Wit/Stamina at MLB, but no strong friend card. */
const richInventory = (): OwnedSupportCard[] => [
    card({ name: "Speed A", type: "speed", rarity: "SSR", limitBreak: 4, level: 50 }),
    card({ name: "Speed B", type: "speed", rarity: "SSR", limitBreak: 3, level: 45 }),
    card({ name: "Speed C", type: "speed", rarity: "SR", limitBreak: 4, level: 45 }),
    card({ name: "Power A", type: "power", rarity: "SSR", limitBreak: 4, level: 50 }),
    card({ name: "Power B", type: "power", rarity: "SSR", limitBreak: 4, level: 50 }),
    card({ name: "Power C", type: "power", rarity: "SSR", limitBreak: 4, level: 50 }),
    card({ name: "Wit A", type: "wit", rarity: "SSR", limitBreak: 4, level: 50, tags: ["hint"] }),
    card({ name: "Stamina A", type: "stamina", rarity: "SSR", limitBreak: 4, level: 50, tags: ["recovery"] }),
    card({ name: "Stamina B", type: "stamina", rarity: "SSR", limitBreak: 4, level: 50 }),
    card({ name: "Friend weak", type: "friend", rarity: "SR", limitBreak: 1, level: 30 }),
]

describe("cardStrength", () => {
    test("an SSR MLB Lv50 outranks a fully MLB SR", () => {
        expect(cardStrength(card({ name: "x", type: "speed", rarity: "SSR", limitBreak: 4, level: 50 }))).toBeGreaterThan(
            cardStrength(card({ name: "y", type: "speed", rarity: "SR", limitBreak: 4, level: 45 })),
        )
    })

    test("more limit breaks beat a higher level within the same rarity", () => {
        const mlbLowLevel = card({ name: "a", type: "power", rarity: "SSR", limitBreak: 4, level: 30 })
        const lb0MaxLevel = card({ name: "b", type: "power", rarity: "SSR", limitBreak: 0, level: 50 })
        expect(cardStrength(mlbLowLevel)).toBeGreaterThan(cardStrength(lb0MaxLevel))
    })
})

describe("recommendDeck", () => {
    test("Sprint build -> 3 Speed / 2 Power own, Friend rental", () => {
        const profile: CharacterProfile = { name: "Nishino Flower", distance: "Sprint" }
        const rec = recommendDeck(richInventory(), profile)
        const ownTypes = rec.own.map((c) => c.type).sort()
        expect(ownTypes).toEqual(["power", "power", "speed", "speed", "speed"])
        expect(rec.rental.type).toBe("friend")
        expect(rec.gaps).toEqual([])
    })

    test("Medium pace-chaser needing recovery -> 2 Speed / 1 Stamina / 1 Power / 1 Wit own, Friend rental", () => {
        const profile: CharacterProfile = { name: "Christmas Oguri Cap", distance: "Medium", needsRecovery: true }
        const rec = recommendDeck(richInventory(), profile)
        const ownTypes = rec.own.map((c) => c.type).sort()
        expect(ownTypes).toEqual(["power", "speed", "speed", "stamina", "wit"])
        expect(rec.rental.type).toBe("friend")
        // The chosen Stamina card should be the strongest one, and a recovery tag is available for her unique.
        expect(rec.own.find((c) => c.type === "stamina")?.name).toBe("Stamina A")
    })

    test("own cards are the strongest of each required type when there is a surplus", () => {
        // Add a weak 4th Speed card; the Sprint build needs only 3, so the weakest must be dropped.
        const withSurplus = [...richInventory(), card({ name: "Speed D weak", type: "speed", rarity: "R", limitBreak: 0, level: 1 })]
        const rec = recommendDeck(withSurplus, { name: "Nishino Flower", distance: "Sprint" })
        const speeds = rec.own.filter((c) => c.type === "speed").map((c) => c.name)
        expect(speeds).toEqual(expect.arrayContaining(["Speed A", "Speed B", "Speed C"]))
        expect(speeds).not.toContain("Speed D weak")
        expect(speeds).toHaveLength(3)
    })

    test("a hard stat gap is rented instead of a friend", () => {
        // Medium build with recovery need but NO stamina card owned -> rent Stamina, not Friend.
        const noStamina = richInventory().filter((c) => c.type !== "stamina")
        const rec = recommendDeck(noStamina, { name: "Christmas Oguri Cap", distance: "Medium", needsRecovery: true })
        expect(rec.rental.type).toBe("stamina")
        expect(rec.rental.reason).toMatch(/Stamina/)
    })

    test("recovery need forces a Stamina slot into a distance that lacks one", () => {
        const rec = recommendDeck(richInventory(), { name: "Recovery Sprinter", distance: "Sprint", needsRecovery: true })
        expect(rec.distribution.stamina).toBe(1)
        expect(rec.notes.some((n) => /recovery/i.test(n))).toBe(true)
    })

    test("a strong owned friend card is kept, not rented -> rental falls to the weakest stat slot", () => {
        const withStrongFriend = [...richInventory(), card({ name: "Tazuna", type: "friend", rarity: "SSR", limitBreak: 4, level: 50 })]
        const rec = recommendDeck(withStrongFriend, { name: "Nishino Flower", distance: "Sprint" })
        expect(rec.own.some((c) => c.name === "Tazuna")).toBe(true)
        expect(rec.rental.type).not.toBe("friend")
    })

    test("distribution always totals six slots", () => {
        for (const distance of ["Sprint", "Mile", "Medium", "Long"] as const) {
            const rec = recommendDeck(richInventory(), { name: "x", distance })
            const total = Object.values(rec.distribution).reduce((a, b) => a + (b ?? 0), 0)
            expect(total).toBe(6)
        }
    })
})
