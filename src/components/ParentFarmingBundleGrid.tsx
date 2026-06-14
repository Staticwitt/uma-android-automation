import { useMemo } from "react"
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

interface ParentFarmingBundleGridProps {
    scenario: string
    supportBorrowOverrides: ParentFarmingSupportBorrowOverrides
    onApply: (bundle: ParentFarmingCharacterBundle) => void
    onEditSupports: (bundle: ParentFarmingCharacterBundle) => void
    /** When true, omits the intro paragraph (parent section already explained). */
    hideIntro?: boolean
}

/**
 * Grid of one-tap parent-farming character + goal bundles with per-bundle support borrow editor.
 */
export const ParentFarmingBundleGrid = ({ scenario, supportBorrowOverrides, onApply, onEditSupports, hideIntro = false }: ParentFarmingBundleGridProps) => {
    const { colors } = useTheme()

    const styles = useMemo(
        () =>
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
            }),
        [colors]
    )

    return (
        <View>
            {!hideIntro && (
                <Text style={styles.description}>
                    Tap a card to apply the bundle. Tap the people icon to set friend support borrow order for that parent. Manual race locks are cleared on apply.
                </Text>
            )}
            <View style={styles.grid}>
                {PARENT_FARMING_CHARACTER_BUNDLES.map((bundle) => {
                    const goalPreset = findParentFarmingGoalPreset(bundle.goalPresetKey)
                    const eligibleTargets = countEligibleBundleTargetEpithets(bundle, scenario)
                    const totalTargets = goalPreset?.targetEpithets.length ?? 0
                    const supports = resolveSupportBorrowCardsForBundle(bundle, supportBorrowOverrides)
                    return (
                        <Pressable
                            key={bundle.key}
                            style={styles.card}
                            onPress={() => onApply(bundle)}
                            android_ripple={{ color: colors.ripple, foreground: true }}
                            accessibilityRole="button"
                        >
                            <View style={styles.titleRow}>
                                <Text style={styles.title}>{bundle.label}</Text>
                                <Pressable
                                    style={styles.supportButton}
                                    onPress={() => onEditSupports(bundle)}
                                    android_ripple={{ color: colors.ripple, foreground: true }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Edit support cards for ${bundle.label}`}
                                >
                                    <Ionicons name="people-outline" size={18} color={colors.brand} />
                                </Pressable>
                            </View>
                            <Text style={styles.body}>{bundle.description}</Text>
                            <Text style={styles.supports}>Supports: {formatSupportBorrowPreview(supports)}</Text>
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

/** Parses overrides JSON for grid consumers. */
export const readSupportBorrowOverrides = (json: string | undefined): ParentFarmingSupportBorrowOverrides =>
    parseSupportBorrowOverrides(json)
