import type { Settings } from "../../context/BotStateContext"
import {
    buildParentFarmingGoalQueueResolved,
    formatGoalQueueSummary,
    parseParentFarmingGoalQueue,
    serializeParentFarmingGoalQueueResolved,
} from "../parentFarmingGoalQueue"

describe("parentFarmingGoalQueue", () => {
    const base = {
        general: { scenario: "Trackblazer" },
        racing: { enableParentFarmingMode: true, smartRaceSolverCharacterPreset: "Special Week", smartRaceSolverWeights: "{}" },
        training: {},
        skills: { plans: {} },
    } as unknown as Settings

    it("parses queue items", () => {
        const items = parseParentFarmingGoalQueue('[{"type":"preset","key":"g1-fans","label":"G1"}]')
        expect(items).toEqual([{ type: "preset", key: "g1-fans", label: "G1" }])
    })

    it("resolves queue patches for Kotlin", () => {
        const items = parseParentFarmingGoalQueue('[{"type":"preset","key":"g1-fans"}]')
        const resolved = buildParentFarmingGoalQueueResolved(base, items)
        expect(resolved).toHaveLength(1)
        expect(resolved[0].goalPresetKey).toBe("g1-fans")
        expect(resolved[0].targetEpithets).toContain("G1 Hunter")
        const roundTrip = JSON.parse(serializeParentFarmingGoalQueueResolved(resolved))
        expect(roundTrip[0].label).toBeTruthy()
    })

    it("formats queue summary", () => {
        expect(
            formatGoalQueueSummary([
                { type: "preset", key: "g1-fans", label: "G1" },
                { type: "bundle", key: "oguri-cap-g1", label: "Oguri" },
            ]),
        ).toBe("G1 → Oguri")
    })
})
