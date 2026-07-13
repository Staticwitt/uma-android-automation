import { useCallback, useEffect, useMemo, useState } from "react"
import { View, Text, Pressable, ActivityIndicator } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { SheetModal } from "./ui/sheet-modal"
import { ModalFooterChip } from "./ui/modal-list"
import { analyzeCareerRuns, type MetaTuneInsight, type MetaTuneSeverity } from "../lib/careerMetaTune"
import { loadCareerRunArchive, toMetaRunInput, type CareerRunArchiveEntry } from "../lib/careerRunArchive"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

interface MetaInsightsSheetProps {
    visible: boolean
    onClose: () => void
}

const ALL_SCENARIOS = "All scenarios"

/**
 * Cross-run insights panel. Loads the whole career-run archive and surfaces patterns the single-run auto-tuner can't see (`analyzeCareerRuns`): what drives your rank, what your
 * best runs do differently, which races you keep losing, trend and consistency. Read-only — its findings are guidance, not one-tap patches, since they concern the build as a
 * whole rather than a single preset field. Optionally scoped to one scenario.
 */
export const MetaInsightsSheet = ({ visible, onClose }: MetaInsightsSheetProps) => {
    const { colors } = useTheme()

    const [entries, setEntries] = useState<CareerRunArchiveEntry[]>([])
    const [loading, setLoading] = useState(false)
    const [scenario, setScenario] = useState<string>(ALL_SCENARIOS)

    const refresh = useCallback(async () => {
        setLoading(true)
        try {
            setEntries(await loadCareerRunArchive())
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (visible) refresh()
    }, [visible, refresh])

    const scenarios = useMemo(() => [ALL_SCENARIOS, ...Array.from(new Set(entries.map((e) => e.scenario).filter(Boolean)))], [entries])

    const insights = useMemo<MetaTuneInsight[]>(() => {
        const runs = entries.map(toMetaRunInput)
        return analyzeCareerRuns(runs, scenario === ALL_SCENARIOS ? {} : { scenario })
    }, [entries, scenario])

    const severityColor = (severity: MetaTuneSeverity): string => {
        if (severity === "high") return colors.warning ?? colors.brand
        if (severity === "medium") return colors.brand
        return colors.textMuted
    }

    const header = (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ ...TYPE.h2, color: colors.text }}>Cross-Run Insights</Text>
            <ModalFooterChip label="Close" onPress={onClose} />
        </View>
    )
    const footer = <ModalFooterChip label="Refresh" onPress={refresh} />

    return (
        <SheetModal visible={visible} onRequestClose={onClose} header={header} footer={footer} heightFraction={0.85}>
            {loading ? (
                <ActivityIndicator style={{ marginTop: SPACING.lg }} color={colors.brand} />
            ) : entries.length < 4 ? (
                <Text style={{ ...TYPE.body, color: colors.textMuted, marginTop: SPACING.md }}>
                    Cross-run insights need at least 4 completed career runs to spot patterns. You have {entries.length}. Keep finishing careers and check back.
                </Text>
            ) : (
                <View style={{ gap: SPACING.md }}>
                    {/* Scenario filter */}
                    {scenarios.length > 2 ? (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs }}>
                            {scenarios.map((s) => {
                                const isSelected = s === scenario
                                return (
                                    <Pressable
                                        key={s}
                                        onPress={() => setScenario(s)}
                                        style={{
                                            paddingVertical: SPACING.xs,
                                            paddingHorizontal: SPACING.sm,
                                            borderRadius: RADII.pill,
                                            backgroundColor: isSelected ? colors.brand : "rgba(128,128,128,0.15)",
                                        }}
                                    >
                                        <Text style={{ ...TYPE.caption, color: isSelected ? colors.onBrand ?? "#fff" : colors.text }}>{s}</Text>
                                    </Pressable>
                                )
                            })}
                        </View>
                    ) : null}

                    {insights.length === 0 ? (
                        <Text style={{ ...TYPE.body, color: colors.textMuted }}>No clear cross-run pattern yet — your results look consistent. 🎉</Text>
                    ) : (
                        insights.map((insight) => (
                            <View
                                key={insight.id}
                                style={{
                                    borderRadius: RADII.md,
                                    borderLeftWidth: 3,
                                    borderLeftColor: severityColor(insight.severity),
                                    backgroundColor: "rgba(128,128,128,0.08)",
                                    padding: SPACING.sm,
                                    gap: SPACING.xs,
                                }}
                            >
                                <Text style={{ ...TYPE.body, color: colors.text }}>{insight.title}</Text>
                                <Text style={{ ...TYPE.caption, color: colors.textMuted }}>{insight.detail}</Text>
                            </View>
                        ))
                    )}
                </View>
            )}
        </SheetModal>
    )
}
