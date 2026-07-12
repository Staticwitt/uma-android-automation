import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { View, Text, Pressable, ActivityIndicator } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { SheetModal } from "./ui/sheet-modal"
import { ModalFooterChip } from "./ui/modal-list"
import { TrainingContext, type Settings } from "../context/BotStateContext"
import { analyzeCareerRun, type AutoTuneSuggestion, type AutoTuneSeverity } from "../lib/careerAutoTune"
import { loadCareerRunArchive, toCareerRunRecord, buildAutoTuneInput, formatCareerRunLabel, type CareerRunArchiveEntry } from "../lib/careerRunArchive"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

interface AutoTuneSuggestionsSheetProps {
    visible: boolean
    onClose: () => void
}

export const AutoTuneSuggestionsSheet = ({ visible, onClose }: AutoTuneSuggestionsSheetProps) => {
    const { colors } = useTheme()
    const { training, trainingStatTarget, updateTraining, updateTrainingStatTarget } = useContext(TrainingContext)

    const [entries, setEntries] = useState<CareerRunArchiveEntry[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [applied, setApplied] = useState<Set<string>>(new Set())

    const refresh = useCallback(async () => {
        setLoading(true)
        try {
            const runs = await loadCareerRunArchive()
            setEntries(runs)
            setSelectedId(runs[0]?.id ?? null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (visible) {
            setApplied(new Set())
            refresh()
        }
    }, [visible, refresh])

    const selected = useMemo(() => entries.find((e) => e.id === selectedId) ?? entries[0], [entries, selectedId])

    const suggestions = useMemo<AutoTuneSuggestion[]>(() => {
        if (!selected) return []
        const input = buildAutoTuneInput(
            {
                statPrioritization: training.statPrioritization,
                preferredDistanceOverride: training.preferredDistanceOverride,
                trainingStatTarget,
                maximumFailureChance: training.maximumFailureChance,
            },
            selected,
        )
        return analyzeCareerRun(toCareerRunRecord(selected), input)
    }, [selected, training.statPrioritization, training.preferredDistanceOverride, training.maximumFailureChance, trainingStatTarget])

    const applyPatch = useCallback(
        (suggestion: AutoTuneSuggestion) => {
            const patch = suggestion.patch
            if (!patch) return
            if (patch.category === "training") {
                updateTraining({ [patch.key]: patch.value } as Partial<Settings["training"]>)
            } else if (patch.category === "trainingStatTarget") {
                updateTrainingStatTarget({ [patch.key]: patch.value } as Partial<Settings["trainingStatTarget"]>)
            }
            setApplied((prev) => new Set(prev).add(suggestion.id))
        },
        [updateTraining, updateTrainingStatTarget],
    )

    const severityColor = (severity: AutoTuneSeverity): string => {
        if (severity === "high") return colors.warning ?? colors.brand
        if (severity === "medium") return colors.brand
        return colors.textMuted
    }

    const header = (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ ...TYPE.h2, color: colors.text }}>Auto-Tune Suggestions</Text>
            <ModalFooterChip label="Close" onPress={onClose} />
        </View>
    )
    const footer = <ModalFooterChip label="Refresh" onPress={refresh} />

    return (
        <SheetModal visible={visible} onRequestClose={onClose} header={header} footer={footer} heightFraction={0.85}>
            {loading ? (
                <ActivityIndicator style={{ marginTop: SPACING.lg }} color={colors.brand} />
            ) : entries.length === 0 ? (
                <Text style={{ ...TYPE.body, color: colors.textMuted, marginTop: SPACING.md }}>
                    No completed career runs yet. Finish a career and its results will show up here with tuning suggestions for your next run.
                </Text>
            ) : (
                <View style={{ gap: SPACING.md }}>
                    {/* Run picker */}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs }}>
                        {entries.slice(0, 8).map((entry) => {
                            const isSelected = entry.id === selected?.id
                            return (
                                <Pressable
                                    key={entry.id}
                                    onPress={() => setSelectedId(entry.id)}
                                    style={{
                                        paddingVertical: SPACING.xs,
                                        paddingHorizontal: SPACING.sm,
                                        borderRadius: RADII.pill,
                                        backgroundColor: isSelected ? colors.brand : "rgba(128,128,128,0.15)",
                                    }}
                                >
                                    <Text style={{ ...TYPE.caption, color: isSelected ? colors.onBrand ?? "#fff" : colors.text }}>{formatCareerRunLabel(entry)}</Text>
                                </Pressable>
                            )
                        })}
                    </View>

                    {suggestions.length === 0 ? (
                        <Text style={{ ...TYPE.body, color: colors.textMuted }}>This run looks well-tuned — no changes suggested. 🎉</Text>
                    ) : (
                        suggestions.map((s) => {
                            const isApplied = applied.has(s.id)
                            return (
                                <View
                                    key={s.id}
                                    style={{
                                        borderRadius: RADII.md,
                                        borderLeftWidth: 3,
                                        borderLeftColor: severityColor(s.severity),
                                        backgroundColor: "rgba(128,128,128,0.08)",
                                        padding: SPACING.sm,
                                        gap: SPACING.xs,
                                    }}
                                >
                                    <Text style={{ ...TYPE.body, color: colors.text }}>{s.title}</Text>
                                    <Text style={{ ...TYPE.caption, color: colors.textMuted }}>{s.detail}</Text>
                                    {s.patch ? (
                                        <Pressable
                                            disabled={isApplied}
                                            onPress={() => applyPatch(s)}
                                            style={{
                                                alignSelf: "flex-start",
                                                marginTop: SPACING.xs,
                                                paddingVertical: SPACING.xs,
                                                paddingHorizontal: SPACING.md,
                                                borderRadius: RADII.pill,
                                                backgroundColor: isApplied ? "rgba(128,128,128,0.2)" : colors.brand,
                                            }}
                                        >
                                            <Text style={{ ...TYPE.caption, color: isApplied ? colors.textMuted : colors.onBrand ?? "#fff" }}>
                                                {isApplied ? "Applied ✓" : `Apply (${s.patch.key.includes("StatTarget") ? "target" : "setting"} → ${s.patch.value})`}
                                            </Text>
                                        </Pressable>
                                    ) : null}
                                </View>
                            )
                        })
                    )}
                </View>
            )}
        </SheetModal>
    )
}
