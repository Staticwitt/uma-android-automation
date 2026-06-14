import type { Settings } from "../../context/BotStateContext"
import {
    applyParentFarmingCharacterBundle,
    aptitudesFromCharacterPreset,
    buildAllowedEpithetNamesForParentBundle,
    findCharacterPresetEntry,
    findParentFarmingCharacterBundle,
} from "../parentFarmingCharacterBundles"

const createSettings = (): Settings =>
    ({
        general: { scenario: "Trackblazer", enableStopBeforeFinals: true },
        racing: {
            enableParentFarmingMode: false,
            enableSmartRaceSolver: false,
            enableForceRacing: true,
            enableUserInGameRaceAgenda: true,
            smartRaceSolverCharacterPreset: "Special Week",
            smartRaceSolverAptitudes: "{}",
            smartRaceSolverTargetEpithets: JSON.stringify(["Old Target"]),
            smartRaceSolverForcedEpithets: JSON.stringify(["Old Forced"]),
            smartRaceSolverManualLocks: JSON.stringify({ "20": "Some Race" }),
            smartRaceSolverWeights: "{}",
        },
        training: {
            preferredDistanceOverride: "Default",
            disableStatTargets: true,
            enablePrioritizeSkillHints: false,
        },
        skills: { enableSkillPointCheck: true },
    }) as Settings

describe("parentFarmingCharacterBundles", () => {
    it("applies character, goal, parent mode, and training overrides in one step", () => {
        const bundle = findParentFarmingCharacterBundle("grass-wonder-mile")
        expect(bundle).toBeDefined()

        const result = applyParentFarmingCharacterBundle(createSettings(), bundle!)
        const grassPreset = findCharacterPresetEntry("Grass Wonder")!

        expect(result.racing.enableParentFarmingMode).toBe(true)
        expect(result.racing.enableSmartRaceSolver).toBe(true)
        expect(result.racing.enableForceRacing).toBe(false)
        expect(result.racing.smartRaceSolverCharacterPreset).toBe("Grass Wonder")
        expect(JSON.parse(result.racing.smartRaceSolverAptitudes)).toEqual(aptitudesFromCharacterPreset(grassPreset))
        expect(result.training.preferredDistanceOverride).toBe("Mile")
        expect(result.training.disableStatTargets).toBe(true)
        expect(result.training.enablePrioritizeSkillHints).toBe(true)
        expect(result.skills.enableSkillPointCheck).toBe(false)
        expect(result.general.enableStopBeforeFinals).toBe(false)
    })

    it("replaces epithet selections and clears manual locks instead of merging", () => {
        const bundle = findParentFarmingCharacterBundle("grass-wonder-mile")!
        const result = applyParentFarmingCharacterBundle(createSettings(), bundle)
        const targets = JSON.parse(result.racing.smartRaceSolverTargetEpithets) as string[]
        const forced = JSON.parse(result.racing.smartRaceSolverForcedEpithets) as string[]

        expect(targets).not.toContain("Old Target")
        expect(forced).not.toContain("Old Forced")
        expect(targets.length).toBeGreaterThan(0)
        expect(result.racing.smartRaceSolverManualLocks).toBe("{}")
    })

    it("filters epithets using the bundle character gate", () => {
        const allowed = buildAllowedEpithetNamesForParentBundle("Trackblazer", "Vodka")
        const bundle = findParentFarmingCharacterBundle("vodka-tiara")!
        const result = applyParentFarmingCharacterBundle(createSettings(), bundle)
        const targets = JSON.parse(result.racing.smartRaceSolverTargetEpithets) as string[]

        expect(targets.every((name) => allowed.has(name))).toBe(true)
        expect(targets).toContain("Triple Tiara")
    })
})
