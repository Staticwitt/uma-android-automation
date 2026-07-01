import { useMemo } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { getAptitudeGradeColor, APTITUDE_DIMENSION_ROWS } from "../lib/aptitudeGrade"
import type { ParentRunArchiveEntry } from "../lib/parentRunArchive"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

interface AptitudeHeatmapProps {
    runs: ParentRunArchiveEntry[]
}

const ROW_HEIGHT = 28
const LABEL_WIDTH = 100
const CELL_WIDTH = 56


/**
 * Renders a green-to-red heatmap grid of aptitude grades (distance/surface/running style) across
 * archived parent runs, so trends and outliers are visible at a glance. Aptitude dimensions are
 * fixed rows on the left; each run is a horizontally-scrollable column.
 */
export const AptitudeHeatmap = ({ runs }: AptitudeHeatmapProps) => {
    const { colors } = useTheme()

    const styles = useMemo(
        () =>
            StyleSheet.create({
                container: { flexDirection: "row" },
                labelColumn: { width: LABEL_WIDTH },
                headerSpacer: { height: ROW_HEIGHT, justifyContent: "center" },
                labelCell: { height: ROW_HEIGHT, justifyContent: "center" },
                labelText: { ...TYPE.caption, color: colors.textMuted },
                runColumn: { width: CELL_WIDTH },
                runHeaderCell: { height: ROW_HEIGHT, justifyContent: "center", alignItems: "center", paddingHorizontal: 2 },
                runHeaderText: { ...TYPE.caption, color: colors.textMuted, fontSize: 10, textAlign: "center" },
                gradeCell: {
                    height: ROW_HEIGHT,
                    marginVertical: 1,
                    marginHorizontal: 2,
                    borderRadius: RADII.sm,
                    alignItems: "center",
                    justifyContent: "center",
                },
                gradeText: { ...TYPE.caption, fontWeight: "700" },
                empty: { ...TYPE.body, color: colors.textMuted, textAlign: "center", marginTop: SPACING.lg },
            }),
        [colors],
    )

    if (runs.length === 0) {
        return <Text style={styles.empty}>No parent runs saved yet.</Text>
    }

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={styles.container}>
                <View style={styles.labelColumn}>
                    <View style={styles.headerSpacer} />
                    {APTITUDE_DIMENSION_ROWS.map((row) => (
                        <View key={row.label} style={styles.labelCell}>
                            <Text style={styles.labelText}>{row.label}</Text>
                        </View>
                    ))}
                </View>
                {runs.map((run) => {
                    const columnLabel = run.traineeName || run.characterPreset || "Unknown"
                    return (
                        <View key={run.id} style={styles.runColumn}>
                            <View style={styles.runHeaderCell}>
                                <Text style={styles.runHeaderText} numberOfLines={2}>
                                    {columnLabel}
                                </Text>
                            </View>
                            {APTITUDE_DIMENSION_ROWS.map((row) => {
                                const grade = run[row.group]?.[row.key as never]
                                const { bg, text } = getAptitudeGradeColor(grade)
                                return (
                                    <View key={row.label} style={[styles.gradeCell, { backgroundColor: bg }]}>
                                        <Text style={[styles.gradeText, { color: text }]}>{grade ?? "—"}</Text>
                                    </View>
                                )
                            })}
                        </View>
                    )
                })}
            </View>
        </ScrollView>
    )
}

export default AptitudeHeatmap
