import { useMemo } from "react"
import { View, Text, Pressable, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"
import {
    countEligibleBundleTargetEpithets,
    PARENT_FARMING_CHARACTER_BUNDLES,
    type ParentFarmingCharacterBundle,
} from "../lib/parentFarmingCharacterBundles"
import { findParentFarmingGoalPreset } from "../lib/parentFarmingGoalPresets"
import { applyParentFarmingCharacterBundle } from "../lib/parentFarmingResolver"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

interface ParentFarmingBundleGridProps {
    scenario: string
    onApply: (bundle: ParentFarmingCharacterBundle) => void
}

/**
 * Grid of one-tap parent-farming character + goal bundles.
 */
export const ParentFarmingBundleGrid = ({ scenario, onApply }: ParentFarmingBundleGridProps) => {
    const { colors } = useTheme()

    const styles = useMemo(
        () =>
            StyleSheet.create({
                description: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18, marginBottom: SPACING.sm },
                grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
                card: {
                    flexBasis: "48%",
                    flexGrow: 1,
                    minHeight: 112,
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
                One tap applies Parent Farming Mode, the character preset and aptitudes, goal epithets and solver weights, and training distance bias. Manual race locks are cleared.
            </Text>
            <View style={styles.grid}>
                {PARENT_FARMING_CHARACTER_BUNDLES.map((bundle) => {
                    const goalPreset = findParentFarmingGoalPreset(bundle.goalPresetKey)
                    const eligibleTargets = countEligibleBundleTargetEpithets(bundle, scenario)
                    const totalTargets = goalPreset?.targetEpithets.length ?? 0
                    return (
                        <Pressable
                            key={bundle.key}
                            style={styles.card}
                            onPress={() => onApply(bundle)}
                            android_ripple={{ color: colors.ripple, foreground: true }}
                            accessibilityRole="button"
                        >
                            <Text style={styles.title}>{bundle.label}</Text>
                            <Text style={styles.body}>{bundle.description}</Text>
                            <Text style={styles.count}>
                                {eligibleTargets}/{totalTargets} target epithet{totalTargets === 1 ? "" : "s"} for current scenario
                            </Text>
                        </Pressable>
                    )
                })}
            </View>
        </View>
    )
}

/** Applies a character bundle to the full settings object. */
export const applyCharacterBundleToSettings = applyParentFarmingCharacterBundle
