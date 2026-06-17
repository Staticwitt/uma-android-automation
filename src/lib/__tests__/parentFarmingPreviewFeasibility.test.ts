import type { Settings } from "../../context/BotStateContext"
import {
    assessParentFarmingPreviewFeasibility,
    formatPreviewFeasibilitySummary,
} from "../parentFarmingPreviewFeasibility"

jest.mock("../solver/preview", () => ({
    previewSchedule: jest.fn(async () => ({
        decisions: {
            "1": { type: "Race", raceKey: "test-race" },
            "2": { type: "Train" },
        },
        projectedEpithets: ["Globe-Trotter"],
        error: null,
    })),
}))

const createSettings = (overrides: Partial<Settings["racing"]> = {}): Settings =>
    ({
        general: { scenario: "Trackblazer" },
        racing: {
            enableParentFarmingMode: true,
            enableSmartRaceSolver: true,
            smartRaceSolverCharacterPreset: "Special Week",
            smartRaceSolverAptitudes: "{}",
            smartRaceSolverTargetEpithets: "[]",
            smartRaceSolverForcedEpithets: "[]",
            smartRaceSolverManualLocks: "{}",
            smartRaceSolverWeights: "{}",
            ...overrides,
        },
    }) as Settings

describe("parentFarmingPreviewFeasibility", () => {
    it("returns static issues without preview when solver is disabled", async () => {
        const result = await assessParentFarmingPreviewFeasibility(
            createSettings({ enableSmartRaceSolver: false }),
        )
        expect(result.preview).toBeNull()
        expect(result.raceCount).toBe(0)
    })

    it("runs solver preview and counts planned races", async () => {
        const result = await assessParentFarmingPreviewFeasibility(createSettings())
        expect(result.preview).not.toBeNull()
        expect(result.raceCount).toBe(1)
        expect(result.projectedEpithetCount).toBe(1)
    })

    it("warns when forced epithets are missing from the preview schedule", async () => {
        const result = await assessParentFarmingPreviewFeasibility(
            createSettings({ smartRaceSolverForcedEpithets: JSON.stringify(["Missing Epithet"]) }),
        )
        expect(result.issues.some((issue) => issue.message.includes("Missing Epithet"))).toBe(true)
    })

    it("formats a concise feasibility summary", async () => {
        const result = await assessParentFarmingPreviewFeasibility(createSettings())
        const summary = formatPreviewFeasibilitySummary(result)
        expect(summary).toContain("1 planned races")
        expect(summary).toContain("1 projected epithets")
    })
})
