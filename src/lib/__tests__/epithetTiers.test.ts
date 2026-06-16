import {
    EPITHET_TIER_DEFAULT,
    EPITHET_TIER_FORCED,
    EPITHET_TIER_PRIMARY,
    buildEpithetTiersFromLists,
    buildEpithetTiersFromRacing,
    formatEpithetTierSummary,
} from "../epithetTiers"

describe("epithetTiers", () => {
    it("buildEpithetTiersFromLists assigns forced above primary", () => {
        const tiers = buildEpithetTiersFromLists(["Triple Crown"], ["G1 Hunter", "Triple Crown"])
        expect(tiers["Triple Crown"]).toBe(EPITHET_TIER_FORCED)
        expect(tiers["G1 Hunter"]).toBe(EPITHET_TIER_PRIMARY)
    })

    it("buildEpithetTiersFromRacing prefers explicit tier map", () => {
        const tiers = buildEpithetTiersFromRacing({
            smartRaceSolverEpithetTiers: JSON.stringify({ Custom: 3.0 }),
            smartRaceSolverForcedEpithets: JSON.stringify(["Triple Crown"]),
            smartRaceSolverTargetEpithets: "[]",
        })
        expect(tiers.Custom).toBe(3.0)
        expect(tiers["Triple Crown"]).toBeUndefined()
    })

    it("buildEpithetTiersFromRacing falls back to lists when map empty", () => {
        const tiers = buildEpithetTiersFromRacing({
            smartRaceSolverEpithetTiers: "",
            smartRaceSolverForcedEpithets: JSON.stringify(["Legendary"]),
            smartRaceSolverTargetEpithets: JSON.stringify(["Mile a Minute"]),
        })
        expect(tiers.Legendary).toBe(EPITHET_TIER_FORCED)
        expect(tiers["Mile a Minute"]).toBe(EPITHET_TIER_PRIMARY)
    })

    it("formatEpithetTierSummary describes must and primary tiers", () => {
        const summary = formatEpithetTierSummary({
            Legendary: EPITHET_TIER_FORCED,
            "Mile a Minute": EPITHET_TIER_PRIMARY,
            Other: EPITHET_TIER_DEFAULT,
        })
        expect(summary).toContain("Must: Legendary")
        expect(summary).toContain("Primary: Mile a Minute")
    })
})
