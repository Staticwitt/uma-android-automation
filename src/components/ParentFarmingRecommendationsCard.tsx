import React, { useCallback, useEffect, useState } from "react"
import { View, Text, ActivityIndicator, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"
import type { Settings } from "../context/BotStateContext"
import { buildParentFarmingRecommendations } from "../lib/parentFarmingRecommendations"
import { loadParentRunArchive } from "../lib/parentRunArchive"
import { Callout } from "./ui/callout"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"

interface ParentFarmingRecommendationsCardProps {
    settings: Settings
}

export const ParentFarmingRecommendationsCard = ({ settings }: ParentFarmingRecommendationsCardProps) => {
    const { colors } = useTheme()
    const [loading, setLoading] = useState(false)
    const [recs, setRecs] = useState<ReturnType<typeof buildParentFarmingRecommendations>>([])

    const refresh = useCallback(async () => {
        if (!settings.racing.enableParentFarmingMode) {
            setRecs([])
            return
        }
        setLoading(true)
        try {
            const runs = await loadParentRunArchive()
            setRecs(buildParentFarmingRecommendations(runs, settings))
        } finally {
            setLoading(false)
        }
    }, [settings])

    useEffect(() => {
        refresh()
    }, [refresh])

    if (!settings.racing.enableParentFarmingMode) return null

    return (
        <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.md }}>
            <Text style={{ ...TYPE.caption, color: colors.textMuted, marginBottom: SPACING.sm }}>
                Outcome-based tips from your archived parent runs.
            </Text>
            {loading ? (
                <ActivityIndicator color={colors.brand} />
            ) : (
                <View style={{ gap: SPACING.sm }}>
                    {recs.map((rec) => (
                        <Callout
                            key={rec.id}
                            variant={rec.severity === "warning" ? "warning" : "info"}
                        >
                            <Text style={{ ...TYPE.body, color: colors.text, fontWeight: "700" }}>{rec.title}</Text>
                            <Text style={{ ...TYPE.caption, color: colors.textMuted, marginTop: 4, lineHeight: 18 }}>{rec.detail}</Text>
                        </Callout>
                    ))}
                </View>
            )}
        </View>
    )
}
