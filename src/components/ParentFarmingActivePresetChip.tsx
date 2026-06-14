import { useMemo } from "react"
import { View, Text, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"
import type { Settings } from "../context/BotStateContext"
import { getParentFarmingActiveLabels, formatParentFarmingTrainingBias } from "../lib/parentFarmingDrift"
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
                    borderRadius: RADII.md,
                    borderWidth: 1,
                    borderColor: colors.borderHair,
                    backgroundColor: colors.surface,
                },
                title: { ...TYPE.caption, color: colors.brand, fontWeight: "700", marginBottom: SPACING.xs },
                line: { ...TYPE.body, color: colors.text, marginBottom: 2 },
                muted: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18 },
            }),
        [colors]
    )

    if (!settings.racing.enableParentFarmingMode) {
        return null
    }

    const primaryLabel = bundleLabel || goalPresetLabel || "Parent farming (no preset label)"
    const secondary =
        bundleLabel && goalPresetLabel && bundleLabel !== goalPresetLabel ? `Goal: ${goalPresetLabel}` : undefined

    return (
        <View style={styles.root}>
            <Text style={styles.title}>ACTIVE PARENT SETUP</Text>
            <Text style={styles.line}>{primaryLabel}</Text>
            {secondary ? <Text style={styles.muted}>{secondary}</Text> : null}
            <Text style={styles.muted}>Training: {formatParentFarmingTrainingBias(settings.training)}</Text>
        </View>
    )
}
