import React, { useMemo } from "react"
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native"
import SearchableItem from "./SearchableItem"
import { ParentFarmingBundleGrid } from "./ParentFarmingBundleGrid"
import { useTheme } from "../context/ThemeContext"
import { PARENT_FARMING_GOAL_PRESETS, type ParentFarmingGoalPreset } from "../lib/parentFarmingGoalPresets"
import type { ParentFarmingCharacterBundle } from "../lib/parentFarmingCharacterBundles"
import type { ParentFarmingSupportBorrowOverrides } from "../lib/parentFarmingSupportBorrow"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

export interface ParentFarmingBundlesSectionProps {
    scenario: string
    supportBorrowOverrides: ParentFarmingSupportBorrowOverrides
    onEditBundleSupports: (bundle: ParentFarmingCharacterBundle) => void
    characterBundleSearchId: string
    onApplyCharacterBundle: (bundle: ParentFarmingCharacterBundle) => void
    containerStyle?: StyleProp<ViewStyle>
    /** When set, also renders the Parent Goal Presets grid (Smart Race Solver). */
    goalPresetSearchId?: string
    allowedEpithetNames?: Set<string>
    onApplyGoalPreset?: (preset: ParentFarmingGoalPreset) => void
    parentId?: string
    condition?: boolean
}

interface GoalPresetCardModel {
    preset: ParentFarmingGoalPreset
    eligibleTargets: number
    totalTargets: number
}

const GoalPresetCard = React.memo(
    ({
        model,
        onApply,
        styles,
        rippleColor,
    }: {
        model: GoalPresetCardModel
        onApply: (preset: ParentFarmingGoalPreset) => void
        styles: ReturnType<typeof createGoalPresetStyles>
        rippleColor: string
    }) => {
        const { preset, eligibleTargets, totalTargets } = model
        return (
            <Pressable
                style={styles.card}
                onPress={() => onApply(preset)}
                android_ripple={{ color: rippleColor, foreground: true }}
                accessibilityRole="button"
            >
                <Text style={styles.title}>{preset.label}</Text>
                <Text style={styles.body}>{preset.description}</Text>
                <Text style={styles.count}>
                    Adds {eligibleTargets}/{totalTargets} visible target{totalTargets === 1 ? "" : "s"}
                </Text>
            </Pressable>
        )
    }
)
GoalPresetCard.displayName = "GoalPresetCard"

const createGoalPresetStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
    StyleSheet.create({
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
        footnote: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18, marginTop: SPACING.sm },
    })

/**
 * Shared parent-farming bundle UI used on Racing Settings and Smart Race Solver.
 * Optionally includes the goal-preset grid on SRS.
 */
export const ParentFarmingBundlesSection = React.memo(
    ({
        scenario,
        supportBorrowOverrides,
        onEditBundleSupports,
        characterBundleSearchId,
        onApplyCharacterBundle,
        containerStyle,
        goalPresetSearchId,
        allowedEpithetNames,
        onApplyGoalPreset,
        parentId,
        condition,
    }: ParentFarmingBundlesSectionProps) => {
        const { colors } = useTheme()
        const goalStyles = useMemo(() => createGoalPresetStyles(colors), [colors])

        const goalCards = useMemo<GoalPresetCardModel[]>(() => {
            if (!allowedEpithetNames) return []
            return PARENT_FARMING_GOAL_PRESETS.map((preset) => ({
                preset,
                eligibleTargets: preset.targetEpithets.filter((name) => allowedEpithetNames.has(name)).length,
                totalTargets: preset.targetEpithets.length,
            }))
        }, [allowedEpithetNames])

        const showGoalPresets = Boolean(goalPresetSearchId && onApplyGoalPreset && allowedEpithetNames)

        return (
            <>
                <SearchableItem
                    id={characterBundleSearchId}
                    title="Character + Goal Bundles"
                    description="One-tap parent setups that combine character preset, goal epithets, solver weights, and training distance bias."
                    parentId={parentId}
                    condition={condition}
                >
                    <View style={[{ padding: SPACING.md }, containerStyle]}>
                        <ParentFarmingBundleGrid
                            scenario={scenario}
                            supportBorrowOverrides={supportBorrowOverrides}
                            onApply={onApplyCharacterBundle}
                            onEditSupports={onEditBundleSupports}
                            hideIntro
                        />
                    </View>
                </SearchableItem>

                {showGoalPresets && (
                    <SearchableItem
                        id={goalPresetSearchId!}
                        title="Parent Goal Presets"
                        description="Quickly add common parent-farming target epithets and weight tuning."
                        parentId={parentId}
                        condition={condition}
                    >
                        <View style={[{ padding: SPACING.md }, containerStyle]}>
                            <Text style={{ ...TYPE.caption, color: colors.textMuted, lineHeight: 18, marginBottom: SPACING.sm }}>
                                Adds target epithets and solver weights for common parent builds. Existing target and forced epithets are preserved.
                            </Text>
                            <View style={goalStyles.grid}>
                                {goalCards.map((model) => (
                                    <GoalPresetCard key={model.preset.key} model={model} onApply={onApplyGoalPreset!} styles={goalStyles} rippleColor={colors.ripple} />
                                ))}
                            </View>
                            <Text style={goalStyles.footnote}>
                                Counts respect the active scenario and character filters. Change the character preset or campaign if a preset shows fewer visible targets than expected.
                            </Text>
                        </View>
                    </SearchableItem>
                )}
            </>
        )
    }
)
ParentFarmingBundlesSection.displayName = "ParentFarmingBundlesSection"
