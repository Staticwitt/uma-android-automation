import React, { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { useTheme } from "../../context/ThemeContext"
import { ALL_STAT_NAMES, StatName } from "../../lib/training/scoring"
import { SPACING } from "../../lib/spacing"
import { TYPE } from "../../lib/type"
import { Text } from "../ui/text"
import { Stepper } from "../ui/stepper"
import { SandboxScenario, ScenarioAction } from "./scenarioState"

const STAT_LABELS: Record<StatName, string> = {
    [StatName.SPEED]: "Speed",
    [StatName.STAMINA]: "Stamina",
    [StatName.POWER]: "Power",
    [StatName.GUTS]: "Guts",
    [StatName.WIT]: "Wit",
}

/**
 * Map a cumulative stat value (0-1200) to an in-game letter grade. Thresholds: <300 E, <600 D, <900 C, <1100 B, <1200 A, otherwise S.
 *
 * @param v Cumulative stat value.
 * @returns Single-letter grade.
 */
function gradeForValue(v: number): string {
    if (v < 300) return "E"
    if (v < 600) return "D"
    if (v < 900) return "C"
    if (v < 1100) return "B"
    if (v < 1200) return "A"
    return "S"
}

/** Props for `StatTable`. */
export interface StatTableProps {
    /** Current sandbox scenario state. */
    scenario: SandboxScenario
    /** Reducer dispatch used to mutate the scenario. */
    dispatch: React.Dispatch<ScenarioAction>
}

/**
 * Horizontal 5-cell stat summary row. Each cell shows the per-training stat gain (green +N stepper), the stat name, and the trainee's
 * cumulative total (0-1200) with a letter-grade chip. The stat gain column tracks the currently selected training so users can dial each
 * column without leaving the editor strip.
 *
 * @param props See `StatTableProps`.
 * @returns A row with 5 stat cells separated by hairline borders.
 */
export function StatTable({ scenario, dispatch }: StatTableProps): React.ReactElement {
    const { colors } = useTheme()
    const selected = scenario.selectedTraining
    const current = scenario.trainings[selected]

    const styles = useMemo(
        () =>
            StyleSheet.create({
                root: {
                    flexDirection: "row",
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.borderHair,
                },
                cell: {
                    flex: 1,
                    paddingVertical: SPACING.sm,
                    paddingHorizontal: SPACING.xs,
                    alignItems: "center",
                    gap: 4,
                    borderRightWidth: StyleSheet.hairlineWidth,
                    borderRightColor: colors.borderHair,
                },
                cellLast: {
                    borderRightWidth: 0,
                },
                statName: {
                    ...TYPE.caption,
                    color: colors.textMuted,
                    fontWeight: "600",
                },
                gradeRow: {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                },
                grade: {
                    minWidth: 22,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 999,
                    backgroundColor: colors.brandSubtle,
                    color: colors.brand,
                    fontWeight: "700",
                    fontSize: 12,
                    textAlign: "center",
                    overflow: "hidden",
                },
            }),
        [colors]
    )

    return (
        <View style={styles.root}>
            {ALL_STAT_NAMES.map((stat, idx) => {
                const gain = current.statGains[stat] ?? 0
                const total = scenario.traineeTotals[stat] ?? 0
                const isLast = idx === ALL_STAT_NAMES.length - 1
                return (
                    <View key={stat} style={[styles.cell, isLast && styles.cellLast]}>
                        <Stepper value={gain} onChange={(v) => dispatch({ type: "set-stat-gain", training: selected, stat, value: v })} min={0} step={1} accent="green" />
                        <Text style={styles.statName}>{STAT_LABELS[stat]}</Text>
                        <View style={styles.gradeRow}>
                            <Text style={styles.grade}>{gradeForValue(total)}</Text>
                            <Stepper value={total} onChange={(v) => dispatch({ type: "set-trainee-total", stat, value: v })} min={0} max={1200} step={10} />
                        </View>
                    </View>
                )
            })}
        </View>
    )
}

export default StatTable
