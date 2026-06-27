import type { Settings } from "../../context/BotStateContext"
import { applyRaceStrategyPreset, deleteRaceStrategyPreset, parseRaceStrategyPresets, saveRaceStrategyPreset } from "../raceStrategyPresets"

describe("raceStrategyPresets", () => {
    const racing = {
        juniorYearRaceStrategy: "Front",
        originalRaceStrategy: "Late",
        enablePerDistanceStrategy: true,
        juniorYearPerDistanceStrategies: { Short: "Front", Mile: "Default", Medium: "Default", Long: "Default" },
        originalPerDistanceStrategies: { Short: "Default", Mile: "Default", Medium: "Late", Long: "Default" },
    } as unknown as Settings["racing"]

    it("parses an empty preset list", () => {
        expect(parseRaceStrategyPresets(undefined)).toEqual([])
        expect(parseRaceStrategyPresets("[]")).toEqual([])
    })

    it("drops malformed entries", () => {
        expect(parseRaceStrategyPresets('[{"key":"a"},{"foo":"bar"},{"key":"b","label":"B"}]')).toEqual([{ key: "b", label: "B" }])
    })

    it("saves a new preset captured from current racing settings", () => {
        const json = saveRaceStrategyPreset("[]", racing, "Mile Sprint")
        const presets = parseRaceStrategyPresets(json)
        expect(presets).toHaveLength(1)
        expect(presets[0].key).toBe("mile-sprint")
        expect(presets[0].label).toBe("Mile Sprint")
        expect(presets[0].juniorYearRaceStrategy).toBe("Front")
        expect(presets[0].originalPerDistanceStrategies.Medium).toBe("Late")
    })

    it("disambiguates duplicate preset names with a numeric suffix", () => {
        const first = saveRaceStrategyPreset("[]", racing, "Mile Sprint")
        const second = saveRaceStrategyPreset(first, racing, "Mile Sprint")
        const presets = parseRaceStrategyPresets(second)
        expect(presets.map((preset) => preset.key)).toEqual(["mile-sprint", "mile-sprint-2"])
    })

    it("deletes a preset by key", () => {
        const json = saveRaceStrategyPreset("[]", racing, "Mile Sprint")
        expect(parseRaceStrategyPresets(deleteRaceStrategyPreset(json, "mile-sprint"))).toEqual([])
    })

    it("builds a racing patch that applies a saved preset", () => {
        const json = saveRaceStrategyPreset("[]", racing, "Mile Sprint")
        const preset = parseRaceStrategyPresets(json)[0]
        const patch = applyRaceStrategyPreset(preset)
        expect(patch).toEqual({
            juniorYearRaceStrategy: "Front",
            originalRaceStrategy: "Late",
            enablePerDistanceStrategy: true,
            juniorYearPerDistanceStrategies: racing.juniorYearPerDistanceStrategies,
            originalPerDistanceStrategies: racing.originalPerDistanceStrategies,
        })
    })
})
