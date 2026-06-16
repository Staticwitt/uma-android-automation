/** Tier multiplier for forced must-complete epithet routes. */
export const EPITHET_TIER_FORCED = 2.0

/** Tier multiplier for primary target epithets (non-forced). */
export const EPITHET_TIER_PRIMARY = 1.5

/** Default tier when no explicit entry exists. */
export const EPITHET_TIER_DEFAULT = 1.0

export type EpithetTierMap = Record<string, number>

const parseStringList = (json: string | undefined): string[] => {
    try {
        const parsed = JSON.parse(json || "[]")
        return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string" && value.length > 0) : []
    } catch {
        return []
    }
}

/** Builds per-epithet tier multipliers: forced (2×) > target (1.5×). */
export const buildEpithetTiersFromLists = (forced: string[], targets: string[]): EpithetTierMap => {
    const tiers: EpithetTierMap = {}
    for (const name of forced) tiers[name] = EPITHET_TIER_FORCED
    for (const name of targets) {
        if (!(name in tiers)) tiers[name] = EPITHET_TIER_PRIMARY
    }
    return tiers
}

export const buildEpithetTiersFromRacing = (racing: {
    smartRaceSolverForcedEpithets?: string
    smartRaceSolverTargetEpithets?: string
    smartRaceSolverEpithetTiers?: string
}): EpithetTierMap => {
    if (racing.smartRaceSolverEpithetTiers) {
        try {
            const parsed = JSON.parse(racing.smartRaceSolverEpithetTiers)
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                const tiers: EpithetTierMap = {}
                for (const [key, value] of Object.entries(parsed)) {
                    if (typeof value === "number" && value > 0) tiers[key] = value
                }
                if (Object.keys(tiers).length > 0) return tiers
            }
        } catch {
            // Fall through to auto-build.
        }
    }
    return buildEpithetTiersFromLists(
        parseStringList(racing.smartRaceSolverForcedEpithets),
        parseStringList(racing.smartRaceSolverTargetEpithets),
    )
}

export const formatEpithetTierSummary = (tiers: EpithetTierMap): string => {
    const forced = Object.entries(tiers).filter(([, value]) => value >= EPITHET_TIER_FORCED).map(([name]) => name)
    const primary = Object.entries(tiers)
        .filter(([, value]) => value >= EPITHET_TIER_PRIMARY && value < EPITHET_TIER_FORCED)
        .map(([name]) => name)
    const parts: string[] = []
    if (forced.length > 0) parts.push(`Must: ${forced.slice(0, 3).join(" · ")}${forced.length > 3 ? " …" : ""}`)
    if (primary.length > 0) parts.push(`Primary: ${primary.slice(0, 3).join(" · ")}${primary.length > 3 ? " …" : ""}`)
    return parts.join(" · ") || "Flat target weighting"
}
