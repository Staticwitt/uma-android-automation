import { writeFileSync, mkdirSync } from "fs"
import { defaultSettings } from "../src/context/BotStateContext"
import { applyGeneralSolverPreset } from "../src/lib/generalSolverPreset"
import { OPTIMIZE_MODE_PRESETS } from "../src/lib/solver/constants"
import { prepareSettingsForBotStart } from "../src/lib/prepareSettingsForBotStart"

// "Oguri Cap (Christmas)" isn't in characterPresets.json yet (no scraped outfit-specific growth-rate data),
// so this seeds the base Oguri Cap race aptitudes - outfits don't change distance/surface aptitude, only the
// optional per-stat growth bonus, which the solver will pick up automatically once that outfit entry exists.
const OGURI_CAP_APTITUDES = { Sprint: "E", Mile: "A", Medium: "A", Long: "B", Turf: "A", Dirt: "B" }

let settings = { ...defaultSettings }
settings = applyGeneralSolverPreset(settings)

Object.assign(settings.racing, {
    smartRaceSolverCharacterPreset: "Oguri Cap",
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
    // Speed/Power lead since Mile and Medium (her two A-aptitude distances) are Speed+Power races; Wit ahead of
    // Guts for skill points + training efficiency, which both count toward the final career score.
    statPrioritization: ["Speed", "Power", "Stamina", "Wit", "Guts"],
    eventChoiceStatPriority: ["Speed", "Power", "Stamina", "Wit", "Guts"],
    summerTrainingStatPriority: ["Speed", "Power", "Stamina", "Wit", "Guts"],
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
