import type { LogFileInput, ParseError } from "./eventLogParser"

export type { LogFileInput }

/** An alternative action that was considered but rejected for a main-screen action choice. */
export type RejectedAlternative = {
    /** Display name of the rejected action. */
    action: string
    /** Short reason it was rejected. */
    reason: string
}

/** A training that lost the scoring contest, with its score and rejection reason. */
export type TrainingRunnerUp = {
    /** The stat whose training was scored. */
    stat: string
    /** True if this training was filtered out (blacklist, failure-chance gate, etc.). */
    rejected: boolean
    /** Short reason explaining the verdict. */
    reason: string
    /** Numeric score from the scoring function, when present. */
    score?: number
    /** Failure chance percentage, when present. */
    failureChance?: number
    /** Bracketed stat-gain string (e.g. `[SPD:2 STA:11 PWR:1 GUTS:0 WIT:0]`), when present. */
    gains?: string
}

/** A single decision event recorded during a turn, in the order they were recorded. */
export type DecisionEvent =
    | { kind: "action"; chosen: string; reason: string; rejected: RejectedAlternative[] }
    | { kind: "item"; item: string; verdict: string; reason: string }
    | { kind: "charm"; blockingGate?: string }
    | { kind: "whistle"; verdict: string; reason: string; postRollSelection?: string }
    | { kind: "training"; selected: string | null; source: string; reason: string; pickFailureChance?: number; pickGains?: string; runnerUps: TrainingRunnerUp[] }
    | { kind: "raceEligibility"; eligible: boolean; reason: string }
    | { kind: "note"; message: string }
    | { kind: "recovery"; action: string; reason: string }

/** A category of decision-relevant inventory (e.g. "Energy and Motivation") and its item counts. */
export type InventoryGroup = {
    /** Category label. */
    group: string
    /** Items in this category with their current counts. */
    items: { name: string; count: number }[]
}

/** State snapshotted at the start of the turn the report covers. */
export type DecisionReportState = {
    /** Energy percentage text (e.g. "80%"), when present. */
    energy?: string
    /** Mood text (e.g. "GOOD"), when present. */
    mood?: string
    /** Active negative status names. */
    negativeStatuses: string[]
    /** Campaign-specific extra state values (e.g. `consecutiveRaceCount`). */
    extra: Record<string, string>
    /** Decision-relevant inventory grouped by category. */
    inventory: InventoryGroup[]
}

/** A single parsed Decision Report block for one turn. */
export type DecisionReportRecord = {
    /** The kind of record. */
    kind: "report"
    /** The in-game day/turn number. */
    dayNumber: number
    /** The free-form date text inside the turn label (e.g. "CLASSIC EARLY JANUARY"). */
    dateText: string
    /** The name of the source file. */
    fileName: string
    /** State snapshot for this turn. */
    state: DecisionReportState
    /** Decision-relevant settings values, in recorded order. */
    settings: Record<string, string>
    /** Items the bot actually consumed this turn. */
    itemsUsed: { name: string; reason?: string }[]
    /** Decision events recorded this turn, in recorded order. */
    events: DecisionEvent[]
}

/** Marks a transition between two imported files in the combined record list. */
export type FileDividerRecord = {
    /** The kind of record. */
    kind: "fileDivider"
    /** The name of the file. */
    fileName: string
}

export type DecisionParseResult = {
    /** The records parsed from the log files, in file order. */
    records: (DecisionReportRecord | FileDividerRecord)[]
    /** Errors encountered while parsing (e.g. a file with no Decision Report blocks). */
    errors: ParseError[]
}

const HEADER_RE = /^=+\s*Turn\s+(\d+)\s*\(([^)]*)\)\s*Decision Report\s*=+$/
const FOOTER_RE = /^=+$/

/** True when a raw line has no leading whitespace and is non-empty (i.e. starts a new top-level section). */
function isTopLevel(line: string): boolean {
    return line.length > 0 && !/^\s/.test(line)
}

/**
 * Parses the body lines of a single Decision Report block (between the header and footer) into a structured record.
 * @param bodyLines The raw lines between the report's header and footer, exclusive of both.
 * @param dayNumber The turn/day number parsed from the header.
 * @param dateText The free-form date text parsed from the header.
 * @param fileName The name of the source file.
 * @returns The structured Decision Report record.
 */
function parseReportBody(bodyLines: string[], dayNumber: number, dateText: string, fileName: string): DecisionReportRecord {
    const state: DecisionReportState = { negativeStatuses: [], extra: {}, inventory: [] }
    const settings: Record<string, string> = {}
    const itemsUsed: { name: string; reason?: string }[] = []
    const events: DecisionEvent[] = []

    let i = 0
    while (i < bodyLines.length) {
        const raw = bodyLines[i]
        const t = raw.trim()
        if (t === "") {
            i++
            continue
        }

        if (t === "State:") {
            i++
            while (i < bodyLines.length && !isTopLevel(bodyLines[i])) {
                const l = bodyLines[i].trim()
                const kv = l.match(/^(.+?)\s*=\s*(.*)$/)
                if (kv) {
                    const key = kv[1].trim()
                    const value = kv[2].trim()
                    if (key === "Energy") state.energy = value
                    else if (key === "Mood") state.mood = value
                    else if (key === "Negative Statuses") {
                        const inner = value.replace(/^\[/, "").replace(/\]$/, "").trim()
                        state.negativeStatuses = inner ? inner.split(",").map((s) => s.trim()) : []
                    } else {
                        state.extra[key] = value
                    }
                }
                i++
            }
            continue
        }

        if (t === "Inventory (decision-relevant):") {
            i++
            let currentGroup: InventoryGroup | null = null
            while (i < bodyLines.length && !isTopLevel(bodyLines[i])) {
                const l = bodyLines[i].trim()
                const groupMatch = l.match(/^\[(.+)\]$/)
                if (groupMatch) {
                    currentGroup = { group: groupMatch[1], items: [] }
                    state.inventory.push(currentGroup)
                } else {
                    const kv = l.match(/^(.+?)\s*=\s*(\d+)$/)
                    if (kv && currentGroup) {
                        currentGroup.items.push({ name: kv[1].trim(), count: parseInt(kv[2], 10) })
                    }
                }
                i++
            }
            continue
        }

        if (t === "Settings (decision-relevant):") {
            i++
            while (i < bodyLines.length && !isTopLevel(bodyLines[i])) {
                const l = bodyLines[i].trim()
                const kv = l.match(/^(.+?)\s*=\s*(.*)$/)
                if (kv) settings[kv[1].trim()] = kv[2].trim()
                i++
            }
            continue
        }

        if (t.startsWith("Items Used:")) {
            i++
            while (i < bodyLines.length && !isTopLevel(bodyLines[i])) {
                const l = bodyLines[i].trim()
                const m = l.match(/^-\s*(.+?)(?::\s*(.*))?$/)
                if (m) itemsUsed.push({ name: m[1].trim(), reason: m[2]?.trim() || undefined })
                i++
            }
            continue
        }

        if (t.startsWith("Action:")) {
            const chosen = t.slice("Action:".length).trim()
            i++
            let reason = ""
            const rejected: RejectedAlternative[] = []
            while (i < bodyLines.length && !isTopLevel(bodyLines[i])) {
                const l = bodyLines[i].trim()
                if (l.startsWith("Reason:")) {
                    reason = l.slice("Reason:".length).trim()
                    i++
                } else if (l === "Rejected alternatives:") {
                    i++
                    while (i < bodyLines.length && !isTopLevel(bodyLines[i]) && bodyLines[i].trim().startsWith("-")) {
                        const m = bodyLines[i].trim().match(/^-\s*(.+?):\s*(.*)$/)
                        if (m) rejected.push({ action: m[1].trim(), reason: m[2].trim() })
                        i++
                    }
                } else {
                    i++
                }
            }
            events.push({ kind: "action", chosen, reason, rejected })
            continue
        }

        if (t.startsWith("Item:")) {
            const m = t.match(/^Item:\s*(.+?)\s*->\s*(.+)$/)
            const item = m?.[1]?.trim() ?? t.slice("Item:".length).trim()
            const verdict = m?.[2]?.trim() ?? ""
            i++
            let reason = ""
            while (i < bodyLines.length && !isTopLevel(bodyLines[i])) {
                const l = bodyLines[i].trim()
                if (l.startsWith("Reason:")) reason = l.slice("Reason:".length).trim()
                i++
            }
            events.push({ kind: "item", item, verdict, reason })
            continue
        }

        if (t.startsWith("Charm:")) {
            i++
            let blockingGate: string | undefined
            while (i < bodyLines.length && !isTopLevel(bodyLines[i])) {
                const l = bodyLines[i].trim()
                if (l.startsWith("Gate:")) blockingGate = l.slice("Gate:".length).trim()
                i++
            }
            events.push({ kind: "charm", blockingGate })
            continue
        }

        if (t.startsWith("Whistle:")) {
            const verdict = t.slice("Whistle:".length).trim()
            i++
            let reason = ""
            let postRollSelection: string | undefined
            while (i < bodyLines.length && !isTopLevel(bodyLines[i])) {
                const l = bodyLines[i].trim()
                if (l.startsWith("Reason:")) reason = l.slice("Reason:".length).trim()
                else if (l.startsWith("Post-roll selection:")) postRollSelection = l.slice("Post-roll selection:".length).trim()
                i++
            }
            events.push({ kind: "whistle", verdict, reason, postRollSelection })
            continue
        }

        if (t.startsWith("Training selected:")) {
            const m = t.match(/^Training selected:\s*(.+?)\s*\(source=(.+)\)$/)
            const selectedRaw = m?.[1]?.trim() ?? t.slice("Training selected:".length).trim()
            const source = m?.[2]?.trim() ?? ""
            const selected = selectedRaw === "NONE" ? null : selectedRaw
            i++
            let reason = ""
            let pickFailureChance: number | undefined
            let pickGains: string | undefined
            const runnerUps: TrainingRunnerUp[] = []
            while (i < bodyLines.length && !isTopLevel(bodyLines[i])) {
                const l = bodyLines[i].trim()
                if (l.startsWith("Reason:")) {
                    reason = l.slice("Reason:".length).trim()
                    i++
                } else if (l.startsWith("Pick:")) {
                    const pickStr = l.slice("Pick:".length).trim()
                    const failMatch = pickStr.match(/fail=(\d+)%/)
                    if (failMatch) pickFailureChance = parseInt(failMatch[1], 10)
                    const gainsMatch = pickStr.match(/gains=(\[[^\]]*\])/)
                    if (gainsMatch) pickGains = gainsMatch[1]
                    i++
                } else if (l === "Runner-ups:") {
                    i++
                    while (i < bodyLines.length && !isTopLevel(bodyLines[i]) && bodyLines[i].trim().startsWith("-")) {
                        const ru = bodyLines[i].trim()
                        const ruMatch = ru.match(/^-\s*(\w+)\s*\((considered|REJECTED)\):\s*(.*)$/)
                        if (ruMatch) {
                            const stat = ruMatch[1]
                            const rejectedFlag = ruMatch[2] === "REJECTED"
                            const detail = ruMatch[3]
                            const scoreMatch = detail.match(/score=([\d.]+),?\s*/)
                            const failMatch2 = detail.match(/fail=(\d+)%,?\s*/)
                            const gainsMatch2 = detail.match(/gains=(\[[^\]]*\]),?\s*/)
                            let reasonText = detail
                            for (const mm of [scoreMatch, failMatch2, gainsMatch2]) {
                                if (mm) reasonText = reasonText.replace(mm[0], "")
                            }
                            runnerUps.push({
                                stat,
                                rejected: rejectedFlag,
                                reason: reasonText.trim(),
                                score: scoreMatch ? parseFloat(scoreMatch[1]) : undefined,
                                failureChance: failMatch2 ? parseInt(failMatch2[1], 10) : undefined,
                                gains: gainsMatch2 ? gainsMatch2[1] : undefined,
                            })
                        }
                        i++
                    }
                } else {
                    i++
                }
            }
            events.push({ kind: "training", selected, source, reason, pickFailureChance, pickGains, runnerUps })
            continue
        }

        if (t.startsWith("Race eligibility:")) {
            const eligible = t.slice("Race eligibility:".length).trim() === "ELIGIBLE"
            i++
            let reason = ""
            while (i < bodyLines.length && !isTopLevel(bodyLines[i])) {
                const l = bodyLines[i].trim()
                if (l.startsWith("Reason:")) reason = l.slice("Reason:".length).trim()
                i++
            }
            events.push({ kind: "raceEligibility", eligible, reason })
            continue
        }

        if (t.startsWith("Note:")) {
            events.push({ kind: "note", message: t.slice("Note:".length).trim() })
            i++
            continue
        }

        if (t.startsWith("Recovery executed:")) {
            const action = t.slice("Recovery executed:".length).trim()
            i++
            let reason = ""
            while (i < bodyLines.length && !isTopLevel(bodyLines[i])) {
                const l = bodyLines[i].trim()
                if (l.startsWith("Reason:")) reason = l.slice("Reason:".length).trim()
                i++
            }
            events.push({ kind: "recovery", action, reason })
            continue
        }

        // Unrecognized top-level line (e.g. future report sections) - skip it.
        i++
    }

    return { kind: "report", dayNumber, dateText, fileName, state, settings, itemsUsed, events }
}

/**
 * Parses one or more bot log files and extracts every `[DECISION]`-tagged Decision Report block emitted by `DecisionTracer`,
 * in file order with file-divider markers between sources.
 * @param files The log files to parse.
 * @returns The parsed Decision Report records, plus any per-file errors (e.g. a file with no reports found).
 */
export function parseDecisionReports(files: LogFileInput[]): DecisionParseResult {
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name))
    const records: (DecisionReportRecord | FileDividerRecord)[] = []
    const errors: ParseError[] = []

    for (const file of sorted) {
        const lines = file.content.split(/\r?\n/)
        let foundAny = false
        let dividerInserted = false

        let i = 0
        while (i < lines.length) {
            const headerMatch = lines[i].trim().match(HEADER_RE)
            if (headerMatch) {
                const dayNumber = parseInt(headerMatch[1], 10)
                const dateText = headerMatch[2].trim()
                i++
                const body: string[] = []
                while (i < lines.length && !FOOTER_RE.test(lines[i].trim())) {
                    if (HEADER_RE.test(lines[i].trim())) break
                    body.push(lines[i])
                    i++
                }
                if (i < lines.length && FOOTER_RE.test(lines[i].trim())) i++

                if (!dividerInserted) {
                    records.push({ kind: "fileDivider", fileName: file.name })
                    dividerInserted = true
                }
                records.push(parseReportBody(body, dayNumber, dateText, file.name))
                foundAny = true
                continue
            }
            i++
        }

        if (!foundAny) {
            errors.push({ message: `No Decision Report blocks found in ${file.name}.`, fileName: file.name })
        }
    }

    return { records, errors }
}
