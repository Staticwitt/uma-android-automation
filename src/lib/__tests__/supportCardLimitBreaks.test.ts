import { parseSupportCardLimitBreaks, buildLimitBreakResolverFromSettings } from "../supportCardLimitBreaks"
import { MAX_LIMIT_BREAK } from "../supportDeckScoring"
import type { Settings } from "../../context/BotStateContext"

describe("supportCardLimitBreaks", () => {
    it("parseSupportCardLimitBreaks ignores invalid JSON", () => {
        expect(parseSupportCardLimitBreaks("not-json")).toEqual({})
    })

    it("parseSupportCardLimitBreaks ignores non-object JSON", () => {
        expect(parseSupportCardLimitBreaks("[1,2,3]")).toEqual({})
        expect(parseSupportCardLimitBreaks("42")).toEqual({})
    })

    it("parseSupportCardLimitBreaks keeps numeric entries and clamps out-of-range levels", () => {
        const parsed = parseSupportCardLimitBreaks(JSON.stringify({ "Kitasan Black": 2, "Maruzensky": 9, "Gold Ship": -3 }))
        expect(parsed).toEqual({ "Kitasan Black": 2, Maruzensky: MAX_LIMIT_BREAK, "Gold Ship": 0 })
    })

    it("parseSupportCardLimitBreaks drops non-numeric entries", () => {
        const parsed = parseSupportCardLimitBreaks(JSON.stringify({ "Kitasan Black": "MLB" }))
        expect(parsed).toEqual({})
    })

    it("buildLimitBreakResolverFromSettings resolves overrides and falls back to the global default", () => {
        const racing = {
            supportCardLimitBreaks: JSON.stringify({ "Kitasan Black": 1 }),
            supportCardLimitBreakDefault: 2,
        } as Settings["racing"]
        const resolver = buildLimitBreakResolverFromSettings(racing)
        expect(resolver("Kitasan Black")).toBe(1)
        expect(resolver("Maruzensky")).toBe(2)
    })

    it("buildLimitBreakResolverFromSettings defaults to MLB when no default is configured", () => {
        const racing = { supportCardLimitBreaks: "{}", supportCardLimitBreakDefault: undefined } as unknown as Settings["racing"]
        const resolver = buildLimitBreakResolverFromSettings(racing)
        expect(resolver("Maruzensky")).toBe(MAX_LIMIT_BREAK)
    })
})
