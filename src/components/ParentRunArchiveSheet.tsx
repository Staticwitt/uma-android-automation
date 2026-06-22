import { useCallback, useEffect, useMemo, useState } from "react"
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native"
import { File, Paths } from "expo-file-system"
import * as Sharing from "expo-sharing"
import { useTheme } from "../context/ThemeContext"
import { SheetModal } from "./ui/sheet-modal"
import { ModalFooterChip } from "./ui/modal-list"
import { Input } from "./ui/input"
import { logErrorWithTimestamp } from "../lib/logger"
import {
    buildQualityTrendForCharacter,
    clearParentRunArchive,
    exportParentRunArchiveCsv,
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
    type ParentQualityBreakdown,
} from "../lib/parentQuality"
import { formatParentFarmingSessionSummary, latestSessionId } from "../lib/parentFarmingSessionSummary"
import { buildLineage, formatLineageGenerationLabel, listSessionIds } from "../lib/parentFarmingLineage"
import { copyToClipboard } from "../lib/utils"
import {
    exportHorseJsonForUmaTools,
    exportRunForUmaTools,
    exportRunForUmaToolsCsv,
} from "../lib/umaToolsExport"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

interface ParentRunArchiveSheetProps {
    visible: boolean
    onClose: () => void
}

const QUALITY_BAR_MAX = 35

const renderQualityBar = (label: string, value: number, color: string) => (
    <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
        <Text style={{ width: 72, fontSize: 11 }}>{label}</Text>
        <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: "rgba(128,128,128,0.2)" }}>
            <View style={{ width: `${Math.min(100, (value / QUALITY_BAR_MAX) * 100)}%`, height: 8, borderRadius: 4, backgroundColor: color }} />
        </View>
        <Text style={{ width: 28, fontSize: 11, textAlign: "right" }}>{value.toFixed(1)}</Text>
    </View>
)

const renderQualityBreakdown = (breakdown: ParentQualityBreakdown, colors: ReturnType<typeof useTheme>["colors"]) => (
    <View style={{ marginTop: 8 }}>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Quality breakdown</Text>
        {renderQualityBar("Epithets", breakdown.epithetScore, colors.brand)}
        {renderQualityBar("Fans", breakdown.fanScore, colors.brand)}
        {renderQualityBar("Forced", breakdown.forcedScore, colors.warning ?? colors.brand)}
        {renderQualityBar("Races", breakdown.raceScore, colors.textMuted)}
        {renderQualityBar("Sparks", breakdown.sparkScore, colors.brand)}
        {renderQualityBar("Bonus", breakdown.bonusScore, colors.textMuted)}
    </View>
)

export const ParentRunArchiveSheet = ({ visible, onClose }: ParentRunArchiveSheetProps) => {
    const { colors } = useTheme()
    const [runs, setRuns] = useState<ParentRunArchiveEntry[]>([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState("")
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [lineageSessionId, setLineageSessionId] = useState<string | null>(null)

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
            setLineageSessionId(null)
            refresh()
        }
    }, [visible, refresh])

    const sessionIds = useMemo(() => listSessionIds(runs), [runs])
    const lineageRuns = useMemo(() => (lineageSessionId ? buildLineage(runs, lineageSessionId) : []), [runs, lineageSessionId])

    const handleViewLineage = useCallback(() => {
        setLineageSessionId(latestSessionId(runs))
    }, [runs])

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

    const handleExportCsv = useCallback(async () => {
        if (runs.length === 0) {
            Alert.alert("No runs", "There are no saved parent runs to export.")
            return
        }
        try {
            const csv = exportParentRunArchiveCsv(runs)
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
            const file = new File(Paths.document, `UAA-parent-runs-${timestamp}.csv`)
            file.write(csv)

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: "Export Parent Run History" })
            } else {
                Alert.alert("Exported", `Saved to ${file.uri}`)
            }
        } catch (error) {
            logErrorWithTimestamp("Error exporting parent run archive CSV:", error)
            Alert.alert("Export failed", "Could not export the parent run history as CSV.")
        }
    }, [runs])

    const handleCopyRun = useCallback(async (run: ParentRunArchiveEntry) => {
        await copyToClipboard(formatParentRunExportEntry(run))
        Alert.alert("Copied", "Run summary copied to clipboard.")
    }, [])

    const handleCopyUmaToolsJson = useCallback(async (run: ParentRunArchiveEntry) => {
        await copyToClipboard(exportHorseJsonForUmaTools(run))
        Alert.alert("Copied", "Umalator horse JSON copied to clipboard.")
    }, [])

    const handleCopyUmaToolsCsv = useCallback(async (run: ParentRunArchiveEntry) => {
        await copyToClipboard(exportRunForUmaToolsCsv(run))
        Alert.alert("Copied", "Umalator CSV row copied to clipboard.")
    }, [])

    const handleCopyUmaToolsFull = useCallback(async (run: ParentRunArchiveEntry) => {
        await copyToClipboard(exportRunForUmaTools(run))
        Alert.alert("Copied", "Uma-tools export JSON copied to clipboard.")
    }, [])

    const handleCopySessionSummary = useCallback(async () => {
        const sessionId = latestSessionId(runs)
        if (!sessionId) {
            Alert.alert("No session", "No multi-run session found in saved runs.")
            return
        }
        const text = formatParentFarmingSessionSummary(runs, sessionId)
        await copyToClipboard(text)
        Alert.alert("Copied", "Session summary copied to clipboard.")
    }, [runs])

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
                copyRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md, marginTop: SPACING.sm },
                sessionPicker: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs, marginBottom: SPACING.md },
                sessionChip: {
                    paddingHorizontal: SPACING.sm,
                    paddingVertical: 6,
                    borderRadius: RADII.sm,
                    borderWidth: 1,
                    borderColor: colors.borderHair,
                    backgroundColor: colors.bg,
                },
                sessionChipActive: { borderColor: colors.brand, backgroundColor: colors.brandSubtle },
                lineageArrow: { ...TYPE.caption, color: colors.textMuted, textAlign: "center", marginVertical: SPACING.xs },
                lineageInheritance: { ...TYPE.caption, color: colors.brand, marginTop: SPACING.xs },
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
            {lineageSessionId ? (
                <ModalFooterChip label="Back to list" onPress={() => setLineageSessionId(null)} tone="neutral" />
            ) : (
                <ModalFooterChip label="View lineage" onPress={handleViewLineage} tone="neutral" />
            )}
            <ModalFooterChip label="Copy session summary" onPress={handleCopySessionSummary} tone="neutral" />
            <ModalFooterChip label="Export JSON" onPress={handleExport} tone="neutral" />
            <ModalFooterChip label="Export CSV" onPress={handleExportCsv} tone="neutral" />
            <ModalFooterChip label="Close" onPress={onClose} tone="neutral" />
            <ModalFooterChip label="Clear history" onPress={handleClear} tone="danger" />
        </View>
    )

    return (
        <SheetModal visible={visible} onRequestClose={onClose} header={header} footer={footer} maxWidth={640} heightFraction={0.8}>
            {loading ? (
                <ActivityIndicator color={colors.brand} style={{ marginTop: SPACING.lg }} />
            ) : lineageSessionId ? (
                <ScrollView keyboardShouldPersistTaps="handled">
                    {sessionIds.length > 1 && (
                        <View style={styles.sessionPicker}>
                            {sessionIds.map((id) => (
                                <Pressable
                                    key={id}
                                    onPress={() => setLineageSessionId(id)}
                                    style={[styles.sessionChip, id === lineageSessionId && styles.sessionChipActive]}
                                    accessibilityRole="button"
                                >
                                    <Text style={{ ...TYPE.caption, color: colors.text }}>{id === latestSessionId(runs) ? "Latest" : id.slice(0, 8)}</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                    {lineageRuns.length === 0 ? (
                        <Text style={styles.empty}>No runs found for this session.</Text>
                    ) : (
                        lineageRuns.map((run, index) => {
                            const quality = scoreParentRunArchiveEntry(run)
                            return (
                                <View key={run.id}>
                                    <View style={styles.row}>
                                        <Text style={styles.title}>{formatLineageGenerationLabel(run, index + 1)}</Text>
                                        <Text style={styles.meta}>
                                            {formatQualityLabel(quality)} · {run.fans.toLocaleString()} fans · {run.raceWins}W/{run.raceLosses}L
                                        </Text>
                                        {run.goalPresetLabel || run.bundleLabel ? (
                                            <Text style={styles.meta}>{run.bundleLabel || run.goalPresetLabel}</Text>
                                        ) : null}
                                        {run.inheritanceSummary ? (
                                            <Text style={styles.lineageInheritance}>Inheritance: {run.inheritanceSummary}</Text>
                                        ) : null}
                                        {run.harvestSummary ? <Text style={styles.meta}>Harvest: {run.harvestSummary}</Text> : null}
                                        {run.completedTargetEpithets.length > 0 ? (
                                            <Text style={styles.meta}>Completed: {run.completedTargetEpithets.join(" · ")}</Text>
                                        ) : null}
                                        {run.isSessionBest ? <Text style={styles.best}>Session best run</Text> : null}
                                    </View>
                                    {index < lineageRuns.length - 1 && <Text style={styles.lineageArrow}>↓ legacy parent ↓</Text>}
                                </View>
                            )
                        })
                    )}
                </ScrollView>
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
                                            {renderQualityBreakdown(quality.breakdown, colors)}
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
                                            <View style={styles.copyRow}>
                                                <Pressable onPress={() => handleCopyRun(run)} accessibilityRole="button">
                                                    <Text style={styles.copyBtn}>Copy run summary</Text>
                                                </Pressable>
                                                <Pressable onPress={() => handleCopyUmaToolsJson(run)} accessibilityRole="button">
                                                    <Text style={styles.copyBtn}>Copy for Umalator</Text>
                                                </Pressable>
                                                <Pressable onPress={() => handleCopyUmaToolsCsv(run)} accessibilityRole="button">
                                                    <Text style={styles.copyBtn}>Copy CSV row</Text>
                                                </Pressable>
                                                <Pressable onPress={() => handleCopyUmaToolsFull(run)} accessibilityRole="button">
                                                    <Text style={styles.copyBtn}>Export uma-tools JSON</Text>
                                                </Pressable>
                                            </View>
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
