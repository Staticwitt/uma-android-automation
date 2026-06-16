import { buildSupportCardMetadata, getSupportCardMetadata, parseSupportOptionRewards } from "../supportCardMetadata"

describe("supportCardMetadata", () => {
    it("parseSupportOptionRewards extracts stats, hints, and skill points", () => {
        const parsed = parseSupportOptionRewards(
            "Speed +15\nSkill points +30\nHydrate hint +1\nAgnes Digital bond +5",
        )
        expect(parsed.totals.speed).toBe(15)
        expect(parsed.totals.skillPoints).toBe(30)
        expect(parsed.totals.hintPoints).toBe(1)
        expect([...parsed.hints.keys()]).toContain("Hydrate")
    })

    it("buildSupportCardMetadata aggregates best option per event", () => {
        const meta = buildSupportCardMetadata("Agnes Tachyon", {
            "Report: N/A (On Break)": ["Wit +10\nSkill points +15\nSubdued Front Runners hint +1"],
            "Sleep and Efficiency": ["Power +5\nWit +5", "Wit +10"],
        })
        expect(meta.type).toBe("Wit")
        expect(meta.totals.wit).toBeGreaterThanOrEqual(15)
        expect(meta.totals.skillPoints).toBe(15)
        expect(meta.hintSkills.length).toBeGreaterThan(0)
    })

    it("getSupportCardMetadata returns indexed cards from supports.json", () => {
        const meta = getSupportCardMetadata("Kitasan Black")
        expect(meta).toBeDefined()
        expect(meta!.name).toBe("Kitasan Black")
        expect(meta!.eventCount).toBeGreaterThan(0)
    })
})
