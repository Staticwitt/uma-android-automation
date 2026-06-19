import React, { useCallback, useEffect, useMemo, useState } from "react"
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { SheetModal } from "./ui/sheet-modal"
import { ModalFooterChip } from "./ui/modal-list"
import { buildParentFarmingAnalytics } from "../lib/parentFarmingAnalytics"
import { loadParentRunArchive } from "../lib/parentRunArchive"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

interface ParentFarmingAnalyticsSheetProps {
    visible: boolean
    onClose: () => void
}

export const ParentFarmingAnalyticsSheet = ({ visible, onClose }: ParentFarmingAnalyticsSheetProps) => {
    const { colors } = useTheme()
    const [loading, setLoading] = useState(false)
    const [summary, setSummary] = useState<ReturnType<typeof buildParentFarmingAnalytics> | null>(null)

    const refresh = useCallback(async () => {
        setLoading(true)
        try {
            const runs = await loadParentRunArchive()
            setSummary(buildParentFarmingAnalytics(runs))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (visible) refresh()
    }, [visible, refresh])

    const styles = useMemo(
        () =>
            StyleSheet.create({
                section: { marginBottom: SPACING.lg },
                heading: { ...TYPE.h2, color: colors.text, marginBottom: SPACING.sm },
                card: {
                    padding: SPACING.md,
                    borderRadius: RADII.md,
                    borderWidth: 1,
                    borderColor: colors.borderHair,
                    backgroundColor: colors.surface,
                    marginBottom: SPACING.sm,
                },
                title: { ...TYPE.body, color: colors.text, fontWeight: "700" },
                meta: { ...TYPE.caption, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
                trend: { ...TYPE.monoLabel, color: colors.brand, marginTop: SPACING.sm },
            }),
        [colors],
    )

    const header = <Text style={{ ...TYPE.h2, color: colors.text }}>Parent farming analytics</Text>
    const footer = <ModalFooterChip label="Close" onPress={onClose} />

    return (
        <SheetModal visible={visible} onRequestClose={onClose} header={header} footer={footer} maxWidth={640} heightFraction={0.8}>
            {loading && <ActivityIndicator color={colors.brand} style={{ marginVertical: SPACING.lg }} />}
            {!loading && summary && (
                <ScrollView>
                    <View style={styles.section}>
                        <Text style={styles.heading}>Overview</Text>
                        <Text style={styles.meta}>
                            {summary.totalRuns} archived runs · recent trend: {summary.recentTrend || "—"}
                        </Text>
                    </View>
                    <View style={styles.section}>
                        <Text style={styles.heading}>By profile</Text>
                        {summary.profiles.length === 0 && <Text style={styles.meta}>No archived runs yet.</Text>}
                        {summary.profiles.map((row) => (
                            <View key={row.profileName} style={styles.card}>
                                <Text style={styles.title}>{row.profileName}</Text>
                                <Text style={styles.meta}>
                                    {row.runCount} runs · avg {row.avgQuality} · best {row.bestGrade} ({row.bestQuality}) · top {row.topCharacter}
                                </Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.section}>
                        <Text style={styles.heading}>By character</Text>
                        {summary.characters.map((row) => (
                            <View key={row.characterKey} style={styles.card}>
                                <Text style={styles.title}>{row.characterKey}</Text>
                                <Text style={styles.meta}>
                                    {row.runCount} runs · avg {row.avgQuality} · best {row.bestQuality} · last {row.lastScenario}
                                </Text>
                                {row.trend ? <Text style={styles.trend}>{row.trend}</Text> : null}
                            </View>
                        ))}
                    </View>
                    {summary.goalPresets.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.heading}>By goal queue slot</Text>
                            {summary.goalPresets.map((row) => (
                                <View key={row.goalPresetKey} style={styles.card}>
                                    <Text style={styles.title}>{row.goalPresetKey}</Text>
                                    <Text style={styles.meta}>
                                        {row.runCount} runs · avg {row.avgQuality} · best {row.bestQuality} · last {row.lastScenario}
                                    </Text>
                                    {row.trend ? <Text style={styles.trend}>{row.trend}</Text> : null}
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            )}
        </SheetModal>
    )
}
