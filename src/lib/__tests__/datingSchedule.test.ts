import { DATING_SCHEDULE_CUSTOM, DATING_SCHEDULE_PRESETS, DATING_SCHEDULE_COMBOS, createDatingCardSchedule, formatDatingCardSummary } from "../datingSchedule"

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
})
