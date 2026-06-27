import type { Settings } from "../context/BotStateContext"

/** A named, user-saved race strategy bundle (junior/original strategy plus optional per-distance overrides). */
export interface RaceStrategyPreset {
    key: string
    label: string
    juniorYearRaceStrategy: string
    originalRaceStrategy: string
    enablePerDistanceStrategy: boolean
    juniorYearPerDistanceStrategies: Record<string, string>
    originalPerDistanceStrategies: Record<string, string>
}

type RaceStrategyFields = Pick<
    RaceStrategyPreset,
    "juniorYearRaceStrategy" | "originalRaceStrategy" | "enablePerDistanceStrategy" | "juniorYearPerDistanceStrategies" | "originalPerDistanceStrategies"
>

const isRaceStrategyPreset = (value: unknown): value is RaceStrategyPreset => {
    if (!value || typeof value !== "object") return false
    const candidate = value as Record<string, unknown>
    return typeof candidate.key === "string" && candidate.key.length > 0 && typeof candidate.label === "string"
}

/** Parse the `racing.raceStrategyPresets` JSON array, dropping any malformed entries. */
export const parseRaceStrategyPresets = (json: string | undefined): RaceStrategyPreset[] => {
    try {
        const parsed = JSON.parse(json || "[]")
        return Array.isArray(parsed) ? parsed.filter(isRaceStrategyPreset) : []
    } catch {
        return []
    }
}

export const serializeRaceStrategyPresets = (presets: RaceStrategyPreset[]): string => JSON.stringify(presets)

const slugify = (label: string): string => label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "preset"

/** Build a unique key for a new preset, disambiguating against existing keys with a numeric suffix. */
const uniqueKey = (label: string, existing: RaceStrategyPreset[]): string => {
    const base = slugify(label)
    const taken = new Set(existing.map((preset) => preset.key))
    if (!taken.has(base)) return base
    let suffix = 2
    while (taken.has(`${base}-${suffix}`)) suffix++
    return `${base}-${suffix}`
}

/** Capture the racing settings' current strategy fields as a new named preset. */
export const captureRaceStrategyPreset = (racing: Settings["racing"], label: string, existing: RaceStrategyPreset[]): RaceStrategyPreset => ({
    key: uniqueKey(label, existing),
    label: label.trim(),
    juniorYearRaceStrategy: racing.juniorYearRaceStrategy,
    originalRaceStrategy: racing.originalRaceStrategy,
    enablePerDistanceStrategy: racing.enablePerDistanceStrategy,
    juniorYearPerDistanceStrategies: { ...racing.juniorYearPerDistanceStrategies },
    originalPerDistanceStrategies: { ...racing.originalPerDistanceStrategies },
})

/** Save (append) a new preset captured from the current racing settings, returning the updated JSON array string. */
export const saveRaceStrategyPreset = (presetsJson: string | undefined, racing: Settings["racing"], label: string): string => {
    const existing = parseRaceStrategyPresets(presetsJson)
    const preset = captureRaceStrategyPreset(racing, label, existing)
    return serializeRaceStrategyPresets([...existing, preset])
}

/** Remove a preset by key, returning the updated JSON array string. */
export const deleteRaceStrategyPreset = (presetsJson: string | undefined, key: string): string => {
    const existing = parseRaceStrategyPresets(presetsJson)
    return serializeRaceStrategyPresets(existing.filter((preset) => preset.key !== key))
}

/** Build a racing settings patch that applies a saved preset's strategy fields. */
export const applyRaceStrategyPreset = (preset: RaceStrategyPreset): RaceStrategyFields => ({
    juniorYearRaceStrategy: preset.juniorYearRaceStrategy,
    originalRaceStrategy: preset.originalRaceStrategy,
    enablePerDistanceStrategy: preset.enablePerDistanceStrategy,
    juniorYearPerDistanceStrategies: { ...preset.juniorYearPerDistanceStrategies },
    originalPerDistanceStrategies: { ...preset.originalPerDistanceStrategies },
})
