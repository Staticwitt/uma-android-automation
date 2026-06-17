import React, { useMemo } from "react"
import { View, Text, Pressable, StyleSheet } from "react-native"
import Ionicons from "@react-native-vector-icons/ionicons"
import { useTheme } from "../context/ThemeContext"
import {
    countEligibleBundleTargetEpithets,
    PARENT_FARMING_CHARACTER_BUNDLES,
    type ParentFarmingCharacterBundle,
} from "../lib/parentFarmingCharacterBundles"
import { findParentFarmingGoalPreset } from "../lib/parentFarmingGoalPresets"
import {
    formatSupportBorrowPreview,
    parseSupportBorrowOverrides,
    resolveSupportBorrowCardsForBundle,
    type ParentFarmingSupportBorrowOverrides,
} from "../lib/parentFarmingSupportBorrow"
import { applyParentFarmingCharacterBundle } from "../lib/parentFarmingResolver"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"
import type { ThemeColors } from "../lib/theme"

interface ParentFarmingBundleGridProps {
    scenario: string
    supportBorrowOverrides: ParentFarmingSupportBorrowOverrides
    onApply: (bundle: ParentFarmingCharacterBundle) => void
    onEditSupports: (bundle: ParentFarmingCharacterBundle) => void
    /** When true, omits the intro paragraph (parent section already explained). */
    hideIntro?: boolean
}

interface BundleCardModel {
    bundle: ParentFarmingCharacterBundle
    eligibleTargets: number
    totalTargets: number
    supportsPreview: string
}

interface BundleCardProps {
    model: BundleCardModel
    onApply: (bundle: ParentFarmingCharacterBundle) => void
    onEditSupports: (bundle: ParentFarmingCharacterBundle) => void
    styles: ReturnType<typeof createStyles>
    rippleColor: string
    brandColor: string
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        description: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18, marginBottom: SPACING.sm },
        grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
        card: {
            flexBasis: "48%",
            flexGrow: 1,
            minHeight: 128,
            padding: SPACING.md,
            borderRadius: RADII.md,
            borderWidth: 1,
            borderColor: colors.borderHair,
            backgroundColor: colors.surface,
        },
        titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: SPACING.xs },
        title: { ...TYPE.body, color: colors.text, fontWeight: "700", marginBottom: SPACING.xs, flex: 1 },
        supportButton: {
            padding: 4,
            borderRadius: RADII.sm,
            borderWidth: 1,
            borderColor: colors.borderHair,
        },
        body: { ...TYPE.caption, color: colors.textMuted, lineHeight: 17 },
        supports: { ...TYPE.caption, color: colors.text, lineHeight: 17, marginTop: SPACING.xs },
        count: { ...TYPE.monoLabel, color: colors.brand, marginTop: SPACING.sm },
    })

const BundleCard = React.memo(({ model, onApply, onEditSupports, styles, rippleColor, brandColor }: BundleCardProps) => {
    const { bundle, eligibleTargets, totalTargets, supportsPreview } = model
    return (
        <Pressable
            style={styles.card}
            onPress={() => onApply(bundle)}
            android_ripple={{ color: rippleColor, foreground: true }}
            accessibilityRole="button"
        >
            <View style={styles.titleRow}>
                <Text style={styles.title}>{bundle.label}</Text>
                <Pressable
                    style={styles.supportButton}
                    onPress={() => onEditSupports(bundle)}
                    android_ripple={{ color: rippleColor, foreground: true }}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit support cards for ${bundle.label}`}
                >
                    <Ionicons name="people-outline" size={18} color={brandColor} />
                </Pressable>
            </View>
            <Text style={styles.body}>{bundle.description}</Text>
            <Text style={styles.supports}>Supports: {supportsPreview}</Text>
            <Text style={styles.count}>
                {eligibleTargets}/{totalTargets} target epithet{totalTargets === 1 ? "" : "s"} for current scenario
            </Text>
        </Pressable>
    )
})
BundleCard.displayName = "BundleCard"

/**
 * Grid of one-tap parent-farming character + goal bundles with per-bundle support borrow editor.
 */
export const ParentFarmingBundleGrid = React.memo(
    ({ scenario, supportBorrowOverrides, onApply, onEditSupports, hideIntro = false }: ParentFarmingBundleGridProps) => {
        const { colors } = useTheme()
        const styles = useMemo(() => createStyles(colors), [colors])

        const cards = useMemo<BundleCardModel[]>(
            () =>
                PARENT_FARMING_CHARACTER_BUNDLES.map((bundle) => {
                    const goalPreset = findParentFarmingGoalPreset(bundle.goalPresetKey)
                    const supports = resolveSupportBorrowCardsForBundle(bundle, supportBorrowOverrides)
                    return {
                        bundle,
                        eligibleTargets: countEligibleBundleTargetEpithets(bundle, scenario),
                        totalTargets: goalPreset?.targetEpithets.length ?? 0,
                        supportsPreview: formatSupportBorrowPreview(supports),
                    }
                }),
            [scenario, supportBorrowOverrides]
        )

        return (
            <View>
                {!hideIntro && (
                    <Text style={styles.description}>
                        Tap a card to apply the bundle. Tap the people icon to set friend support borrow order for that parent. Manual race locks are cleared on apply.
                    </Text>
                )}
                <View style={styles.grid}>
                    {cards.map((model) => (
                        <BundleCard
                            key={model.bundle.key}
                            model={model}
                            onApply={onApply}
                            onEditSupports={onEditSupports}
                            styles={styles}
                            rippleColor={colors.ripple}
                            brandColor={colors.brand}
                        />
                    ))}
                </View>
            </View>
        )
    }
)
ParentFarmingBundleGrid.displayName = "ParentFarmingBundleGrid"

/** Applies a character bundle to the full settings object. */
export const applyCharacterBundleToSettings = applyParentFarmingCharacterBundle

/** Parses overrides JSON for grid consumers. */
export const readSupportBorrowOverrides = (json: string | undefined): ParentFarmingSupportBorrowOverrides =>
    parseSupportBorrowOverrides(json)
