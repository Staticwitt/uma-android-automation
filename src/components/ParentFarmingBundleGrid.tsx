import React, { useMemo } from "react"
import { View, Text, Pressable, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"
import {
    applyParentFarmingCharacterBundle,
    countEligibleBundleTargetEpithets,
    findParentFarmingGoalPreset,
    PARENT_FARMING_CHARACTER_BUNDLES,
    type ParentFarmingCharacterBundle,
} from "../lib/parentFarmingCharacterBundles"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"
import type { ThemeColors } from "../lib/theme"

interface ParentFarmingBundleGridProps {
    scenario: string
    onApply: (bundle: ParentFarmingCharacterBundle) => void
}

interface BundleCardModel {
    bundle: ParentFarmingCharacterBundle
    eligibleTargets: number
    totalTargets: number
}

interface BundleCardProps {
    model: BundleCardModel
    onApply: (bundle: ParentFarmingCharacterBundle) => void
    styles: ReturnType<typeof createStyles>
    rippleColor: string
}

const createStyles = (colors: ThemeColors) =>
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
    })

const BundleCard = React.memo(({ model, onApply, styles, rippleColor }: BundleCardProps) => {
    const { bundle, eligibleTargets, totalTargets } = model
    return (
        <Pressable
            style={styles.card}
            onPress={() => onApply(bundle)}
            android_ripple={{ color: rippleColor, foreground: true }}
            accessibilityRole="button"
        >
            <Text style={styles.title}>{bundle.label}</Text>
            <Text style={styles.body}>{bundle.description}</Text>
            <Text style={styles.count}>
                {eligibleTargets}/{totalTargets} target epithet{totalTargets === 1 ? "" : "s"} for current scenario
            </Text>
        </Pressable>
    )
})
BundleCard.displayName = "BundleCard"

/**
 * Grid of one-tap parent-farming character + goal bundles.
 */
export const ParentFarmingBundleGrid = React.memo(({ scenario, onApply }: ParentFarmingBundleGridProps) => {
    const { colors } = useTheme()
    const styles = useMemo(() => createStyles(colors), [colors])

    const cards = useMemo<BundleCardModel[]>(
        () =>
            PARENT_FARMING_CHARACTER_BUNDLES.map((bundle) => {
                const goalPreset = findParentFarmingGoalPreset(bundle.goalPresetKey)
                return {
                    bundle,
                    eligibleTargets: countEligibleBundleTargetEpithets(bundle, scenario),
                    totalTargets: goalPreset?.targetEpithets.length ?? 0,
                }
            }),
        [scenario]
    )

    return (
        <View>
            <Text style={styles.description}>
                One tap applies Parent Farming Mode, the character preset and aptitudes, goal epithets and solver weights, and training distance bias. Manual race locks are cleared.
            </Text>
            <View style={styles.grid}>
                {cards.map((model) => (
                    <BundleCard key={model.bundle.key} model={model} onApply={onApply} styles={styles} rippleColor={colors.ripple} />
                ))}
            </View>
        </View>
    )
})
ParentFarmingBundleGrid.displayName = "ParentFarmingBundleGrid"

/** Applies a character bundle to the full settings object. */
export const applyCharacterBundleToSettings = applyParentFarmingCharacterBundle
