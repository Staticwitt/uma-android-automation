import { writeFileSync, mkdirSync } from "fs"
import { defaultSettings } from "../src/context/BotStateContext"
import { enableParentFarmingCharacterBundle } from "../src/lib/parentFarmingResolver"
import { breedingPlanToGoalQueue, serializeParentFarmingBreedingPlan } from "../src/lib/parentFarmingBreedingPlan"
import { buildParentFarmingGoalQueueResolved, serializeParentFarmingGoalQueueResolved } from "../src/lib/parentFarmingGoalQueue"
import { prepareSettingsForBotStart } from "../src/lib/prepareSettingsForBotStart"

const breedingPlan = {
    generations: [
        {
            label: "Gen 1 — Grass Wonder mile parent",
            bundleKey: "grass-wonder-mile",
            targetFactorSkills: [] as string[],
            usePreviousAsLegacy: false,
        },
        {
            label: "Gen 2 — Ashen Miracle Oguri",
            bundleKey: "oguri-cap-g1",
            targetFactorSkills: ["Gourmand", "Triple 7s", "Corner Recovery ○"],
            usePreviousAsLegacy: true,
        },
    ],
}

let settings = { ...defaultSettings, general: { ...defaultSettings.general, scenario: "Trackblazer" } }
settings = enableParentFarmingCharacterBundle(settings, "grass-wonder-mile")
Object.assign(settings.racing, {
    enableParentFarmingColdStart: true,
    enableParentFarmingMultiRun: true,
    parentFarmingMultiRunCount: 2,
    enableParentFarmingBreedingPlan: true,
    parentFarmingBreedingPlan: serializeParentFarmingBreedingPlan(breedingPlan),
    enableAutoBorrowSupportCard: true,
    enableAutoEquipOwnedSupportDeck: true,
    enableAutoStartCareer: true,
    enableAutoSelectLegacyParents: true,
    legacyParentSelectionStrategy: "StatAndAptitude",
    sparkSelectionStrategy: "StatAndAptitude",
    legacyParentPreferredPair: "[]",
    ownedSupportCards: "[]",
    supportDeckOwnedCards: "[]",
    supportBorrowPreferredCards: JSON.stringify(["Grass Wonder", "Silence Suzuka", "Maruzensky", "King Halo"]),
    parentFarmingTargetFactorSkills: "[]",
})

const queueItems = breedingPlanToGoalQueue(breedingPlan)
settings.racing.parentFarmingGoalQueue = JSON.stringify(queueItems)
settings.racing.enableParentFarmingGoalQueue = true
settings.racing.parentFarmingGoalQueueResolved = serializeParentFarmingGoalQueueResolved(
    buildParentFarmingGoalQueueResolved(settings, queueItems),
)

const prepared = prepareSettingsForBotStart(settings)

const exportObj = {
    general: prepared.general,
    racing: prepared.racing,
    training: prepared.training,
    skills: prepared.skills,
}

mkdirSync("profiles", { recursive: true })
writeFileSync("profiles/grass-wonder-ashen-miracle-oguri-2gen.json", JSON.stringify(exportObj, null, 4))
console.log(`Wrote profiles/grass-wonder-ashen-miracle-oguri-2gen.json (${exportObj.racing.parentFarmingBundleKey}, ${exportObj.racing.smartRaceSolverCharacterPreset})`)
