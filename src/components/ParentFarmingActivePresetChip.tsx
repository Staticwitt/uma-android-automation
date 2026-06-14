import { useMemo } from "react"
import { View, Text, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"
import type { Settings } from "../context/BotStateContext"
import { getParentFarmingActiveLabels, formatParentFarmingTrainingBias } from "../lib/parentFarmingDrift"
import { formatSupportBorrowPreview, resolveActiveSupportBorrowCards } from "../lib/parentFarmingSupportBorrow"
import { formatSparkStrategyLabel } from "../lib/sparkSelection"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

interface ParentFarmingActivePresetChipProps {
    settings: Settings
}

/**
 * Read-only summary of the active parent-farming bundle, goal preset, and training bias.
 */
export const ParentFarmingActivePresetChip = ({ settings }: ParentFarmingActivePresetChipProps) => {
    const { colors } = useTheme()
    const { bundleLabel, goalPresetLabel } = getParentFarmingActiveLabels(settings)

    const styles = useMemo(
        () =>
            StyleSheet.create({
                root: {
                    marginHorizontal: SPACING.md,
                    marginBottom: SPACING.md,
                    padding: SPACING.md,
                    borderRadius: RADII.lg,
                    borderWidth: 1,
                    borderColor: colors.brand,
                    backgroundColor: colors.brandSubtle,
                    gap: SPACING.xs,
                },
                title: { ...TYPE.monoLabel, color: colors.brand, fontWeight: "700" },
                line: { ...TYPE.body, color: colors.text, fontWeight: "600" },
                muted: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18 },
            }),
        [colors]
    )

    if (!settings.racing.enableParentFarmingMode) {
        return null
    }

    const primaryLabel = bundleLabel || goalPresetLabel || "No preset selected"
    const secondary =
        bundleLabel && goalPresetLabel && bundleLabel !== goalPresetLabel ? `Goal: ${goalPresetLabel}` : undefined
    const supports = resolveActiveSupportBorrowCards(settings)
    const sparkLabel = formatSparkStrategyLabel(settings.racing.sparkSelectionStrategy)

    return (
        <View style={styles.root}>
            <Text style={styles.title}>ACTIVE SETUP</Text>
            <Text style={styles.line}>{primaryLabel}</Text>
            {secondary ? <Text style={styles.muted}>{secondary}</Text> : null}
            <Text style={styles.muted}>Training: {formatParentFarmingTrainingBias(settings.training)}</Text>
            <Text style={styles.muted}>Sparks: {sparkLabel}</Text>
            <Text style={styles.muted}>Supports: {formatSupportBorrowPreview(supports)}</Text>
        </View>
    )
}
