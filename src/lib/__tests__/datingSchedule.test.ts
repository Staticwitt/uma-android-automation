import { DATING_SCHEDULE_CUSTOM, DATING_SCHEDULE_PRESETS, createDatingCardSchedule, formatDatingCardSummary } from "../datingSchedule"

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
