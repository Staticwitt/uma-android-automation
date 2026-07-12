import { analyzeCareerRun, activeTargetsForDistance, targetSettingKey } from "../careerAutoTune"
import type { CareerRunRecord, AutoTuneSettingsInput } from "../careerAutoTune"

/** A well-tuned baseline sprint run: stats track priority order and sit near their targets. */
const cleanRun = (): CareerRunRecord => ({
    id: "run-clean",
    scenario: "Unity Cup",
    traineeName: "Nishino Flower",
    careerRank: "A",
    raceWins: 12,
    raceLosses: 1,
    raceRecords: [],
    skillPoints: 40,
    stats: { speed: 1180, stamina: 410, power: 880, guts: 590, wit: 840 },
})

const sprintSettings = (overrides: Partial<AutoTuneSettingsInput> = {}): AutoTuneSettingsInput => ({
    statPrioritization: ["Speed", "Power", "Wit", "Guts", "Stamina"],
    preferredDistance: "Sprint",
    targets: { speed: 1200, stamina: 400, power: 900, guts: 600, wit: 850 },
    maximumFailureChance: 18,
    ...overrides,
})

describe("analyzeCareerRun", () => {
    test("a well-tuned run yields no suggestions", () => {
        expect(analyzeCareerRun(cleanRun(), sprintSettings())).toEqual([])
    })

    test("flags Power overshooting higher-priority Speed and offers an applicable target patch", () => {
        // The real Nishino Flower run: Power 930 finished above Speed 839 despite Speed being priority #1.
        const run = { ...cleanRun(), stats: { speed: 839, stamina: 500, power: 930, guts: 590, wit: 840 } }
        const out = analyzeCareerRun(run, sprintSettings())
        const inversion = out.find((s) => s.id === "inversion-power-over-speed")
        expect(inversion).toBeDefined()
        expect(inversion!.severity).toBe("high")
        // Suggests lowering the Sprint Power target below Speed's final (839 - 50 -> 789 -> rounded to 800).
        expect(inversion!.patch).toEqual({ category: "trainingStatTarget", key: "trainingSprintStatTarget_powerStatTarget", value: 800 })
    })

    test("flags deprioritized Stamina bloat as off-distance racing, without a target patch", () => {
        // Stamina 747 vs a 400 target on a sprint build => racing padded it, not training.
        const run = { ...cleanRun(), stats: { speed: 1180, stamina: 747, power: 880, guts: 590, wit: 840 } }
        const out = analyzeCareerRun(run, sprintSettings())
        const bloat = out.find((s) => s.id === "overshoot-bloat-stamina")
        expect(bloat).toBeDefined()
        expect(bloat!.patch).toBeUndefined()
        expect(bloat!.detail).toMatch(/aptitude threshold/i)
    })

    test("flags an actively-trained top stat overshooting with a target-raise patch", () => {
        // Speed (priority #1) blew past its target => raise the target so surplus turns keep funding it.
        const run = { ...cleanRun(), stats: { speed: 1500, stamina: 410, power: 880, guts: 590, wit: 840 } }
        const out = analyzeCareerRun(run, sprintSettings())
        const overshoot = out.find((s) => s.id === "overshoot-trained-speed")
        expect(overshoot).toBeDefined()
        expect(overshoot!.patch).toEqual({ category: "trainingStatTarget", key: "trainingSprintStatTarget_speedStatTarget", value: 1450 })
    })

    test("flags the top-priority stat falling short of target", () => {
        const run = { ...cleanRun(), stats: { speed: 900, stamina: 410, power: 880, guts: 590, wit: 840 } }
        const out = analyzeCareerRun(run, sprintSettings())
        const undershoot = out.find((s) => s.id === "undershoot-speed")
        expect(undershoot).toBeDefined()
        expect(undershoot!.severity).toBe("high")
    })

    test("flags a strict failure cap with an applicable patch to 18", () => {
        const out = analyzeCareerRun(cleanRun(), sprintSettings({ maximumFailureChance: 12 }))
        const cap = out.find((s) => s.id === "failure-cap-strict")
        expect(cap).toBeDefined()
        expect(cap!.patch).toEqual({ category: "training", key: "maximumFailureChance", value: 18 })
    })

    test("flags unspent skill points at career end", () => {
        const run = { ...cleanRun(), skillPoints: 900 }
        const out = analyzeCareerRun(run, sprintSettings())
        expect(out.find((s) => s.id === "unspent-sp")).toBeDefined()
    })

    test("flags a high loss rate", () => {
        const run = { ...cleanRun(), raceWins: 9, raceLosses: 3 }
        const out = analyzeCareerRun(run, sprintSettings())
        const loss = out.find((s) => s.id === "high-loss-rate")
        expect(loss).toBeDefined()
        expect(loss!.detail).toMatch(/25%/)
    })

    test("suggestions are ordered by severity (high before medium before low)", () => {
        const run = { ...cleanRun(), stats: { speed: 900, stamina: 747, power: 880, guts: 590, wit: 840 }, skillPoints: 900 }
        const out = analyzeCareerRun(run, sprintSettings({ maximumFailureChance: 12 }))
        const severities = out.map((s) => s.severity)
        const rank = { high: 0, medium: 1, low: 2 }
        for (let i = 1; i < severities.length; i++) {
            expect(rank[severities[i]]).toBeGreaterThanOrEqual(rank[severities[i - 1]])
        }
    })

    test("does not report the same stat as both an inversion and an overshoot", () => {
        const run = { ...cleanRun(), stats: { speed: 839, stamina: 500, power: 1200, guts: 590, wit: 840 } }
        const out = analyzeCareerRun(run, sprintSettings())
        expect(out.filter((s) => s.id.endsWith("power")).length).toBeLessThanOrEqual(1)
        expect(out.find((s) => s.id === "inversion-power-over-speed")).toBeDefined()
        expect(out.find((s) => s.id === "overshoot-bloat-power")).toBeUndefined()
    })
})

describe("activeTargetsForDistance", () => {
    test("extracts the flat per-stat target block for a distance", () => {
        const slice = {
            trainingSprintStatTarget_speedStatTarget: 1200,
            trainingSprintStatTarget_staminaStatTarget: 400,
            trainingSprintStatTarget_powerStatTarget: 900,
            trainingSprintStatTarget_gutsStatTarget: 600,
            trainingSprintStatTarget_witStatTarget: 850,
            trainingMileStatTarget_speedStatTarget: 1200,
        }
        expect(activeTargetsForDistance(slice, "Sprint")).toEqual({ speed: 1200, stamina: 400, power: 900, guts: 600, wit: 850 })
    })

    test("missing keys default to 0", () => {
        expect(activeTargetsForDistance({}, "Medium")).toEqual({ speed: 0, stamina: 0, power: 0, guts: 0, wit: 0 })
    })

    test("targetSettingKey builds the expected settings key", () => {
        expect(targetSettingKey("Sprint", "power")).toBe("trainingSprintStatTarget_powerStatTarget")
        expect(targetSettingKey("Long", "stamina")).toBe("trainingLongStatTarget_staminaStatTarget")
    })
})
