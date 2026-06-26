import { useCallback, useEffect, useMemo, useState } from "react"
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { SheetModal } from "./ui/sheet-modal"
import { ModalFooterChip } from "./ui/modal-list"
import { Input } from "./ui/input"
import { loadParentRunArchive, formatParentRunTimestamp, type ParentRunArchiveEntry } from "../lib/parentRunArchive"
import { listCharactersForSupportFinder } from "../lib/recommendSupportDeck"
import { rankLegacyParentsForCharacter, type LegacyParentRecommendation } from "../lib/legacyParentArchiveFit"
import { copyToClipboard } from "../lib/utils"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

interface LegacyParentFinderSheetProps {
    visible: boolean
    initialCharacterName?: string
    onClose: () => void
}

const formatSparkList = (sparks: string[]): string => (sparks.length > 0 ? sparks.join(" · ") : "No sparks recorded")

const formatRecommendationClipboard = (rec: LegacyParentRecommendation, targetName: string): string => {
    const run = rec.run
    const lines = [
        `Best legacy parent for ${targetName}: ${run.traineeName || run.characterPreset || "Unknown Uma"}`,
        `Fit score: ${rec.fitScore}/100`,
        `Sparks: ${formatSparkList(rec.sparks)}`,
        ...rec.reasons.map((reason) => `- ${reason}`),
    ]
    return lines.join("\n")
}

/**
 * Searchable sheet: pick the Uma you're currently training and rank every saved legacy parent
 * (with its real sparks) by how well it fits that build.
 */
export const LegacyParentFinderSheet = ({ visible, initialCharacterName, onClose }: LegacyParentFinderSheetProps) => {
    const { colors } = useTheme()
    const [runs, setRuns] = useState<ParentRunArchiveEntry[]>([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState("")
    const [selectedName, setSelectedName] = useState(initialCharacterName ?? "")

    useEffect(() => {
        if (!visible) return
        setSelectedName(initialCharacterName ?? "")
        setSearch("")
        setLoading(true)
        loadParentRunArchive()
            .then(setRuns)
            .finally(() => setLoading(false))
    }, [visible, initialCharacterName])

    const allCharacters = useMemo(() => listCharactersForSupportFinder(), [])
    const filteredCharacters = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return allCharacters
        return allCharacters.filter((c) => c.name.toLowerCase().includes(q))
    }, [allCharacters, search])

    const ranked = useMemo(() => (selectedName ? rankLegacyParentsForCharacter(runs, selectedName) : []), [runs, selectedName])

    const handleCopyBest = useCallback(async () => {
        if (ranked.length === 0) return
        await copyToClipboard(formatRecommendationClipboard(ranked[0], selectedName))
        Alert.alert("Copied", "Best legacy parent recommendation copied to clipboard.")
    }, [ranked, selectedName])

    const styles = useMemo(
        () =>
            StyleSheet.create({
                intro: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18, marginBottom: SPACING.md },
                list: { maxHeight: 160, marginBottom: SPACING.md },
                row: {
                    paddingVertical: SPACING.sm,
                    paddingHorizontal: SPACING.md,
                    borderRadius: RADII.md,
                    borderWidth: 1,
                    borderColor: colors.borderHair,
                    marginBottom: SPACING.xs,
                    backgroundColor: colors.surface,
                },
                rowActive: { borderColor: colors.brand, backgroundColor: colors.brandSubtle },
                rowName: { ...TYPE.body, color: colors.text },
                rowApt: { ...TYPE.caption, color: colors.textMuted, marginTop: 2 },
                empty: { ...TYPE.body, color: colors.textMuted, textAlign: "center", marginTop: SPACING.lg },
                parentRow: {
                    borderWidth: 1,
                    borderColor: colors.borderHair,
                    borderRadius: RADII.md,
                    padding: SPACING.md,
                    marginBottom: SPACING.sm,
                    backgroundColor: colors.surface,
                },
                bestRow: { borderColor: colors.brand, backgroundColor: colors.brandSubtle },
                title: { ...TYPE.body, color: colors.text, fontWeight: "600" },
                meta: { ...TYPE.caption, color: colors.textMuted, marginTop: SPACING.xs },
                best: { ...TYPE.caption, color: colors.warning ?? colors.brand, marginTop: SPACING.xs, fontWeight: "600" },
                reason: { ...TYPE.caption, color: colors.textMuted, marginTop: 2 },
                sparks: { ...TYPE.caption, color: colors.brand, marginTop: SPACING.xs },
            }),
        [colors],
    )

    const header = (
        <View>
            <Text style={{ ...TYPE.h2, color: colors.text }}>Best legacy parent for your Uma</Text>
            <Text style={styles.intro}>
                Pick a trainee to rank every saved legacy parent by how well its aptitudes, sparks, and run quality fit that build.
            </Text>
        </View>
    )

    const footer = (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, justifyContent: "flex-end" }}>
            <ModalFooterChip label="Close" onPress={onClose} tone="neutral" />
            <ModalFooterChip label="Copy best match" onPress={handleCopyBest} tone="primary" disabled={ranked.length === 0} />
        </View>
    )

    return (
        <SheetModal visible={visible} onRequestClose={onClose} header={header} footer={footer} maxWidth={640} heightFraction={0.85}>
            <ScrollView keyboardShouldPersistTaps="handled">
                <Input value={search} onChangeText={setSearch} placeholder="Search characters..." />
                <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {filteredCharacters.map((c) => {
                        const active = selectedName === c.name
                        return (
                            <Pressable
                                key={c.name}
                                style={[styles.row, active && styles.rowActive]}
                                onPress={() => setSelectedName(c.name)}
                                android_ripple={{ color: colors.ripple, foreground: true }}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                            >
                                <Text style={styles.rowName}>{c.name}</Text>
                                <Text style={styles.rowApt}>
                                    Sprint {c.distanceAptitudes.Sprint} · Mile {c.distanceAptitudes.Mile} · Med {c.distanceAptitudes.Medium} · Long{" "}
                                    {c.distanceAptitudes.Long}
                                </Text>
                            </Pressable>
                        )
                    })}
                    {filteredCharacters.length === 0 && <Text style={styles.empty}>No matches.</Text>}
                </ScrollView>

                {loading ? (
                    <ActivityIndicator color={colors.brand} style={{ marginTop: SPACING.lg }} />
                ) : !selectedName ? (
                    <Text style={styles.empty}>Pick a trainee above to rank saved legacy parents.</Text>
                ) : ranked.length === 0 ? (
                    <Text style={styles.empty}>No saved legacy parents yet. Finish a parent-farming career to record one.</Text>
                ) : (
                    ranked.map((rec, index) => {
                        const run = rec.run
                        return (
                            <View key={run.id} style={[styles.parentRow, index === 0 && styles.bestRow]}>
                                <Text style={styles.title}>
                                    {index === 0 ? "★ " : ""}
                                    {run.traineeName || run.characterPreset || "Unknown Uma"} · fit {rec.fitScore}/100
                                </Text>
                                <Text style={styles.meta}>
                                    {formatParentRunTimestamp(run.completedAtMs)} · {run.fans.toLocaleString()} fans · {run.raceWins}W/{run.raceLosses}L
                                </Text>
                                {run.bundleLabel || run.goalPresetLabel ? <Text style={styles.meta}>{run.bundleLabel || run.goalPresetLabel}</Text> : null}
                                <Text style={styles.sparks}>Sparks: {formatSparkList(rec.sparks)}</Text>
                                {rec.reasons.map((reason) => (
                                    <Text key={reason} style={styles.reason}>
                                        {reason}
                                    </Text>
                                ))}
                                {index === 0 && <Text style={styles.best}>Best match for {selectedName}</Text>}
                            </View>
                        )
                    })
                )}
            </ScrollView>
        </SheetModal>
    )
}
