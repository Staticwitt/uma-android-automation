import React, { useEffect, useMemo, useState } from "react"
import { View, Text, ActivityIndicator, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"
import type { Settings } from "../context/BotStateContext"
import {
    assessParentFarmingPreviewFeasibility,
    formatPreviewFeasibilitySummary,
    type ParentFarmingPreviewFeasibilityResult,
} from "../lib/parentFarmingPreviewFeasibility"
import { formatFeasibilityIssues } from "../lib/parentFarmingFeasibility"
import { Callout } from "./ui/callout"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"

interface ParentFarmingAutoPreviewCardProps {
    settings: Settings
    enabled: boolean
}

export const ParentFarmingAutoPreviewCard = ({ settings, enabled }: ParentFarmingAutoPreviewCardProps) => {
    const { colors } = useTheme()
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<ParentFarmingPreviewFeasibilityResult | null>(null)

    useEffect(() => {
        if (!enabled || !settings.racing.enableParentFarmingMode) {
            setResult(null)
            return
        }
        let cancelled = false
        const handle = setTimeout(() => {
            setLoading(true)
            assessParentFarmingPreviewFeasibility(settings)
                .then((preview) => {
                    if (!cancelled) setResult(preview)
                })
                .finally(() => {
                    if (!cancelled) setLoading(false)
                })
        }, 600)
        return () => {
            cancelled = true
            clearTimeout(handle)
        }
    }, [enabled, settings])

    const styles = useMemo(
        () =>
            StyleSheet.create({
                summary: { ...TYPE.body, color: colors.text, fontWeight: "600" },
                detail: { ...TYPE.caption, color: colors.textMuted, marginTop: SPACING.xs, lineHeight: 18 },
            }),
        [colors],
    )

    if (!enabled || !settings.racing.enableParentFarmingMode) return null

    return (
        <View style={{ marginBottom: SPACING.md }}>
            <Callout variant={result?.issues.some((i) => i.severity === "error") ? "danger" : "info"}>
                {loading && <ActivityIndicator color={colors.brand} />}
                {!loading && result && (
                    <>
                        <Text style={styles.summary}>{formatPreviewFeasibilitySummary(result)}</Text>
                        {result.issues.length > 0 && (
                            <Text style={styles.detail}>{formatFeasibilityIssues(result.issues).join("\n")}</Text>
                        )}
                    </>
                )}
                {!loading && !result && <Text style={styles.detail}>Checking schedule feasibility…</Text>}
            </Callout>
        </View>
    )
}
