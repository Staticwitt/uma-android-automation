import { parseDecisionReports, DecisionReportRecord, FileDividerRecord } from "../decisionReportParser"
import type { LogFileInput } from "../eventLogParser"

const file = (name: string, content: string): LogFileInput => ({ name, content })

const reportRecords = (result: ReturnType<typeof parseDecisionReports>) => result.records.filter((r): r is DecisionReportRecord => r.kind === "report")

const dividerRecords = (result: ReturnType<typeof parseDecisionReports>) => result.records.filter((r): r is FileDividerRecord => r.kind === "fileDivider")

/** Builds a Decision Report block matching the exact text format emitted by `DecisionTracer.formatReport()`. */
function buildReportBlock(): string {
    return [
        "============== Turn 25 (CLASSIC EARLY JANUARY) Decision Report ==============",
        "State:",
        "  Energy = 80%",
        "  Mood = GOOD",
        "  Negative Statuses = []",
        "  consecutiveRaceCount = 2",
        "Inventory (decision-relevant):",
        "  [Energy and Motivation]",
        "  Vita 15 = 2",
        "  Vita 65 = 1",
        "Settings (decision-relevant):",
        "  Max Failure Chance = 20",
        "Items Used:",
        "  - Reset Whistle: No suitable training found.",
        "",
        "Action: TRAINING",
        "  Reason: Best training available.",
        "",
        "Whistle: USED",
        "  Reason: No suitable training found.",
        "  Post-roll selection: SPEED",
        "",
        "Training selected: SPEED (source=ANALYSIS)",
        "  Reason: Highest score.",
        "  Pick: fail=10%, gains=[SPD:12 STA:0 PWR:3 GUTS:0 WIT:0]",
        "  Runner-ups:",
        "    - STAMINA (considered): score=8.50, fail=15%, gains=[SPD:0 STA:10 PWR:0 GUTS:0 WIT:2], Lower score than SPEED",
        "    - WIT (REJECTED): Blacklisted this turn",
        "",
        "Race eligibility: NOT ELIGIBLE",
        "  Reason: 3 consecutive races already run.",
        "==============================================================",
    ].join("\n")
}

describe("parseDecisionReports", () => {
    it("parses a single Decision Report block end-to-end", () => {
        const result = parseDecisionReports([file("a.txt", buildReportBlock())])
        expect(result.errors).toHaveLength(0)

        const reports = reportRecords(result)
        expect(reports).toHaveLength(1)
        const report = reports[0]

        expect(report.dayNumber).toBe(25)
        expect(report.dateText).toBe("CLASSIC EARLY JANUARY")
        expect(report.fileName).toBe("a.txt")

        expect(report.state.energy).toBe("80%")
        expect(report.state.mood).toBe("GOOD")
        expect(report.state.negativeStatuses).toEqual([])
        expect(report.state.extra).toEqual({ consecutiveRaceCount: "2" })
        expect(report.state.inventory).toEqual([
            {
                group: "Energy and Motivation",
                items: [
                    { name: "Vita 15", count: 2 },
                    { name: "Vita 65", count: 1 },
                ],
            },
        ])

        expect(report.settings).toEqual({ "Max Failure Chance": "20" })
        expect(report.itemsUsed).toEqual([{ name: "Reset Whistle", reason: "No suitable training found." }])
    })

    it("captures the action choice event", () => {
        const [report] = reportRecords(parseDecisionReports([file("a.txt", buildReportBlock())]))
        const action = report.events.find((e) => e.kind === "action")
        expect(action).toEqual({ kind: "action", chosen: "TRAINING", reason: "Best training available.", rejected: [] })
    })

    it("captures the whistle outcome with post-roll selection", () => {
        const [report] = reportRecords(parseDecisionReports([file("a.txt", buildReportBlock())]))
        const whistle = report.events.find((e) => e.kind === "whistle")
        expect(whistle).toEqual({ kind: "whistle", verdict: "USED", reason: "No suitable training found.", postRollSelection: "SPEED" })
    })

    it("captures the training selection with pick details and runner-ups", () => {
        const [report] = reportRecords(parseDecisionReports([file("a.txt", buildReportBlock())]))
        const training = report.events.find((e) => e.kind === "training")
        if (training?.kind !== "training") throw new Error("expected training event")

        expect(training.selected).toBe("SPEED")
        expect(training.source).toBe("ANALYSIS")
        expect(training.reason).toBe("Highest score.")
        expect(training.pickFailureChance).toBe(10)
        expect(training.pickGains).toBe("[SPD:12 STA:0 PWR:3 GUTS:0 WIT:0]")

        expect(training.runnerUps).toHaveLength(2)
        expect(training.runnerUps[0]).toEqual({
            stat: "STAMINA",
            rejected: false,
            reason: "Lower score than SPEED",
            score: 8.5,
            failureChance: 15,
            gains: "[SPD:0 STA:10 PWR:0 GUTS:0 WIT:2]",
        })
        expect(training.runnerUps[1]).toEqual({
            stat: "WIT",
            rejected: true,
            reason: "Blacklisted this turn",
            score: undefined,
            failureChance: undefined,
            gains: undefined,
        })
    })

    it("captures race eligibility", () => {
        const [report] = reportRecords(parseDecisionReports([file("a.txt", buildReportBlock())]))
        const eligibility = report.events.find((e) => e.kind === "raceEligibility")
        expect(eligibility).toEqual({ kind: "raceEligibility", eligible: false, reason: "3 consecutive races already run." })
    })

    it("parses a 'Training selected: NONE' block as a null selection", () => {
        const block = [
            "============== Turn 5 (JUNIOR EARLY JANUARY) Decision Report ==============",
            "State:",
            "  Energy = 50%",
            "  Mood = NORMAL",
            "  Negative Statuses = []",
            "Items Used: None",
            "",
            "Training selected: NONE (source=unset)",
            "  Reason: No training met the gain floor.",
            "==============================================================",
        ].join("\n")

        const [report] = reportRecords(parseDecisionReports([file("a.txt", block)]))
        expect(report.itemsUsed).toEqual([])
        const training = report.events.find((e) => e.kind === "training")
        if (training?.kind !== "training") throw new Error("expected training event")
        expect(training.selected).toBeNull()
    })

    it("inserts a single file divider per file and parses multiple turns within a file", () => {
        const twoTurns = [buildReportBlock(), buildReportBlock().replace("Turn 25", "Turn 26")].join("\n")
        const result = parseDecisionReports([file("a.txt", twoTurns)])

        expect(dividerRecords(result)).toHaveLength(1)
        expect(reportRecords(result)).toHaveLength(2)
        expect(reportRecords(result).map((r) => r.dayNumber)).toEqual([25, 26])
    })

    it("reports an error for a file with no Decision Report blocks", () => {
        const result = parseDecisionReports([file("empty.txt", "[INFO] nothing interesting here\n")])
        expect(result.errors).toEqual([{ message: "No Decision Report blocks found in empty.txt.", fileName: "empty.txt" }])
        expect(reportRecords(result)).toHaveLength(0)
    })
})
