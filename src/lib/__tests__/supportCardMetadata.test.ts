import {
    buildSupportCardMetadata,
    getSupportCardMetadata,
    getSupportCardScrapedStats,
    mergeSupportCardStats,
    parseSupportOptionRewards,
} from "../supportCardMetadata"

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

    it("merges scraped manifest stats into metadata", () => {
        const scraped = getSupportCardScrapedStats("Kitasan Black")
        expect(scraped).toBeDefined()
        expect(scraped!.rarity).toBe("SSR")
        expect(scraped!.specialtyPriority).toBeGreaterThan(0)

        const meta = getSupportCardMetadata("Kitasan Black")
        expect(meta!.stats?.specialtyPriority).toBe(scraped!.specialtyPriority)
    })

    it("applies manual overrides on top of scraped stats", () => {
        const merged = mergeSupportCardStats(
            "Test Card",
            { rarity: "SSR", type: "Speed", hintFrequency: 40 },
            { type: "Guts", hintFrequency: 60 },
        )
        expect(merged?.hintFrequency).toBe(60)
        expect(merged?.type).toBe("Guts")
    })
})
