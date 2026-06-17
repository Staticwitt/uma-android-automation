import React, { useCallback, useState } from "react"
import { View, Text } from "react-native"
import { Trash2 } from "lucide-react-native"
import { FlashList } from "@shopify/flash-list"
import TabStrip from "../../../components/ui/tab-strip"
import CustomButton from "../../../components/CustomButton"
import { Input } from "../../../components/ui/input"
import SearchableItem from "../../../components/SearchableItem"
import { useTheme } from "../../../context/ThemeContext"
import { TYPE } from "../../../lib/type"
import { SPACING } from "../../../lib/spacing"
import type { EpithetEntry } from "../../../lib/solver/constants"
import { EpithetChip } from "./Helpers"

const EPITHET_TABS = [
    { key: "target", label: "Target" },
    { key: "forced", label: "Forced" },
] as const

type EpithetTabKey = (typeof EPITHET_TABS)[number]["key"]

export interface SmartRaceSolverEpithetsPanelProps {
    enableSmartRaceSolver: boolean
    sectionsDisabledStyle: { opacity: number } | undefined
    styles: Record<string, object>
    allEpithetsCount: number
    targetEpithets: string[]
    forcedEpithets: string[]
    filteredEpithets: EpithetEntry[]
    filteredForcedEpithets: EpithetEntry[]
    epithetSearch: string
    forcedEpithetSearch: string
    onEpithetSearchChange: (value: string) => void
    onForcedEpithetSearchChange: (value: string) => void
    onToggleTarget: (name: string) => void
    onToggleForced: (name: string) => void
    onClearTargets: () => void
    onClearForced: () => void
}

/**
 * Tabbed target / forced epithet pickers for Smart Race Solver.
 */
export const SmartRaceSolverEpithetsPanel = React.memo(
    ({
        enableSmartRaceSolver,
        sectionsDisabledStyle,
        styles,
        allEpithetsCount,
        targetEpithets,
        forcedEpithets,
        filteredEpithets,
        filteredForcedEpithets,
        epithetSearch,
        forcedEpithetSearch,
        onEpithetSearchChange,
        onForcedEpithetSearchChange,
        onToggleTarget,
        onToggleForced,
        onClearTargets,
        onClearForced,
    }: SmartRaceSolverEpithetsPanelProps) => {
        const { colors } = useTheme()
        const [activeTab, setActiveTab] = useState<EpithetTabKey>("target")
        const onTabChange = useCallback((key: string) => setActiveTab(key as EpithetTabKey), [])

        return (
            <>
                <View style={[sectionsDisabledStyle, { paddingHorizontal: SPACING.md, paddingTop: SPACING.md }]}>
                    <TabStrip items={[...EPITHET_TABS]} activeKey={activeTab} onChange={onTabChange} />
                </View>

                <SearchableItem
                    id="smart-solver-target-epithets"
                    condition={enableSmartRaceSolver && activeTab === "target"}
                    parentId="enable-smart-race-solver"
                    title="Target Epithets"
                    description="Epithets the solver actively pursues. Selecting one biases the schedule toward completing it."
                >
                    <View style={[sectionsDisabledStyle, { padding: SPACING.md }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACING.sm, gap: SPACING.sm }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ ...TYPE.body, color: colors.text, fontWeight: "600", marginBottom: SPACING.xs }}>Target Epithets</Text>
                                <Text style={{ ...TYPE.caption, color: colors.textMuted, lineHeight: 18 }}>
                                    Selected <Text style={[TYPE.monoValue, { color: colors.text }]}>{targetEpithets.length}</Text> /{" "}
                                    <Text style={[TYPE.monoValue, { color: colors.text }]}>{filteredEpithets.length}</Text> epithets
                                </Text>
                            </View>
                            <CustomButton icon={<Trash2 size={16} color={colors.text} />} onPress={onClearTargets}>
                                Clear
                            </CustomButton>
                        </View>
                        <Text style={styles.description as object}>Epithets the solver actively pursues. Selecting one biases the schedule toward completing it.</Text>
                        <Input style={styles.input as object} value={epithetSearch} onChangeText={onEpithetSearchChange} placeholder={`Search ${allEpithetsCount} epithets…`} />
                        <FlashList
                            data={filteredEpithets}
                            numColumns={2}
                            style={styles.epithetList as object}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                            keyExtractor={(ep) => ep.name}
                            renderItem={({ item: ep }) => (
                                <EpithetChip epithet={ep} selected={targetEpithets.includes(ep.name)} onToggle={onToggleTarget} styles={styles} />
                            )}
                        />
                    </View>
                </SearchableItem>

                <SearchableItem
                    id="smart-solver-forced-epithets"
                    condition={enableSmartRaceSolver && activeTab === "forced"}
                    parentId="enable-smart-race-solver"
                    title="Forced Epithets"
                    description="Epithets the solver MUST complete. If completion becomes impossible, the solver stops planning."
                >
                    <View style={[sectionsDisabledStyle, { padding: SPACING.md }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACING.sm, gap: SPACING.sm }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ ...TYPE.body, color: colors.text, fontWeight: "600", marginBottom: SPACING.xs }}>Forced Epithets</Text>
                                <Text style={{ ...TYPE.caption, color: colors.textMuted, lineHeight: 18 }}>
                                    Selected <Text style={[TYPE.monoValue, { color: colors.text }]}>{forcedEpithets.length}</Text> /{" "}
                                    <Text style={[TYPE.monoValue, { color: colors.text }]}>{filteredForcedEpithets.length}</Text> epithets
                                </Text>
                            </View>
                            <CustomButton icon={<Trash2 size={16} color={colors.text} />} onPress={onClearForced}>
                                Clear
                            </CustomButton>
                        </View>
                        <Text style={styles.description as object}>
                            Epithets the solver MUST complete. If completion becomes impossible (for example a needed race was already lost), the solver stops planning. Use sparingly - each forced
                            epithet narrows what the solver can pick.
                        </Text>
                        <Input style={styles.input as object} value={forcedEpithetSearch} onChangeText={onForcedEpithetSearchChange} placeholder={`Search ${allEpithetsCount} epithets…`} />
                        <FlashList
                            data={filteredForcedEpithets}
                            numColumns={2}
                            style={styles.epithetList as object}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                            keyExtractor={(ep) => ep.name}
                            renderItem={({ item: ep }) => (
                                <EpithetChip epithet={ep} selected={forcedEpithets.includes(ep.name)} onToggle={onToggleForced} styles={styles} />
                            )}
                        />
                    </View>
                </SearchableItem>
            </>
        )
    }
)
SmartRaceSolverEpithetsPanel.displayName = "SmartRaceSolverEpithetsPanel"
