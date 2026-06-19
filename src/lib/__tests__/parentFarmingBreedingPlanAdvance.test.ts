import type { Settings } from "../../context/BotStateContext"
import {
    applyBreedingGenerationToSettings,
    buildBreedingPlanGoalQueueResolved,
    builtInBreedingPlans,
    parseParentFarmingBreedingPlan,
    serializeParentFarmingBreedingPlan,
    validateBreedingPlan,
} from "../parentFarmingBreedingPlan"
import { prepareSettingsForBotStart } from "../prepareSettingsForBotStart"

const grasslandWonderOguriPlan = () =>
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
            parentFarmingBreedingPlan: serializeParentFarmingBreedingPlan(grasslandWonderOguriPlan()),
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
        const patches = buildBreedingPlanGoalQueueResolved(baseSettings(), grasslandWonderOguriPlan())
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

    describe("validateBreedingPlan", () => {
        it("returns no warnings for a plan with valid bundle/preset keys", () => {
            expect(validateBreedingPlan(grasslandWonderOguriPlan())).toEqual([])
        })

        it("flags a generation with an unknown bundle key", () => {
            const plan = parseParentFarmingBreedingPlan(
                serializeParentFarmingBreedingPlan({
                    generations: [
                        { label: "Gen 1", bundleKey: "not-a-real-bundle", targetFactorSkills: [], usePreviousAsLegacy: false },
                    ],
                }),
            )
            const warnings = validateBreedingPlan(plan)
            expect(warnings).toHaveLength(1)
            expect(warnings[0].generationIndex).toBe(0)
            expect(warnings[0].message).toMatch(/unknown character bundle/i)
        })

        it("flags a generation with an unknown goal preset key", () => {
            const plan = parseParentFarmingBreedingPlan(
                serializeParentFarmingBreedingPlan({
                    generations: [
                        { label: "Gen 1", goalPresetKey: "not-a-real-preset", targetFactorSkills: [], usePreviousAsLegacy: false },
                    ],
                }),
            )
            const warnings = validateBreedingPlan(plan)
            expect(warnings).toHaveLength(1)
            expect(warnings[0].message).toMatch(/unknown goal preset/i)
        })

        it("built-in plans never produce warnings (guards against stale bundle/preset keys)", () => {
            for (const builtIn of builtInBreedingPlans()) {
                expect(validateBreedingPlan(builtIn.plan)).toEqual([])
            }
        })

        it("built-in plan keys are unique", () => {
            const keys = builtInBreedingPlans().map((builtIn) => builtIn.key)
            expect(new Set(keys).size).toBe(keys.length)
        })

        it("flags a generation with neither key set", () => {
            const plan = parseParentFarmingBreedingPlan(
                serializeParentFarmingBreedingPlan({
                    generations: [{ label: "Gen 1", targetFactorSkills: [], usePreviousAsLegacy: false }],
                }),
            )
            const warnings = validateBreedingPlan(plan)
            expect(warnings).toHaveLength(1)
            expect(warnings[0].message).toMatch(/no goal preset or character bundle/i)
        })
    })
})
