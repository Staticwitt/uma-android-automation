import { useMemo } from "react"
import { View, Text, StyleSheet, Pressable } from "react-native"
import { useTheme } from "../context/ThemeContext"
import type { Settings } from "../context/BotStateContext"
import { formatSparkStrategyLabel } from "../lib/sparkSelection"
import { buildEpithetTiersFromRacing, formatEpithetTierSummary } from "../lib/epithetTiers"
import { formatLegacyParentStrategyLabel } from "../lib/legacyParentSelection"
import { gradeFromScore } from "../lib/parentQuality"
import { ParentFarmingSolverPreview } from "./ParentFarmingSolverPreview"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

const parseStringList = (json: string | undefined): string[] => {
    try {
        const parsed = JSON.parse(json || "[]")
        return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string" && value.length > 0) : []
    } catch {
        return []
    }
}

interface ParentFarmingGoalProgressCardProps {
    settings: Settings
    onOpenSolver?: () => void
    onReSyncPreset?: () => void
    showReSync?: boolean
}

/**
 * Strategic snapshot of active epithet targets, solver floor, and inheritance strategy.
 */
export const ParentFarmingGoalProgressCard = ({
    settings,
    onOpenSolver,
    onReSyncPreset,
    showReSync = false,
}: ParentFarmingGoalProgressCardProps) => {
    const { colors } = useTheme()
    const { racing, training } = settings

    const targetEpithets = useMemo(() => parseStringList(racing.smartRaceSolverTargetEpithets), [racing.smartRaceSolverTargetEpithets])
    const forcedEpithets = useMemo(() => parseStringList(racing.smartRaceSolverForcedEpithets), [racing.smartRaceSolverForcedEpithets])
    const epithetTierSummary = useMemo(() => formatEpithetTierSummary(buildEpithetTiersFromRacing(racing)), [racing])

    const solverWeights = useMemo(() => {
        try {
            return JSON.parse(racing.smartRaceSolverWeights || "{}") as Record<string, number>
        } catch {
            return {} as Record<string, number>
        }
    }, [racing.smartRaceSolverWeights])

    const minimumFanTarget = typeof solverWeights.minimumFanTarget === "number" ? solverWeights.minimumFanTarget : 0
    const fanWeight = typeof solverWeights.fanWeight === "number" ? solverWeights.fanWeight : 0
    const targetMultiplier = typeof solverWeights.targetEpithetMultiplier === "number" ? solverWeights.targetEpithetMultiplier : 3

    const styles = useMemo(
        () =>
            StyleSheet.create({
                root: {
                    marginHorizontal: SPACING.md,
                    marginBottom: SPACING.md,
                    padding: SPACING.md,
                    borderRadius: RADII.lg,
                    borderWidth: 1,
                    borderColor: colors.borderHair,
                    backgroundColor: colors.surface,
                    gap: SPACING.sm,
                },
                title: { ...TYPE.monoLabel, color: colors.textMuted, fontWeight: "700" },
                row: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18 },
                emphasis: { ...TYPE.body, color: colors.text, fontWeight: "600" },
                chipRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs },
                chip: {
                    paddingVertical: 2,
                    paddingHorizontal: SPACING.sm,
                    borderRadius: RADII.sm,
                    borderWidth: 1,
                    borderColor: colors.brandBorder,
                    backgroundColor: colors.brandSubtle,
                },
                forcedChip: {
                    borderColor: colors.warning ?? colors.borderHair,
                    backgroundColor: colors.surfaceRaised,
                },
                chipText: { ...TYPE.caption, color: colors.brand, fontWeight: "600" },
                forcedText: { color: colors.warning ?? colors.text },
                actions: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginTop: SPACING.xs },
                action: {
                    paddingVertical: SPACING.sm,
                    paddingHorizontal: SPACING.md,
                    borderRadius: RADII.md,
                    borderWidth: 1,
                    borderColor: colors.borderHair,
                },
                actionPrimary: {
                    borderColor: colors.brandBorder,
                    backgroundColor: colors.brandSubtle,
                },
                actionText: { ...TYPE.caption, color: colors.text, fontWeight: "600" },
                actionTextPrimary: { color: colors.brand },
            }),
        [colors],
    )

    if (!racing.enableParentFarmingMode) return null

    return (
        <View style={styles.root}>
            <Text style={styles.title}>STRATEGIC GOAL</Text>
            <Text style={styles.row}>
                Solver: fan weight {fanWeight.toFixed(1)} · floor {minimumFanTarget > 0 ? minimumFanTarget.toLocaleString() : "none"} · target epithet ×
                {targetMultiplier}
            </Text>
            <Text style={styles.row}>Sparks: {formatSparkStrategyLabel(racing.sparkSelectionStrategy)}</Text>
            <Text style={styles.row}>
                Legacy parents: {formatLegacyParentStrategyLabel(racing.legacyParentSelectionStrategy)}
            </Text>
            <Text style={styles.row}>Epithet tiers: {epithetTierSummary}</Text>
            {racing.enableParentFarmingStopOnQualityTarget ? (
                <Text style={styles.row}>Multi-run quality target: grade ≥ {gradeFromScore(racing.parentFarmingQualityTargetScore)} (stop early)</Text>
            ) : null}
            <Text style={styles.row}>
                Training: {training.preferredDistanceOverride === "Default" ? "Auto" : training.preferredDistanceOverride || "Auto"} · stat targets{" "}
                {training.disableStatTargets ? "off" : "on"}
            </Text>
            <Text style={styles.emphasis}>
                {targetEpithets.length} target epithet{targetEpithets.length === 1 ? "" : "s"}
                {forcedEpithets.length > 0 ? ` · ${forcedEpithets.length} forced` : ""}
            </Text>
            {targetEpithets.length > 0 && (
                <View style={styles.chipRow}>
                    {targetEpithets.slice(0, 8).map((name) => (
                        <View key={name} style={styles.chip}>
                            <Text style={styles.chipText}>{name}</Text>
                        </View>
                    ))}
                    {targetEpithets.length > 8 ? <Text style={styles.row}>+{targetEpithets.length - 8} more</Text> : null}
                </View>
            )}
            {forcedEpithets.length > 0 && (
                <View style={styles.chipRow}>
                    {forcedEpithets.map((name) => (
                        <View key={`forced-${name}`} style={[styles.chip, styles.forcedChip]}>
                            <Text style={[styles.chipText, styles.forcedText]}>{name}</Text>
                        </View>
                    ))}
                </View>
            )}
            <ParentFarmingSolverPreview settings={settings} onOpenSolver={onOpenSolver} />
            <Text style={styles.row}>
                Parent quality is scored after each career (epithets 40% · fans 25% · forced routes 20% · race WR 10% · extras 5%). Compare runs in history.
            </Text>
            {(onOpenSolver || (showReSync && onReSyncPreset)) && (
                <View style={styles.actions}>
                    {onOpenSolver ? (
                        <Pressable onPress={onOpenSolver} style={[styles.action, styles.actionPrimary]} accessibilityRole="button">
                            <Text style={[styles.actionText, styles.actionTextPrimary]}>Open solver calendar</Text>
                        </Pressable>
                    ) : null}
                    {showReSync && onReSyncPreset ? (
                        <Pressable onPress={onReSyncPreset} style={styles.action} accessibilityRole="button">
                            <Text style={styles.actionText}>Re-sync from preset</Text>
                        </Pressable>
                    ) : null}
                </View>
            )}
        </View>
    )
}
