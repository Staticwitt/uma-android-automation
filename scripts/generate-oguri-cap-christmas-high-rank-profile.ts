import { writeFileSync, mkdirSync } from "fs"
import { defaultSettings } from "../src/context/BotStateContext"
import { applyGeneralSolverPreset } from "../src/lib/generalSolverPreset"
import { OPTIMIZE_MODE_PRESETS } from "../src/lib/solver/constants"
import { prepareSettingsForBotStart } from "../src/lib/prepareSettingsForBotStart"

// Outfits don't change race aptitude, only the per-stat growth bonus (+15% Speed / +15% Stamina for this
// costume per GameTora), so this reuses the base Oguri Cap distance/surface aptitudes under the outfit-qualified
// "Oguri Cap (Christmas)" preset key, which the Smart Race Solver reads growthBonus from at solve time.
const OGURI_CAP_APTITUDES = { Sprint: "E", Mile: "A", Medium: "A", Long: "B", Turf: "A", Dirt: "B" }

let settings = { ...defaultSettings }
settings = applyGeneralSolverPreset(settings)

Object.assign(settings.racing, {
    smartRaceSolverCharacterPreset: "Oguri Cap (Christmas)",
    smartRaceSolverAptitudes: JSON.stringify(OGURI_CAP_APTITUDES),
    // "Ideal Idol" is Oguri Cap-exclusive and lines up with her Mile/Medium turf strengths (Mile Championship,
    // Yasuda Kinen, Arima Kinen). The rest are generic G1-win-count epithets that reward stats/SP/fans at any rank.
    smartRaceSolverTargetEpithets: JSON.stringify(["Ideal Idol", "G1 Hunter", "Epoch Pioneer", "First Step to Glory", "The GOAT"]),
    smartRaceSolverForcedEpithets: "[]",
    smartRaceSolverWeights: JSON.stringify({
        ...JSON.parse(settings.racing.smartRaceSolverWeights),
        ...OPTIMIZE_MODE_PRESETS.FANS_EPITAPH,
        targetEpithetMultiplier: 4.0,
        minWinRateGuard: 0.75,
    }),
    enableAutoBorrowSupportCard: true,
    enableAutoEquipOwnedSupportDeck: true,
    enableAutoStartCareer: true,
})

Object.assign(settings.training, {
    // Speed and Stamina lead since this outfit's +15%/+15% growth bonus makes them the most efficient stats to
    // train (more stat gain per training action); Power stays ahead of Wit/Guts for her Speed+Power Mile/Medium races.
    statPrioritization: ["Speed", "Stamina", "Power", "Wit", "Guts"],
    eventChoiceStatPriority: ["Speed", "Stamina", "Power", "Wit", "Guts"],
    summerTrainingStatPriority: ["Speed", "Stamina", "Power", "Wit", "Guts"],
    preferredDistanceOverride: "Auto",
    maximumFailureChance: 15,
    disableStatTargets: true,
    enablePrioritizeSkillHints: true,
    enableTrainingLevelWeighting: true,
    enableRainbowTrainingBonus: true,
})

Object.assign(settings.skills.plans, {
    careerComplete: { ...settings.skills.plans.careerComplete, enabled: true },
})

const prepared = prepareSettingsForBotStart(settings)

const exportObj = {
    general: prepared.general,
    racing: prepared.racing,
    training: prepared.training,
    skills: prepared.skills,
}

mkdirSync("profiles", { recursive: true })
writeFileSync("profiles/oguri-cap-christmas-high-rank.json", JSON.stringify(exportObj, null, 4))
console.log(`Wrote profiles/oguri-cap-christmas-high-rank.json (${exportObj.racing.smartRaceSolverCharacterPreset})`)
