import type { Settings } from "../context/BotStateContext"
import { clampLimitBreak, MAX_LIMIT_BREAK, type LimitBreakResolver } from "./supportDeckScoring"

/** User overrides: support card name → limit break level (0-4). */
export type SupportCardLimitBreaks = Record<string, number>

export const parseSupportCardLimitBreaks = (json: string | undefined): SupportCardLimitBreaks => {
    try {
        const parsed = JSON.parse(json || "{}")
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
        const result: SupportCardLimitBreaks = {}
        for (const [name, value] of Object.entries(parsed)) {
            if (typeof value === "number" && Number.isFinite(value)) {
                result[name] = clampLimitBreak(value)
            }
        }
        return result
    } catch {
        return {}
    }
}

/** Builds a per-card limit break resolver from racing settings, falling back to the global default. */
export const buildLimitBreakResolverFromSettings = (racing: Settings["racing"]): LimitBreakResolver => {
    const overrides = parseSupportCardLimitBreaks(racing.supportCardLimitBreaks)
    const fallback = clampLimitBreak(racing.supportCardLimitBreakDefault ?? MAX_LIMIT_BREAK)
    return (name: string) => clampLimitBreak(overrides[name] ?? fallback)
}
