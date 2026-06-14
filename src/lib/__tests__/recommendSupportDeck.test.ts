import supportsData from "../../data/supports.json"
import { PARENT_FARMING_CHARACTER_BUNDLES } from "../parentFarmingCharacterBundles"
import {
    inferGoalPresetKeyFromAptitudes,
    recommendSupportDeckForCharacter,
} from "../recommendSupportDeck"
import { SUPPORT_CARD_CATALOG } from "../supportCardCatalog"
import { SUPPORT_DECK_PRESETS } from "../supportDeckPresets"

describe("supportCardCatalog", () => {
    it("covers every support in supports.json", () => {
        const names = Object.keys(supportsData)
        const missing = names.filter((name) => !SUPPORT_CARD_CATALOG[name])
        expect(missing).toEqual([])
    })
})

describe("supportDeckPresets", () => {
    it("lists only known support names", () => {
        const names = new Set(Object.keys(supportsData))
        for (const preset of Object.values(SUPPORT_DECK_PRESETS)) {
            for (const card of [...preset.owned, preset.friend]) {
                expect(names.has(card)).toBe(true)
            }
        }
    })
})

describe("recommendSupportDeckForCharacter", () => {
    it("uses character bundle when available", () => {
        const bundle = PARENT_FARMING_CHARACTER_BUNDLES.find((b) => b.characterName === "Grass Wonder")!
        const rec = recommendSupportDeckForCharacter("Grass Wonder")
        expect(rec).not.toBeNull()
        expect(rec!.source).toBe("character-bundle")
        expect(rec!.bundleKey).toBe(bundle.key)
        expect(rec!.goalPresetKey).toBe("mile-sprint")
        expect(rec!.slots[0].cardName).toBe("Grass Wonder")
        expect(rec!.friendBorrowOrder.length).toBeGreaterThan(0)
    })

    it("infers route for characters without a bundle", () => {
        const rec = recommendSupportDeckForCharacter("Curren Chan")
        expect(rec).not.toBeNull()
        expect(rec!.source).toBe("aptitude-inferred")
        expect(rec!.goalPresetKey).toBe("mile-sprint")
    })

    it("substitutes trainee name from owned slots", () => {
        const rec = recommendSupportDeckForCharacter("Silence Suzuka")
        const ownedNames = rec!.slots.filter((s) => s.role === "owned").map((s) => s.cardName)
        expect(ownedNames).not.toContain("Silence Suzuka")
    })

    it("returns null for unknown character", () => {
        expect(recommendSupportDeckForCharacter("Not A Horse")).toBeNull()
    })
})

describe("inferGoalPresetKeyFromAptitudes", () => {
    it("picks dirt for dirt specialists", () => {
        const key = inferGoalPresetKeyFromAptitudes({
            name: "Test",
            distanceAptitudes: { Sprint: "F", Mile: "C", Medium: "C", Long: "G" },
            surfaceAptitudes: { Turf: "D", Dirt: "A" },
        })
        expect(key).toBe("dirt")
    })
})
