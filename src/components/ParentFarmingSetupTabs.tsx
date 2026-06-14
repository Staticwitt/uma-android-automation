import { useMemo, useState } from "react"
import { View, Text, Pressable, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"
import type { ParentFarmingCharacterBundle } from "../lib/parentFarmingCharacterBundles"
import type { ParentFarmingGoalPreset } from "../lib/parentFarmingGoalPresets"
import type { ParentFarmingSupportBorrowOverrides } from "../lib/parentFarmingSupportBorrow"
import { ParentFarmingBundleGrid } from "./ParentFarmingBundleGrid"
import { ParentFarmingGoalPresetGrid } from "./ParentFarmingGoalPresetGrid"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

type SetupTab = "bundles" | "goals"

interface ParentFarmingSetupTabsProps {
    scenario: string
    allowedEpithetNames: Set<string>
    supportBorrowOverrides: ParentFarmingSupportBorrowOverrides
    onApplyGoal: (preset: ParentFarmingGoalPreset) => void
    onApplyBundle: (bundle: ParentFarmingCharacterBundle) => void
    onEditBundleSupports: (bundle: ParentFarmingCharacterBundle) => void
}

/**
 * Tabbed picker for character bundles (recommended) vs goal-only presets.
 */
export const ParentFarmingSetupTabs = ({
    scenario,
    allowedEpithetNames,
    supportBorrowOverrides,
    onApplyGoal,
    onApplyBundle,
    onEditBundleSupports,
}: ParentFarmingSetupTabsProps) => {
    const { colors } = useTheme()
    const [tab, setTab] = useState<SetupTab>("bundles")

    const styles = useMemo(
        () =>
            StyleSheet.create({
                intro: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18, marginBottom: SPACING.md },
                tabRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md },
                tab: {
                    flex: 1,
                    paddingVertical: SPACING.sm,
                    paddingHorizontal: SPACING.md,
                    borderRadius: RADII.md,
                    borderWidth: 1,
                    borderColor: colors.borderHair,
                    backgroundColor: colors.surface,
                    alignItems: "center",
                },
                tabActive: {
                    borderColor: colors.brand,
                    backgroundColor: colors.brandSubtle,
                },
                tabText: { ...TYPE.caption, color: colors.textMuted, fontWeight: "600" },
                tabTextActive: { color: colors.brand },
            }),
        [colors]
    )

    return (
        <View>
            <Text style={styles.intro}>
                {tab === "bundles"
                    ? "Recommended: one tap applies character, goal epithets, training bias, and support borrow list."
                    : "Goal-only presets update epithets, solver weights, and training without changing character aptitudes."}
            </Text>
            <View style={styles.tabRow}>
                <Pressable
                    style={[styles.tab, tab === "bundles" && styles.tabActive]}
                    onPress={() => setTab("bundles")}
                    android_ripple={{ color: colors.ripple, foreground: true }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: tab === "bundles" }}
                >
                    <Text style={[styles.tabText, tab === "bundles" && styles.tabTextActive]}>Character setups</Text>
                </Pressable>
                <Pressable
                    style={[styles.tab, tab === "goals" && styles.tabActive]}
                    onPress={() => setTab("goals")}
                    android_ripple={{ color: colors.ripple, foreground: true }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: tab === "goals" }}
                >
                    <Text style={[styles.tabText, tab === "goals" && styles.tabTextActive]}>Goal presets</Text>
                </Pressable>
            </View>
            {tab === "bundles" ? (
                <ParentFarmingBundleGrid
                    scenario={scenario}
                    supportBorrowOverrides={supportBorrowOverrides}
                    onApply={onApplyBundle}
                    onEditSupports={onEditBundleSupports}
                    hideIntro
                />
            ) : (
                <ParentFarmingGoalPresetGrid allowedEpithetNames={allowedEpithetNames} onApply={onApplyGoal} hideIntro />
            )}
        </View>
    )
}
