import type { Settings } from "../../context/BotStateContext"
import { applyParentFarmingFullUnattended } from "../parentFarmingFullUnattended"

describe("parentFarmingFullUnattended", () => {
    it("enables carat retry and career-complete skill plan when flag is on", () => {
        const settings = {
            racing: { enableParentFarmingFullUnattended: true },
            skills: { plans: { careerComplete: { enabled: false } } },
        } as Settings

        const result = applyParentFarmingFullUnattended(settings)
        expect(result.racing.enableCaratRaceRetry).toBe(true)
        expect(result.racing.maxCaratRaceRetriesPerRun).toBe(2)
        expect(result.skills.plans.careerComplete.enabled).toBe(true)
    })
})
