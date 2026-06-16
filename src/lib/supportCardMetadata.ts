import supportsData from "../data/supports.json"

import { supportCardType, type SupportCardType } from "./supportCardCatalog"

export interface SupportCardStatTotals {
    speed: number
    stamina: number
    power: number
    guts: number
    wit: number
    skillPoints: number
    energy: number
    mood: number
    hintPoints: number
}

export interface SupportCardMetadata {
    name: string
    type: SupportCardType | undefined
    /** Best-case totals aggregated across training events (one best option per event). */
    totals: SupportCardStatTotals
    /** Distinct skill hint names this card can grant (from event text). */
    hintSkills: string[]
    eventCount: number
    optionCount: number
}

const STAT_KEYS = ["speed", "stamina", "power", "guts", "wit"] as const
type StatKey = (typeof STAT_KEYS)[number]

const emptyTotals = (): SupportCardStatTotals => ({
    speed: 0,
    stamina: 0,
    power: 0,
    guts: 0,
    wit: 0,
    skillPoints: 0,
    energy: 0,
    mood: 0,
    hintPoints: 0,
})

const mergeTotals = (left: SupportCardStatTotals, right: SupportCardStatTotals): SupportCardStatTotals => ({
    speed: left.speed + right.speed,
    stamina: left.stamina + right.stamina,
    power: left.power + right.power,
    guts: left.guts + right.guts,
    wit: left.wit + right.wit,
    skillPoints: left.skillPoints + right.skillPoints,
    energy: left.energy + right.energy,
    mood: left.mood + right.mood,
    hintPoints: left.hintPoints + right.hintPoints,
})

const maxTotals = (left: SupportCardStatTotals, right: SupportCardStatTotals): SupportCardStatTotals => ({
    speed: Math.max(left.speed, right.speed),
    stamina: Math.max(left.stamina, right.stamina),
    power: Math.max(left.power, right.power),
    guts: Math.max(left.guts, right.guts),
    wit: Math.max(left.wit, right.wit),
    skillPoints: Math.max(left.skillPoints, right.skillPoints),
    energy: Math.max(left.energy, right.energy),
    mood: Math.max(left.mood, right.mood),
    hintPoints: Math.max(left.hintPoints, right.hintPoints),
})

const splitRandomBranches = (text: string): string[] => {
    const normalized = text.replace(/^Randomly either\s*/i, "")
    if (normalized.includes("----------")) {
        return normalized
            .split(/\n-{3,}\n/)
            .map((part) => part.trim())
            .filter((part) => part.length > 0)
    }
    return [text.trim()].filter((part) => part.length > 0)
}

const parseHintSkills = (text: string, hints: Map<string, number>) => {
    const pattern = /(.+?) (?:○ )?hint \+(\d+)/gi
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
        const name = match[1].trim()
        const points = Number.parseInt(match[2], 10)
        if (!name || Number.isNaN(points)) continue
        hints.set(name, (hints.get(name) ?? 0) + points)
    }
}

/** Parses a single training-event option reward block into numeric totals. */
export const parseSupportOptionRewards = (text: string): { totals: SupportCardStatTotals; hints: Map<string, number> } => {
    const totals = emptyTotals()
    const hints = new Map<string, number>()

    const statPattern = /(Speed|Stamina|Power|Guts|Wit) \+(\d+)/gi
    let statMatch: RegExpExecArray | null
    while ((statMatch = statPattern.exec(text)) !== null) {
        const key = statMatch[1].toLowerCase() as StatKey
        const value = Number.parseInt(statMatch[2], 10)
        if (STAT_KEYS.includes(key) && !Number.isNaN(value)) {
            totals[key] += value
        }
    }

    const skillPointsMatch = /Skill points \+(\d+)/i.exec(text)
    if (skillPointsMatch) {
        totals.skillPoints += Number.parseInt(skillPointsMatch[1], 10) || 0
    }

    const energyMatch = /(?:Maximum )?Energy \+(\d+)/i.exec(text)
    if (energyMatch) {
        totals.energy += Number.parseInt(energyMatch[1], 10) || 0
    }

    const moodMatch = /Mood \+(\d+)/i.exec(text)
    if (moodMatch) {
        totals.mood += Number.parseInt(moodMatch[1], 10) || 0
    }

    parseHintSkills(text, hints)
    for (const points of hints.values()) {
        totals.hintPoints += points
    }

    return { totals, hints }
}

/** Aggregates all events for one support card into structured metadata. */
export const buildSupportCardMetadata = (name: string, events: Record<string, string[]>): SupportCardMetadata => {
    let eventCount = 0
    let optionCount = 0
    let aggregated = emptyTotals()
    const hintSkills = new Map<string, number>()

    for (const options of Object.values(events)) {
        if (!Array.isArray(options) || options.length === 0) continue
        eventCount += 1
        optionCount += options.length

        let bestForEvent = emptyTotals()
        const eventHints = new Map<string, number>()

        for (const rawOption of options) {
            for (const branch of splitRandomBranches(rawOption)) {
                const parsed = parseSupportOptionRewards(branch)
                bestForEvent = maxTotals(bestForEvent, parsed.totals)
                for (const [hintName, points] of parsed.hints.entries()) {
                    eventHints.set(hintName, Math.max(eventHints.get(hintName) ?? 0, points))
                }
            }
        }

        aggregated = mergeTotals(aggregated, bestForEvent)
        for (const [hintName, points] of eventHints.entries()) {
            hintSkills.set(hintName, (hintSkills.get(hintName) ?? 0) + points)
        }
    }

    const sortedHints = [...hintSkills.entries()].sort((a, b) => b[1] - a[1]).map(([hintName]) => hintName)

    return {
        name,
        type: supportCardType(name),
        totals: aggregated,
        hintSkills: sortedHints,
        eventCount,
        optionCount,
    }
}

const SUPPORT_EVENTS = supportsData as Record<string, Record<string, string[]>>

const metadataIndex: Record<string, SupportCardMetadata> = Object.fromEntries(
    Object.entries(SUPPORT_EVENTS).map(([name, events]) => [name, buildSupportCardMetadata(name, events)]),
)

export const getSupportCardMetadata = (name: string): SupportCardMetadata | undefined => metadataIndex[name]

export const listSupportCardMetadata = (): SupportCardMetadata[] => Object.values(metadataIndex)

/** One-line summary for UI tooltips and deck notes. */
export const formatSupportCardMetadataSummary = (meta: SupportCardMetadata): string => {
    const parts: string[] = []
    if (meta.type) parts.push(meta.type)
    if (meta.totals.hintPoints > 0) parts.push(`${meta.totals.hintPoints} hint pts`)
    if (meta.totals.skillPoints > 0) parts.push(`${meta.totals.skillPoints} SP`)
    const topStat = STAT_KEYS.map((key) => ({ key, value: meta.totals[key] }))
        .filter((entry) => entry.value > 0)
        .sort((a, b) => b.value - a.value)[0]
    if (topStat) {
        parts.push(`${topStat.key.charAt(0).toUpperCase()}${topStat.key.slice(1)} +${topStat.value}`)
    }
    return parts.join(" · ")
}
