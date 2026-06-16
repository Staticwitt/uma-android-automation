import type { ParentRunArchiveEntry } from "./parentRunArchive"
import { aptitudesFromCharacterPreset, findCharacterPresetEntry } from "./parentFarmingCharacterBundles"

/** Umalator / uma-tools horse JSON shape (subset used for import). */
export interface UmaToolsHorseState {
    name: string
    outfitId: string
    speed: number
    stamina: number
    power: number
    guts: number
    wisdom: number
    strategy: string
    distanceAptitude: string
    surfaceAptitude: string
    strategyAptitude: string
    /** [short, mile, medium, long, nige, senkou, sasi, oikomi, turf, dirt] */
    aptitudes: [string, string, string, string, string, string, string, string, string, string]
    skills: string[]
}

export interface UmaToolsRunExport {
    source: "uma-android-automation"
    version: 1
    exportedAtMs: number
    runId: string
    traineeName: string
    characterPreset: string
    scenario: string
    qualityGrade?: string
    qualityScore?: number
    horse: UmaToolsHorseState
}

const APTITUDE_RANK: Record<string, number> = { S: 8, A: 7, B: 6, C: 5, D: 4, E: 3, F: 2, G: 1 }

const bestAptitude = (grades: string[]): string =>
    grades.reduce((best, grade) => ((APTITUDE_RANK[grade] ?? 0) > (APTITUDE_RANK[best] ?? 0) ? grade : best), "G")

const normalizeGrade = (value: string | undefined): string => {
    const grade = (value ?? "G").trim().toUpperCase()
    return grade in APTITUDE_RANK ? grade : "G"
}

const styleStrategyName = (styleKey: string): string => {
    switch (styleKey) {
        case "FRONT_RUNNER":
            return "Nige"
        case "PACE_CHASER":
            return "Senkou"
        case "LATE_SURGER":
            return "Sasi"
        case "END_CLOSER":
            return "Oikomi"
        default:
            return "Senkou"
    }
}

const resolveAptitudes = (entry: ParentRunArchiveEntry): {
    distance: Record<string, string>
    surface: Record<string, string>
    style: Record<string, string>
} => {
    const preset = findCharacterPresetEntry(entry.characterPreset || entry.traineeName)
    const presetAptitudes = preset ? aptitudesFromCharacterPreset(preset) : null

    const distance = {
        Sprint: normalizeGrade(entry.distanceAptitudes?.SPRINT ?? presetAptitudes?.Sprint),
        Mile: normalizeGrade(entry.distanceAptitudes?.MILE ?? presetAptitudes?.Mile),
        Medium: normalizeGrade(entry.distanceAptitudes?.MEDIUM ?? presetAptitudes?.Medium),
        Long: normalizeGrade(entry.distanceAptitudes?.LONG ?? presetAptitudes?.Long),
    }
    const surface = {
        Turf: normalizeGrade(entry.surfaceAptitudes?.TURF ?? presetAptitudes?.Turf),
        Dirt: normalizeGrade(entry.surfaceAptitudes?.DIRT ?? presetAptitudes?.Dirt),
    }
    const style = {
        FRONT_RUNNER: normalizeGrade(entry.styleAptitudes?.FRONT_RUNNER),
        PACE_CHASER: normalizeGrade(entry.styleAptitudes?.PACE_CHASER),
        LATE_SURGER: normalizeGrade(entry.styleAptitudes?.LATE_SURGER),
        END_CLOSER: normalizeGrade(entry.styleAptitudes?.END_CLOSER),
    }

    return { distance, surface, style }
}

const pickBestStyleKey = (style: Record<string, string>): string =>
    Object.entries(style).reduce((best, [key, grade]) =>
        (APTITUDE_RANK[grade] ?? 0) > (APTITUDE_RANK[style[best] ?? "G"] ?? 0) ? key : best,
    "PACE_CHASER")

/** Maps a parent run archive entry to uma-tools / Umalator horse JSON. */
export const buildUmaToolsHorseState = (entry: ParentRunArchiveEntry): UmaToolsHorseState => {
    const { distance, surface, style } = resolveAptitudes(entry)
    const bestStyleKey = pickBestStyleKey(style)

    return {
        name: entry.traineeName || entry.characterPreset || "",
        outfitId: "",
        speed: entry.stats.speed,
        stamina: entry.stats.stamina,
        power: entry.stats.power,
        guts: entry.stats.guts,
        wisdom: entry.stats.wit,
        strategy: styleStrategyName(bestStyleKey),
        distanceAptitude: bestAptitude([distance.Sprint, distance.Mile, distance.Medium, distance.Long]),
        surfaceAptitude: bestAptitude([surface.Turf, surface.Dirt]),
        strategyAptitude: bestAptitude(Object.values(style)),
        aptitudes: [
            distance.Sprint,
            distance.Mile,
            distance.Medium,
            distance.Long,
            style.FRONT_RUNNER,
            style.PACE_CHASER,
            style.LATE_SURGER,
            style.END_CLOSER,
            surface.Turf,
            surface.Dirt,
        ],
        skills: [],
    }
}

/** Full export wrapper with run metadata for clipboard / file import. */
export const exportRunForUmaTools = (entry: ParentRunArchiveEntry): string => {
    const payload: UmaToolsRunExport = {
        source: "uma-android-automation",
        version: 1,
        exportedAtMs: Date.now(),
        runId: entry.id,
        traineeName: entry.traineeName,
        characterPreset: entry.characterPreset,
        scenario: entry.scenario,
        qualityGrade: entry.qualityGrade,
        qualityScore: entry.qualityScore,
        horse: buildUmaToolsHorseState(entry),
    }
    return JSON.stringify(payload, null, 2)
}

/** Compact horse-only JSON for direct Umalator paste. */
export const exportHorseJsonForUmaTools = (entry: ParentRunArchiveEntry): string =>
    JSON.stringify(buildUmaToolsHorseState(entry), null, 2)

/** runners.csv-compatible row (umalator-ocr schema). */
export const exportRunForUmaToolsCsv = (entry: ParentRunArchiveEntry): string => {
    const horse = buildUmaToolsHorseState(entry)
    const row = {
        Name: horse.name,
        Epithet: "",
        Speed: String(horse.speed),
        Stamina: String(horse.stamina),
        Power: String(horse.power),
        Guts: String(horse.guts),
        Wit: String(horse.wisdom),
        Skills: "",
        surfaceAptitude: horse.surfaceAptitude,
        distanceAptitude: horse.distanceAptitude,
        strategyAptitude: horse.strategyAptitude,
        strategy: horse.strategy,
    }
    const header = Object.keys(row).join(",")
    const values = Object.values(row)
        .map((value) => (value.includes(",") ? `"${value.replace(/"/g, '""')}"` : value))
        .join(",")
    return `${header}\n${values}`
}
