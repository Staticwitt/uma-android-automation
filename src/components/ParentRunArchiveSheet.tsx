import { useCallback, useEffect, useMemo, useState } from "react"
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { SheetModal } from "./ui/sheet-modal"
import { ModalFooterChip } from "./ui/modal-list"
import { Input } from "./ui/input"
import {
    buildQualityTrendForCharacter,
    clearParentRunArchive,
    exportParentRunArchiveJson,
    findPreviousRunForCharacter,
    formatFanClassLabel,
    formatFansDelta,
    formatParentRunDuration,
    formatParentRunExportEntry,
    formatParentRunTimestamp,
    formatQualityTrendLine,
    loadParentRunArchive,
    type ParentRunArchiveEntry,
} from "../lib/parentRunArchive"
import {
    findBestRunForCharacter,
    formatEpithetDelta,
    formatQualityLabel,
    scoreParentRunArchiveEntry,
} from "../lib/parentQuality"
import { copyToClipboard } from "../lib/utils"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

interface ParentRunArchiveSheetProps {
    visible: boolean
    onClose: () => void
}

export const ParentRunArchiveSheet = ({ visible, onClose }: ParentRunArchiveSheetProps) => {
    const { colors } = useTheme()
    const [runs, setRuns] = useState<ParentRunArchiveEntry[]>([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState("")
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const refresh = useCallback(async () => {
        setLoading(true)
        try {
            const entries = await loadParentRunArchive()
            setRuns(entries)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (visible) {
            setSearch("")
            setExpandedId(null)
            refresh()
        }
    }, [visible, refresh])

    const filteredRuns = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return runs
        return runs.filter((run) => {
            const haystack = [run.traineeName, run.characterPreset, run.bundleLabel, run.goalPresetLabel, run.scenario]
                .join(" ")
                .toLowerCase()
            return haystack.includes(q)
        })
    }, [runs, search])

    const handleClear = useCallback(() => {
        Alert.alert("Clear parent run history?", "This removes all saved parent runs from this device.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Clear",
                style: "destructive",
                onPress: async () => {
                    await clearParentRunArchive()
                    setRuns([])
                    setExpandedId(null)
                },
            },
        ])
    }, [])

    const handleExport = useCallback(async () => {
        const json = await exportParentRunArchiveJson()
        await copyToClipboard(json)
        Alert.alert("Copied", "Parent run archive JSON copied to clipboard.")
    }, [])

    const handleCopyRun = useCallback(async (run: ParentRunArchiveEntry) => {
        await copyToClipboard(formatParentRunExportEntry(run))
        Alert.alert("Copied", "Run summary copied to clipboard.")
    }, [])

    const styles = useMemo(
        () =>
            StyleSheet.create({
                intro: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18, marginBottom: SPACING.md },
                row: {
                    borderWidth: 1,
                    borderColor: colors.borderHair,
                    borderRadius: RADII.md,
                    padding: SPACING.md,
                    marginBottom: SPACING.sm,
                    backgroundColor: colors.surface,
                },
                title: { ...TYPE.body, color: colors.text, fontWeight: "600" },
                meta: { ...TYPE.caption, color: colors.textMuted, marginTop: SPACING.xs },
                compare: { ...TYPE.caption, color: colors.brand, marginTop: SPACING.xs },
                best: { ...TYPE.caption, color: colors.warning ?? colors.textMuted, marginTop: SPACING.xs },
                detail: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18, marginTop: SPACING.sm },
                empty: { ...TYPE.body, color: colors.textMuted, textAlign: "center", marginTop: SPACING.lg },
                copyBtn: { ...TYPE.caption, color: colors.brand, fontWeight: "600", marginTop: SPACING.sm },
            }),
        [colors],
    )

    const header = (
        <View>
            <Text style={{ ...TYPE.h2, color: colors.text }}>Parent run history</Text>
            <Text style={styles.intro}>
                Saved locally when a parent-farming career ends. Runs are scored S–D from epithets, fans, forced routes, and race efficiency.
            </Text>
            <Input value={search} onChangeText={setSearch} placeholder="Search character, bundle, scenario…" autoCapitalize="none" autoCorrect={false} />
        </View>
    )

    const footer = (
        <View style={{ flexDirection: "row", gap: SPACING.sm, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <ModalFooterChip label="Export JSON" onPress={handleExport} tone="neutral" />
            <ModalFooterChip label="Close" onPress={onClose} tone="neutral" />
            <ModalFooterChip label="Clear history" onPress={handleClear} tone="danger" />
        </View>
    )

    return (
        <SheetModal visible={visible} onRequestClose={onClose} header={header} footer={footer} maxWidth={640} heightFraction={0.8}>
            {loading ? (
                <ActivityIndicator color={colors.brand} style={{ marginTop: SPACING.lg }} />
            ) : (
                <ScrollView keyboardShouldPersistTaps="handled">
                    {filteredRuns.length === 0 ? (
                        <Text style={styles.empty}>
                            {runs.length === 0 ? "No parent runs saved yet. Finish a parent-farming career to record one." : "No runs match your search."}
                        </Text>
                    ) : (
                        filteredRuns.map((run) => {
                            const previous = findPreviousRunForCharacter(runs, run)
                            const expanded = expandedId === run.id
                            const duration = formatParentRunDuration(run.elapsedMs)
                            const quality = scoreParentRunArchiveEntry(run)
                            const characterKey = run.characterPreset || run.traineeName
                            const bestForCharacter = characterKey ? findBestRunForCharacter(runs, characterKey) : null
                            const epithetDelta = previous ? formatEpithetDelta(run, previous) : null
                            const trendRuns = characterKey ? buildQualityTrendForCharacter(runs, characterKey) : []
                            const trendLine = formatQualityTrendLine(trendRuns)
                            return (
                                <Pressable
                                    key={run.id}
                                    onPress={() => setExpandedId(expanded ? null : run.id)}
                                    style={styles.row}
                                    accessibilityRole="button"
                                >
                                    <Text style={styles.title}>
                                        {run.traineeName || run.characterPreset || "Unknown Uma"}
                                        {run.fans > 0 ? ` · ${run.fans.toLocaleString()} fans` : ""}
                                        {` · ${formatQualityLabel(quality)}`}
                                    </Text>
                                    <Text style={styles.meta}>
                                        {formatParentRunTimestamp(run.completedAtMs)}
                                        {duration ? ` · ${duration}` : ""}
                                        {run.scenario ? ` · ${run.scenario}` : ""}
                                        {run.sessionRunIndex ? ` · session run ${run.sessionRunIndex}` : ""}
                                    </Text>
                                    {run.bundleLabel ? <Text style={styles.meta}>{run.bundleLabel}</Text> : null}
                                    <Text style={styles.meta}>
                                        Targets: {run.completedTargetEpithets.length} completed
                                        {run.incompleteTargetEpithets.length > 0 ? ` · ${run.incompleteTargetEpithets.length} incomplete` : ""}
                                        · {run.raceWins}W/{run.raceLosses}L
                                    </Text>
                                    {trendLine ? <Text style={styles.compare}>Trend: {trendLine}</Text> : null}
                                    {previous ? <Text style={styles.compare}>{formatFansDelta(run.fans, previous.fans)}</Text> : null}
                                    {epithetDelta ? <Text style={styles.compare}>{epithetDelta}</Text> : null}
                                    {run.isSessionBest ? <Text style={styles.best}>Session best run</Text> : null}
                                    {bestForCharacter?.id === run.id && runs.filter((r) => (r.characterPreset || r.traineeName) === characterKey).length > 1 ? (
                                        <Text style={styles.best}>Best quality for {characterKey}</Text>
                                    ) : null}
                                    {expanded && (
                                        <View style={styles.detail}>
                                            <Text>Quality: {formatQualityLabel(quality)}</Text>
                                            <Text>Goal: {run.goalPresetLabel || run.characterPreset}</Text>
                                            <Text>Spark: {run.sparkStrategy}</Text>
                                            <Text>
                                                Fans: {run.fans.toLocaleString()} ({formatFanClassLabel(run.fanClass)})
                                            </Text>
                                            <Text>
                                                Stats: Sp {run.stats.speed} Sta {run.stats.stamina} Pow {run.stats.power} Gut {run.stats.guts} Wit {run.stats.wit}
                                            </Text>
                                            <Text>Skill points: {run.skillPoints}</Text>
                                            {run.inheritanceSummary ? <Text>Inheritance: {run.inheritanceSummary}</Text> : null}
                                            {run.completedTargetEpithets.length > 0 && <Text>Completed: {run.completedTargetEpithets.join(" · ")}</Text>}
                                            {run.incompleteTargetEpithets.length > 0 && <Text>Missed: {run.incompleteTargetEpithets.join(" · ")}</Text>}
                                            {run.extraCompletedEpithets.length > 0 && (
                                                <Text>Other epithets: {run.extraCompletedEpithets.slice(0, 6).join(" · ")}</Text>
                                            )}
                                            {run.sparkPicks.length > 0 && (
                                                <Text>Sparks: {run.sparkPicks.map((pick) => `#${pick.pickIndex + 1} ${pick.strategy}`).join(" · ")}</Text>
                                            )}
                                            {run.trainingBias ? <Text>Bias: {run.trainingBias}</Text> : null}
                                            <Pressable onPress={() => handleCopyRun(run)} accessibilityRole="button">
                                                <Text style={styles.copyBtn}>Copy run summary</Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </Pressable>
                            )
                        })
                    )}
                </ScrollView>
            )}
        </SheetModal>
    )
}
