import { useMemo } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { getAptitudeGradeColor } from "../lib/aptitudeGrade"
import { formatParentRunTimestamp, formatFanClassLabel, type ParentRunArchiveEntry } from "../lib/parentRunArchive"
import { formatQualityLabel, scoreParentRunArchiveEntry } from "../lib/parentQuality"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

interface RunComparisonViewProps {
    runs: ParentRunArchiveEntry[]
}

const LABEL_WIDTH = 110
const COLUMN_WIDTH = 130

type StatKey = "speed" | "stamina" | "power" | "guts" | "wit"
const STAT_ROWS: { label: string; key: StatKey }[] = [
    { label: "Speed", key: "speed" },
    { label: "Stamina", key: "stamina" },
    { label: "Power", key: "power" },
    { label: "Guts", key: "guts" },
    { label: "Wit", key: "wit" },
]

const APTITUDE_ROWS: { label: string; group: "distanceAptitudes" | "surfaceAptitudes" | "styleAptitudes"; key: string }[] = [
    { label: "Sprint", group: "distanceAptitudes", key: "SPRINT" },
    { label: "Mile", group: "distanceAptitudes", key: "MILE" },
    { label: "Medium", group: "distanceAptitudes", key: "MEDIUM" },
    { label: "Long", group: "distanceAptitudes", key: "LONG" },
    { label: "Turf", group: "surfaceAptitudes", key: "TURF" },
    { label: "Dirt", group: "surfaceAptitudes", key: "DIRT" },
    { label: "Front Runner", group: "styleAptitudes", key: "FRONT_RUNNER" },
    { label: "Pace Chaser", group: "styleAptitudes", key: "PACE_CHASER" },
    { label: "Late Surger", group: "styleAptitudes", key: "LATE_SURGER" },
    { label: "End Closer", group: "styleAptitudes", key: "END_CLOSER" },
]

/**
 * Renders archived parent runs side by side: identity/quality/fans, stat lines (best value bolded
 * in brand color), aptitude grades (colored via the same heatmap palette), and epithet outcomes.
 * Used by the Career Runs sheet's "Compare runs" mode.
 */
export const RunComparisonView = ({ runs }: RunComparisonViewProps) => {
    const { colors } = useTheme()

    const styles = useMemo(
        () =>
            StyleSheet.create({
                container: { flexDirection: "row" },
                labelColumn: { width: LABEL_WIDTH },
                sectionLabel: { ...TYPE.caption, color: colors.textMuted, fontWeight: "700", marginTop: SPACING.md, marginBottom: SPACING.xs },
                sectionSpacer: { height: 36 },
                labelCell: { height: 28, justifyContent: "center" },
                labelText: { ...TYPE.caption, color: colors.textMuted },
                column: { width: COLUMN_WIDTH, paddingHorizontal: SPACING.xs },
                headerCell: { height: 36, justifyContent: "flex-end", paddingBottom: 4 },
                headerName: { ...TYPE.body, color: colors.text, fontWeight: "700" },
                headerMeta: { ...TYPE.caption, color: colors.textMuted },
                valueCell: { height: 28, justifyContent: "center" },
                valueText: { ...TYPE.caption, color: colors.text },
                valueBest: { color: colors.brand, fontWeight: "700" },
                gradeCell: {
                    height: 28,
                    marginVertical: 1,
                    borderRadius: RADII.sm,
                    alignItems: "center",
                    justifyContent: "center",
                },
                gradeText: { ...TYPE.caption, fontWeight: "700" },
                epithetText: { ...TYPE.caption, color: colors.textMuted, lineHeight: 16 },
                empty: { ...TYPE.body, color: colors.textMuted, textAlign: "center", marginTop: SPACING.lg },
            }),
        [colors],
    )

    if (runs.length === 0) {
        return <Text style={styles.empty}>Select at least one run to compare.</Text>
    }

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={styles.container}>
                <View style={styles.labelColumn}>
                    <View style={styles.sectionSpacer} />
                    <View style={styles.labelCell}>
                        <Text style={styles.labelText}>Quality</Text>
                    </View>
                    <View style={styles.labelCell}>
                        <Text style={styles.labelText}>Fans</Text>
                    </View>
                    <View style={styles.labelCell}>
                        <Text style={styles.labelText}>Race W/L</Text>
                    </View>
                    <Text style={styles.sectionLabel}>Stats</Text>
                    {STAT_ROWS.map((row) => (
                        <View key={row.key} style={styles.labelCell}>
                            <Text style={styles.labelText}>{row.label}</Text>
                        </View>
                    ))}
                    <Text style={styles.sectionLabel}>Aptitudes</Text>
                    {APTITUDE_ROWS.map((row) => (
                        <View key={row.label} style={styles.labelCell}>
                            <Text style={styles.labelText}>{row.label}</Text>
                        </View>
                    ))}
                    <Text style={styles.sectionLabel}>Epithets</Text>
                    <View style={styles.labelCell}>
                        <Text style={styles.labelText}>Completed</Text>
                    </View>
                    <View style={styles.labelCell}>
                        <Text style={styles.labelText}>Missed</Text>
                    </View>
                </View>
                {runs.map((run) => {
                    const quality = scoreParentRunArchiveEntry(run)
                    const isStatBest = (key: StatKey) => runs.every((other) => other.id === run.id || run.stats[key] >= other.stats[key])
                    return (
                        <View key={run.id} style={styles.column}>
                            <View style={styles.headerCell}>
                                <Text style={styles.headerName} numberOfLines={1}>
                                    {run.traineeName || run.characterPreset || "Unknown"}
                                </Text>
                                <Text style={styles.headerMeta} numberOfLines={1}>
                                    {formatParentRunTimestamp(run.completedAtMs)}
                                </Text>
                            </View>
                            <View style={styles.valueCell}>
                                <Text style={styles.valueText}>{formatQualityLabel(quality)}</Text>
                            </View>
                            <View style={styles.valueCell}>
                                <Text style={styles.valueText}>
                                    {run.fans.toLocaleString()} ({formatFanClassLabel(run.fanClass)})
                                </Text>
                            </View>
                            <View style={styles.valueCell}>
                                <Text style={styles.valueText}>
                                    {run.raceWins}W/{run.raceLosses}L
                                </Text>
                            </View>
                            <Text style={styles.sectionLabel}> </Text>
                            {STAT_ROWS.map((row) => {
                                const best = runs.length > 1 && isStatBest(row.key)
                                return (
                                    <View key={row.key} style={styles.valueCell}>
                                        <Text style={[styles.valueText, best && styles.valueBest]}>{run.stats[row.key]}</Text>
                                    </View>
                                )
                            })}
                            <Text style={styles.sectionLabel}> </Text>
                            {APTITUDE_ROWS.map((row) => {
                                const grade = run[row.group]?.[row.key as never]
                                const { bg, text } = getAptitudeGradeColor(grade)
                                return (
                                    <View key={row.label} style={[styles.gradeCell, { backgroundColor: bg }]}>
                                        <Text style={[styles.gradeText, { color: text }]}>{grade ?? "—"}</Text>
                                    </View>
                                )
                            })}
                            <Text style={styles.sectionLabel}> </Text>
                            <Text style={styles.epithetText}>{run.completedTargetEpithets.join(", ") || "none"}</Text>
                            <Text style={styles.epithetText}>{run.incompleteTargetEpithets.join(", ") || "none"}</Text>
                        </View>
                    )
                })}
            </View>
        </ScrollView>
    )
}

export default RunComparisonView
