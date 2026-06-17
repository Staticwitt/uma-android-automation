import { useMemo, useState } from "react"
import { View, Text, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"
import type { ParentFarmingCharacterBundle } from "../lib/parentFarmingCharacterBundles"
import type { ParentFarmingGoalPreset } from "../lib/parentFarmingGoalPresets"
import type { ParentFarmingSupportBorrowOverrides } from "../lib/parentFarmingSupportBorrow"
import { ParentFarmingBundleGrid } from "./ParentFarmingBundleGrid"
import { ParentFarmingGoalPresetGrid } from "./ParentFarmingGoalPresetGrid"
import TabStrip, { type TabStripItem } from "./ui/tab-strip"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"

type SetupTab = "bundles" | "goals"

const SETUP_TABS: TabStripItem[] = [
    { key: "bundles", label: "Character setups" },
    { key: "goals", label: "Goal presets" },
]

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
            <TabStrip items={SETUP_TABS} activeKey={tab} onChange={(key) => setTab(key as SetupTab)} style={{ marginBottom: SPACING.md }} />
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
