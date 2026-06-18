import type { Settings } from "../../context/BotStateContext"
import {
    applyBreedingGenerationToSettings,
    buildBreedingPlanGoalQueueResolved,
    parseParentFarmingBreedingPlan,
    serializeParentFarmingBreedingPlan,
} from "../parentFarmingBreedingPlan"
import { prepareSettingsForBotStart } from "../prepareSettingsForBotStart"

const grassWonderOguriPlan = () =>
    parseParentFarmingBreedingPlan(
        serializeParentFarmingBreedingPlan({
            generations: [
                {
                    label: "Gen 1 — Grass Wonder",
                    bundleKey: "grass-wonder-mile",
                    targetFactorSkills: [],
                    usePreviousAsLegacy: false,
                },
                {
                    label: "Gen 2 — Oguri",
                    bundleKey: "oguri-cap-g1",
                    targetFactorSkills: ["Gourmand", "Triple 7s", "Corner Recovery ○"],
                    usePreviousAsLegacy: true,
                },
            ],
        }),
    )

const baseSettings = (): Settings =>
    ({
        general: { scenario: "Trackblazer" },
        racing: {
            enableParentFarmingMode: true,
            enableParentFarmingBreedingPlan: true,
            parentFarmingBreedingPlan: serializeParentFarmingBreedingPlan(grassWonderOguriPlan()),
            parentFarmingMultiRunCount: 1,
            smartRaceSolverCharacterPreset: "Special Week",
            legacyParentPreferredPair: "[]",
            parentFarmingTargetFactorSkills: "[]",
        },
        training: {},
        skills: { plans: {} },
    }) as Settings

describe("breeding plan auto-advance", () => {
    it("applyBreedingGenerationToSettings switches trainee and target factors per generation", () => {
        const settings = baseSettings()
        const gen1 = applyBreedingGenerationToSettings(settings, 0)
        expect(gen1.racing.smartRaceSolverCharacterPreset).toBe("Grass Wonder")
        expect(JSON.parse(gen1.racing.parentFarmingTargetFactorSkills)).toEqual([])

        const gen2 = applyBreedingGenerationToSettings(settings, 1)
        expect(gen2.racing.smartRaceSolverCharacterPreset).toBe("Oguri Cap")
        expect(JSON.parse(gen2.racing.parentFarmingTargetFactorSkills)).toEqual([
            "Gourmand",
            "Triple 7s",
            "Corner Recovery ○",
        ])
    })

    it("buildBreedingPlanGoalQueueResolved wires previous trainee as legacy for gen 2", () => {
        const patches = buildBreedingPlanGoalQueueResolved(baseSettings(), grassWonderOguriPlan())
        expect(patches).toHaveLength(2)
        expect(patches[0].characterPreset).toBe("Grass Wonder")
        expect(patches[0].usePreviousAsLegacy).toBe(false)
        expect(patches[1].characterPreset).toBe("Oguri Cap")
        expect(patches[1].usePreviousAsLegacy).toBe(true)
        expect(JSON.parse(patches[1].legacyParentPreferredPair)).toEqual(["Grass Wonder", ""])
        expect(JSON.parse(patches[1].targetFactorSkills)).toEqual(["Gourmand", "Triple 7s", "Corner Recovery ○"])
    })

    it("prepareSettingsForBotStart enables multi-run queue from breeding plan length", () => {
        const prepared = prepareSettingsForBotStart(baseSettings())
        expect(prepared.racing.enableParentFarmingGoalQueue).toBe(true)
        expect(prepared.racing.enableParentFarmingMultiRun).toBe(true)
        expect(prepared.racing.parentFarmingMultiRunCount).toBe(2)
        expect(prepared.racing.smartRaceSolverCharacterPreset).toBe("Grass Wonder")
        const resolved = JSON.parse(prepared.racing.parentFarmingGoalQueueResolved)
        expect(resolved).toHaveLength(2)
        expect(resolved[1].usePreviousAsLegacy).toBe(true)
    })
})
