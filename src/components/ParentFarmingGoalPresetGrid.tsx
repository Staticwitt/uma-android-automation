import { useMemo } from "react"
import { View, Text, Pressable, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { PARENT_FARMING_GOAL_PRESETS, type ParentFarmingGoalPreset } from "../lib/parentFarmingGoalPresets"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

interface ParentFarmingGoalPresetGridProps {
    allowedEpithetNames: Set<string>
    onApply: (preset: ParentFarmingGoalPreset) => void
}

/**
 * Grid of parent-farming goal presets with per-scenario epithet eligibility counts.
 */
export const ParentFarmingGoalPresetGrid = ({ allowedEpithetNames, onApply }: ParentFarmingGoalPresetGridProps) => {
    const { colors } = useTheme()

    const styles = useMemo(
        () =>
            StyleSheet.create({
                description: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18, marginBottom: SPACING.sm },
                grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
                card: {
                    flexBasis: "48%",
                    flexGrow: 1,
                    minHeight: 104,
                    padding: SPACING.md,
                    borderRadius: RADII.md,
                    borderWidth: 1,
                    borderColor: colors.borderHair,
                    backgroundColor: colors.surface,
                },
                title: { ...TYPE.body, color: colors.text, fontWeight: "700", marginBottom: SPACING.xs },
                body: { ...TYPE.caption, color: colors.textMuted, lineHeight: 17 },
                count: { ...TYPE.monoLabel, color: colors.brand, marginTop: SPACING.sm },
            }),
        [colors]
    )

    return (
        <View>
            <Text style={styles.description}>
                Adds target epithets, solver weights, and goal-aligned training. Existing hand-picked epithets are preserved when merging.
            </Text>
            <View style={styles.grid}>
                {PARENT_FARMING_GOAL_PRESETS.map((preset) => {
                    const eligibleTargets = preset.targetEpithets.filter((name) => allowedEpithetNames.has(name)).length
                    const totalTargets = preset.targetEpithets.length
                    return (
                        <Pressable
                            key={preset.key}
                            style={styles.card}
                            onPress={() => onApply(preset)}
                            android_ripple={{ color: colors.ripple, foreground: true }}
                            accessibilityRole="button"
                        >
                            <Text style={styles.title}>{preset.label}</Text>
                            <Text style={styles.body}>{preset.description}</Text>
                            <Text style={styles.count}>
                                Adds {eligibleTargets}/{totalTargets} visible target{totalTargets === 1 ? "" : "s"}
                            </Text>
                        </Pressable>
                    )
                })}
            </View>
        </View>
    )
}
