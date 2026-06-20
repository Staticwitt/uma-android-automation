import React, { useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import Ionicons from "@react-native-vector-icons/ionicons"
import type { DecisionEvent, DecisionReportRecord } from "../../lib/decisionReportParser"
import { useTheme } from "../../context/ThemeContext"

type Props = {
    /** The parsed Decision Report record for a single turn. */
    record: DecisionReportRecord
}

/**
 * Builds a one-line collapsed summary for a report: the training pick if one was recorded, falling back to the chosen
 * main-screen action, or a placeholder when neither was recorded.
 * @param record The Decision Report record to summarize.
 * @returns A short summary string.
 */
function summarize(record: DecisionReportRecord): string {
    const training = record.events.find((e) => e.kind === "training")
    if (training?.kind === "training") {
        return training.selected ? `Training: ${training.selected}` : "No training selected"
    }
    const action = record.events.find((e) => e.kind === "action")
    if (action?.kind === "action") return `Action: ${action.chosen}`
    return "No primary action recorded"
}

/**
 * Displays a single turn's Decision Report as an expandable card. Collapsed, it shows the turn header, a one-line
 * summary of the primary decision, and badges for energy/mood/items used. Expanded, it renders the full state
 * snapshot, settings, items used, and every recorded decision event in order.
 * @param record The parsed Decision Report record to render.
 */
const ReportCard: React.FC<Props> = ({ record }) => {
    const { colors } = useTheme()
    const [expanded, setExpanded] = useState(false)

    const styles = useMemo(
        () =>
            StyleSheet.create({
                container: {
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    marginBottom: 10,
                    backgroundColor: colors.surface,
                    borderColor: colors.borderHair,
                },
                headerRow: {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                },
                title: {
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.text,
                },
                date: {
                    fontSize: 12,
                    color: colors.textMuted,
                },
                summary: {
                    fontSize: 14,
                    marginTop: 4,
                    color: colors.text,
                },
                badgesRow: {
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 8,
                },
                badge: {
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor: colors.brandSubtle,
                },
                badgeText: {
                    fontSize: 12,
                    color: colors.brand,
                    fontWeight: "500",
                },
                section: {
                    marginTop: 12,
                },
                sectionTitle: {
                    fontSize: 12,
                    fontWeight: "700",
                    color: colors.textMuted,
                    textTransform: "uppercase",
                    marginBottom: 4,
                },
                kvLine: {
                    fontSize: 13,
                    color: colors.text,
                    lineHeight: 18,
                },
                muted: {
                    fontSize: 13,
                    color: colors.textMuted,
                    lineHeight: 18,
                },
                eventCard: {
                    marginTop: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 6,
                    backgroundColor: colors.surfaceRaised,
                    borderLeftWidth: 3,
                },
                eventTitle: {
                    fontSize: 13,
                    fontWeight: "600",
                    color: colors.text,
                },
                eventReason: {
                    fontSize: 12,
                    color: colors.textMuted,
                    marginTop: 2,
                },
                subListLine: {
                    fontSize: 12,
                    color: colors.textMuted,
                    marginTop: 2,
                    marginLeft: 8,
                },
            }),
        [colors]
    )

    const itemsUsedCount = record.itemsUsed.length

    return (
        <Pressable style={styles.container} onPress={() => setExpanded((v) => !v)}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Turn {record.dayNumber}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {!!record.dateText && <Text style={styles.date}>{record.dateText}</Text>}
                    <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                </View>
            </View>
            <Text style={styles.summary}>{summarize(record)}</Text>
            <View style={styles.badgesRow}>
                {record.state.energy && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>Energy {record.state.energy}</Text>
                    </View>
                )}
                {record.state.mood && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>Mood {record.state.mood}</Text>
                    </View>
                )}
                {itemsUsedCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {itemsUsedCount} item{itemsUsedCount === 1 ? "" : "s"} used
                        </Text>
                    </View>
                )}
            </View>

            {expanded && (
                <>
                    <StateSection record={record} styles={styles} colors={colors} />
                    {Object.keys(record.settings).length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Settings</Text>
                            {Object.entries(record.settings).map(([key, value]) => (
                                <Text key={key} style={styles.kvLine}>
                                    {key} = {value}
                                </Text>
                            ))}
                        </View>
                    )}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Items Used</Text>
                        {record.itemsUsed.length === 0 ? (
                            <Text style={styles.muted}>None</Text>
                        ) : (
                            record.itemsUsed.map((item, idx) => (
                                <Text key={`${item.name}-${idx}`} style={styles.kvLine}>
                                    • {item.name}
                                    {item.reason ? `: ${item.reason}` : ""}
                                </Text>
                            ))
                        )}
                    </View>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Decision Events</Text>
                        {record.events.length === 0 ? (
                            <Text style={styles.muted}>No decision events recorded.</Text>
                        ) : (
                            record.events.map((event, idx) => <EventBlock key={idx} event={event} styles={styles} colors={colors} />)
                        )}
                    </View>
                </>
            )}
        </Pressable>
    )
}

/** Renders the State section (energy, mood, negative statuses, campaign-specific extras, and decision-relevant inventory). */
const StateSection: React.FC<{ record: DecisionReportRecord; styles: any; colors: any }> = ({ record, styles }) => {
    const { state } = record
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>State</Text>
            <Text style={styles.kvLine}>Negative Statuses = {state.negativeStatuses.length === 0 ? "[]" : state.negativeStatuses.join(", ")}</Text>
            {Object.entries(state.extra).map(([key, value]) => (
                <Text key={key} style={styles.kvLine}>
                    {key} = {value}
                </Text>
            ))}
            {state.inventory.length > 0 && (
                <View style={{ marginTop: 6 }}>
                    {state.inventory.map((group) => (
                        <View key={group.group} style={{ marginBottom: 4 }}>
                            <Text style={[styles.kvLine, { fontWeight: "600" }]}>{group.group}</Text>
                            {group.items.map((item) => (
                                <Text key={item.name} style={styles.subListLine}>
                                    {item.name} = {item.count}
                                </Text>
                            ))}
                        </View>
                    ))}
                </View>
            )}
        </View>
    )
}

/** Renders a single decision event in a left-accented card, with formatting specific to its kind. */
const EventBlock: React.FC<{ event: DecisionEvent; styles: any; colors: any }> = ({ event, styles, colors }) => {
    switch (event.kind) {
        case "action":
            return (
                <View style={[styles.eventCard, { borderLeftColor: colors.brand }]}>
                    <Text style={styles.eventTitle}>Action: {event.chosen}</Text>
                    <Text style={styles.eventReason}>{event.reason}</Text>
                    {event.rejected.map((r, idx) => (
                        <Text key={idx} style={styles.subListLine}>
                            ✗ {r.action}: {r.reason}
                        </Text>
                    ))}
                </View>
            )
        case "item":
            return (
                <View style={[styles.eventCard, { borderLeftColor: colors.textMuted }]}>
                    <Text style={styles.eventTitle}>
                        {event.item} → {event.verdict}
                    </Text>
                    <Text style={styles.eventReason}>{event.reason}</Text>
                </View>
            )
        case "charm":
            return (
                <View style={[styles.eventCard, { borderLeftColor: colors.warning }]}>
                    <Text style={styles.eventTitle}>Good-Luck Charm: NOT QUEUED</Text>
                    {event.blockingGate && <Text style={styles.eventReason}>{event.blockingGate}</Text>}
                </View>
            )
        case "whistle":
            return (
                <View style={[styles.eventCard, { borderLeftColor: event.verdict === "USED" ? colors.success : colors.textMuted }]}>
                    <Text style={styles.eventTitle}>Reset Whistle: {event.verdict}</Text>
                    <Text style={styles.eventReason}>{event.reason}</Text>
                    {event.postRollSelection && <Text style={styles.eventReason}>Post-roll selection: {event.postRollSelection}</Text>}
                </View>
            )
        case "training":
            return (
                <View style={[styles.eventCard, { borderLeftColor: colors.brand }]}>
                    <Text style={styles.eventTitle}>
                        Training selected: {event.selected ?? "NONE"} (source={event.source || "unset"})
                    </Text>
                    <Text style={styles.eventReason}>{event.reason}</Text>
                    {(event.pickFailureChance !== undefined || event.pickGains) && (
                        <Text style={styles.eventReason}>
                            {event.pickFailureChance !== undefined ? `fail=${event.pickFailureChance}%` : ""}
                            {event.pickFailureChance !== undefined && event.pickGains ? ", " : ""}
                            {event.pickGains ? `gains=${event.pickGains}` : ""}
                        </Text>
                    )}
                    {event.runnerUps.map((ru, idx) => (
                        <Text key={idx} style={styles.subListLine}>
                            {ru.rejected ? "✗" : "•"} {ru.stat}
                            {ru.score !== undefined ? ` score=${ru.score}` : ""}
                            {ru.failureChance !== undefined ? ` fail=${ru.failureChance}%` : ""}
                            {ru.gains ? ` gains=${ru.gains}` : ""} — {ru.reason}
                        </Text>
                    ))}
                </View>
            )
        case "raceEligibility":
            return (
                <View style={[styles.eventCard, { borderLeftColor: event.eligible ? colors.success : colors.error }]}>
                    <Text style={styles.eventTitle}>Race Eligibility: {event.eligible ? "ELIGIBLE" : "NOT ELIGIBLE"}</Text>
                    <Text style={styles.eventReason}>{event.reason}</Text>
                </View>
            )
        case "note":
            return (
                <View style={[styles.eventCard, { borderLeftColor: colors.textMuted }]}>
                    <Text style={styles.eventReason}>{event.message}</Text>
                </View>
            )
        case "recovery":
            return (
                <View style={[styles.eventCard, { borderLeftColor: colors.warning }]}>
                    <Text style={styles.eventTitle}>Recovery executed: {event.action}</Text>
                    <Text style={styles.eventReason}>{event.reason}</Text>
                </View>
            )
        default:
            return null
    }
}

export default ReportCard
