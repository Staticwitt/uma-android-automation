import { sanitizeImportedSettings } from "../settingsUtils"

/** Minimal defaults shaped like the real Settings object: categories of typed leaf values. */
const defaults = {
    training: {
        statPrioritization: ["Speed", "Stamina"],
        maximumFailureChance: 20,
        enableRiskyTraining: false,
        minimumMoodForTraining: "GOOD",
    },
    racing: {
        smartRaceSolverWeights: "{}",
        enableSmartRaceSolver: false,
    },
    general: {
        datingCards: [] as { cardName: string }[],
    },
}

describe("sanitizeImportedSettings", () => {
    test("clean import passes through untouched with no issues", () => {
        const imported = { training: { maximumFailureChance: 12, enableRiskyTraining: true } }
        const { sanitized, issues } = sanitizeImportedSettings(defaults, imported as any)
        expect(issues).toEqual([])
        expect(sanitized).toEqual(imported)
    })

    test("drops a CSV string where the schema expects an array", () => {
        const imported = { training: { statPrioritization: "SPEED,POWER,WIT", maximumFailureChance: 12 } }
        const { sanitized, issues } = sanitizeImportedSettings(defaults, imported as any)
        expect(issues).toEqual([{ category: "training", key: "statPrioritization", expected: "array", received: "string" }])
        expect((sanitized as any).training).toEqual({ maximumFailureChance: 12 })
    })

    test("drops number-for-string and boolean-for-number mismatches independently", () => {
        const imported = { training: { minimumMoodForTraining: 3, maximumFailureChance: true, enableRiskyTraining: true } }
        const { sanitized, issues } = sanitizeImportedSettings(defaults, imported as any)
        expect(issues).toHaveLength(2)
        expect((sanitized as any).training).toEqual({ enableRiskyTraining: true })
    })

    test("keeps unknown keys for migrations to relocate", () => {
        const imported = { training: { someLegacyField: "value" } }
        const { sanitized, issues } = sanitizeImportedSettings(defaults, imported as any)
        expect(issues).toEqual([])
        expect((sanitized as any).training.someLegacyField).toBe("value")
    })

    test("keeps unknown categories untouched", () => {
        const imported = { legacyCategory: { a: 1 } }
        const { sanitized, issues } = sanitizeImportedSettings(defaults, imported as any)
        expect(issues).toEqual([])
        expect((sanitized as any).legacyCategory).toEqual({ a: 1 })
    })

    test("drops an entire category whose value is not an object", () => {
        const imported = { training: "oops", racing: { enableSmartRaceSolver: true } }
        const { sanitized, issues } = sanitizeImportedSettings(defaults, imported as any)
        expect(issues).toEqual([{ category: "training", key: "(entire category)", expected: "object", received: "string" }])
        expect((sanitized as any).training).toBeUndefined()
        expect((sanitized as any).racing).toEqual({ enableSmartRaceSolver: true })
    })

    test("array-for-object category mismatch is dropped", () => {
        const imported = { training: [1, 2, 3] }
        const { issues } = sanitizeImportedSettings(defaults, imported as any)
        expect(issues).toEqual([{ category: "training", key: "(entire category)", expected: "object", received: "array" }])
    })

    test("null imported values pass through (explicit clears are allowed)", () => {
        const imported = { training: { minimumMoodForTraining: null } }
        const { sanitized, issues } = sanitizeImportedSettings(defaults, imported as any)
        expect(issues).toEqual([])
        expect((sanitized as any).training.minimumMoodForTraining).toBeNull()
    })

    test("does not mutate the imported object", () => {
        const imported = { training: { statPrioritization: "bad", maximumFailureChance: 12 } }
        const frozen = JSON.parse(JSON.stringify(imported))
        sanitizeImportedSettings(defaults, imported as any)
        expect(imported).toEqual(frozen)
    })
})
