import { DATING_SCHEDULE_CUSTOM, DATING_SCHEDULE_PRESETS, DATING_SCHEDULE_COMBOS, createDatingCardSchedule, formatDatingCardSummary, parseDatingCardsImport } from "../datingSchedule"

describe("createDatingCardSchedule", () => {
    it("seeds turns/purePassionTurn/totalOutings from the given preset", () => {
        const card = createDatingCardSchedule("throneSenior", "Kitasan Black")
        expect(card.cardName).toBe("Kitasan Black")
        expect(card.preset).toBe("throneSenior")
        expect(card.recreationTurns).toEqual(DATING_SCHEDULE_PRESETS.throneSenior.recreationTurns)
        expect(card.purePassionTurn).toBe(DATING_SCHEDULE_PRESETS.throneSenior.purePassionTurn)
        expect(card.totalOutings).toBe(DATING_SCHEDULE_PRESETS.throneSenior.totalOutings)
    })

    it("defaults to a blank card name", () => {
        const card = createDatingCardSchedule("siriusSenior")
        expect(card.cardName).toBe("")
    })

    it("does not share the preset's array reference (mutating one card doesn't affect the preset)", () => {
        const card = createDatingCardSchedule("siriusSenior")
        card.recreationTurns.push(999)
        expect(DATING_SCHEDULE_PRESETS.siriusSenior.recreationTurns).not.toContain(999)
    })

    it("returns blank custom defaults for an unknown preset key", () => {
        const card = createDatingCardSchedule(DATING_SCHEDULE_CUSTOM)
        expect(card.recreationTurns).toEqual([])
        expect(card.purePassionTurn).toBe(-1)
    })
})

describe("formatDatingCardSummary", () => {
    it("labels a blank card name as 'any card'", () => {
        const card = createDatingCardSchedule("siriusSenior")
        expect(formatDatingCardSummary(card)).toContain("any card")
    })

    it("includes the card name when set", () => {
        const card = createDatingCardSchedule("throneSenior", "Kitasan Black")
        expect(formatDatingCardSummary(card)).toContain("Kitasan Black")
    })

    it("shows 'Custom' for a hand-edited card", () => {
        const card = createDatingCardSchedule(DATING_SCHEDULE_CUSTOM, "Special Week")
        expect(formatDatingCardSummary(card)).toContain("Custom")
    })

    it("shows 'none' for an unset Pure Passion turn", () => {
        const card = createDatingCardSchedule("siriusSenior")
        expect(formatDatingCardSummary(card)).toContain("Pure Passion: none")
    })
})

describe("DATING_SCHEDULE_COMBOS", () => {
    it("siriusAndThrone builds two cards with no colliding recreation turns", () => {
        const cards = DATING_SCHEDULE_COMBOS.siriusAndThrone.build()
        expect(cards).toHaveLength(2)
        const [sirius, throne] = cards
        const overlap = sirius.recreationTurns.filter((turn) => throne.recreationTurns.includes(turn))
        expect(overlap).toEqual([])
    })

    it("siriusAndThrone gives both cards a blank name for the user to fill in", () => {
        const cards = DATING_SCHEDULE_COMBOS.siriusAndThrone.build()
        expect(cards.every((card) => card.cardName === "")).toBe(true)
    })

    it("siriusAndThrone keeps Sirius unmodified and marks the shifted Throne card as Custom", () => {
        const [sirius, throne] = DATING_SCHEDULE_COMBOS.siriusAndThrone.build()
        expect(sirius.preset).toBe("siriusSenior")
        expect(sirius.recreationTurns).toEqual(DATING_SCHEDULE_PRESETS.siriusSenior.recreationTurns)
        expect(throne.preset).toBe(DATING_SCHEDULE_CUSTOM)
        expect(throne.purePassionTurn).toBe(DATING_SCHEDULE_PRESETS.throneSenior.purePassionTurn)
        expect(throne.totalOutings).toBe(DATING_SCHEDULE_PRESETS.throneSenior.totalOutings)
    })

    it("build() returns fresh arrays each call so mutating one combo doesn't affect another", () => {
        const first = DATING_SCHEDULE_COMBOS.siriusAndThrone.build()
        first[0].recreationTurns.push(999)
        const second = DATING_SCHEDULE_COMBOS.siriusAndThrone.build()
        expect(second[0].recreationTurns).not.toContain(999)
    })

    it("siriusThroneFullRoster builds 11 named cards with no colliding pinned turns", () => {
        const cards = DATING_SCHEDULE_COMBOS.siriusThroneFullRoster.build()
        expect(cards).toHaveLength(11)
        expect(cards.every((card) => card.cardName.length > 0)).toBe(true)

        const pinnedByCard = cards.map((card) => (card.purePassionTurn > 0 ? [...card.recreationTurns, card.purePassionTurn] : card.recreationTurns))
        const allPinned = pinnedByCard.flat()
        expect(new Set(allPinned).size).toBe(allPinned.length)

        const blocked = allPinned.filter((turn) => turn <= 13 || (turn >= 37 && turn <= 40) || (turn >= 61 && turn <= 64))
        expect(blocked).toEqual([])
    })

    it("siriusThroneFullRoster gives Team Sirius and The Throne's Assemblage a held Pure Passion outing", () => {
        const cards = DATING_SCHEDULE_COMBOS.siriusThroneFullRoster.build()
        const teamSirius = cards.find((card) => card.cardName === "Team Sirius")
        const assemblage = cards.find((card) => card.cardName === "The Throne's Assemblage")
        expect(teamSirius?.purePassionTurn).toBe(58)
        expect(assemblage?.purePassionTurn).toBe(59)
        expect(assemblage?.recreationTurns).toEqual([51])
    })
})

describe("parseDatingCardsImport", () => {
    it("parses a well-formed card list", () => {
        const cards = parseDatingCardsImport([
            { cardName: "Kitasan Black", preset: "siriusSenior", recreationTurns: [29, 35, 43], purePassionTurn: -1, totalOutings: 7 },
            { cardName: "Special Week", preset: "custom", recreationTurns: [34, 42], purePassionTurn: 60, totalOutings: 4 },
        ])
        expect(cards).toEqual([
            { cardName: "Kitasan Black", preset: "siriusSenior", recreationTurns: [29, 35, 43], purePassionTurn: -1, totalOutings: 7 },
            { cardName: "Special Week", preset: "custom", recreationTurns: [34, 42], purePassionTurn: 60, totalOutings: 4 },
        ])
    })

    it("returns an empty array for non-array input", () => {
        expect(parseDatingCardsImport({ cardName: "not an array" })).toEqual([])
        expect(parseDatingCardsImport(null)).toEqual([])
        expect(parseDatingCardsImport("garbage")).toEqual([])
    })

    it("drops non-object entries but keeps valid ones", () => {
        const cards = parseDatingCardsImport([null, "garbage", 42, { cardName: "Kitasan Black" }])
        expect(cards).toHaveLength(1)
        expect(cards[0].cardName).toBe("Kitasan Black")
    })

    it("defaults missing/invalid fields safely", () => {
        const [card] = parseDatingCardsImport([{}])
        expect(card).toEqual({ cardName: "", preset: DATING_SCHEDULE_CUSTOM, recreationTurns: [], purePassionTurn: -1, totalOutings: 1 })
    })

    it("filters out-of-range and non-integer recreation turns, dedupes, and sorts", () => {
        const [card] = parseDatingCardsImport([{ recreationTurns: [50, 0, 73, 10.5, 10, 10, "40"] }])
        expect(card.recreationTurns).toEqual([10, 50])
    })

    it("derives totalOutings from recreationTurns.length when missing or invalid", () => {
        const [card] = parseDatingCardsImport([{ recreationTurns: [1, 2, 3], totalOutings: -5 }])
        expect(card.totalOutings).toBe(4)
    })

    it("ignores an invalid purePassionTurn type and falls back to -1", () => {
        const [card] = parseDatingCardsImport([{ purePassionTurn: "60" }])
        expect(card.purePassionTurn).toBe(-1)
    })
})
