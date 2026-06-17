import type { Settings } from "../../context/BotStateContext"
import { assessForcedEpithetFeasibility, autoDowngradeInfeasibleForcedEpithets } from "../parentFarmingFeasibility"

const baseSettings = (): Settings =>
    ({
        general: { scenario: "Trackblazer" },
        racing: {
            enableParentFarmingMode: true,
            enableParentFarmingAutoDowngradeForcedEpithets: true,
            smartRaceSolverCharacterPreset: "Special Week",
            smartRaceSolverForcedEpithets: JSON.stringify(["Triple Crown"]),
            smartRaceSolverTargetEpithets: "[]",
            smartRaceSolverEpithetTiers: "{}",
        },
    }) as Settings

describe("parentFarmingFeasibility", () => {
    it("flags forced epithets missing matchers", () => {
        const issues = assessForcedEpithetFeasibility(["Not A Real Epithet"], "Trackblazer", "Special Week")
        expect(issues.some((issue) => issue.severity === "error")).toBe(true)
    })

    it("auto-downgrades infeasible forced epithets to targets", () => {
        const settings = baseSettings()
        settings.racing.smartRaceSolverForcedEpithets = JSON.stringify(["Not A Real Epithet"])
        const result = autoDowngradeInfeasibleForcedEpithets(settings)
        expect(JSON.parse(result.racing.smartRaceSolverForcedEpithets)).toEqual([])
        expect(JSON.parse(result.racing.smartRaceSolverTargetEpithets)).toContain("Not A Real Epithet")
    })
})
