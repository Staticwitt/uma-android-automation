import { useCallback, useEffect, useMemo, useState } from "react"
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"
import type { Settings } from "../context/BotStateContext"
import { previewSchedule, type SchedulePreview } from "../lib/solver/preview"
import { DEFAULT_WEIGHTS } from "../lib/solver/constants"
import racesData from "../data/races.json"
import epithetsData from "../data/epithets.json"

const RACES_DATA_JSON = JSON.stringify(racesData)
const EPITHETS_DATA_JSON = JSON.stringify(epithetsData)

const parseStringList = (json: string | undefined): string[] => {
    try {
        const parsed = JSON.parse(json || "[]")
        return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []
    } catch {
        return []
    }
}

interface ParentFarmingSolverPreviewProps {
    settings: Settings
    onOpenSolver?: () => void
}

/** Compact solver preview for parent-farming goal card. */
export const ParentFarmingSolverPreview = ({ settings, onOpenSolver }: ParentFarmingSolverPreviewProps) => {
    const { colors } = useTheme()
    const { racing, general } = settings
    const [preview, setPreview] = useState<SchedulePreview | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const snapshotKey = useMemo(() => {
        return JSON.stringify({
            scenario: general?.scenario || "Trackblazer",
            characterPreset: racing.smartRaceSolverCharacterPreset,
            targetEpithets: racing.smartRaceSolverTargetEpithets,
            forcedEpithets: racing.smartRaceSolverForcedEpithets,
            weights: racing.smartRaceSolverWeights,
            aptitudes: racing.smartRaceSolverAptitudes,
        })
    }, [general?.scenario, racing])

    const loadPreview = useCallback(async () => {
        if (!racing.enableSmartRaceSolver) return
        setLoading(true)
        setError(null)
        try {
            const aptitudes = JSON.parse(racing.smartRaceSolverAptitudes || "{}") as Record<string, string>
            const weights = { ...DEFAULT_WEIGHTS, ...JSON.parse(racing.smartRaceSolverWeights || "{}") }
            const result = await previewSchedule({
                scenario: general?.scenario || "Trackblazer",
                characterPreset: racing.smartRaceSolverCharacterPreset || "Special Week",
                aptitudes: {
                    Sprint: aptitudes.Sprint || "F",
                    Mile: aptitudes.Mile || "C",
                    Medium: aptitudes.Medium || "A",
                    Long: aptitudes.Long || "A",
                    Turf: aptitudes.Turf || "A",
                    Dirt: aptitudes.Dirt || "G",
                },
                targetEpithets: parseStringList(racing.smartRaceSolverTargetEpithets),
                forcedEpithets: parseStringList(racing.smartRaceSolverForcedEpithets),
                manualLocks: JSON.parse(racing.smartRaceSolverManualLocks || "{}"),
                weights,
                racesDataJson: RACES_DATA_JSON,
                epithetsDataJson: EPITHETS_DATA_JSON,
            })
            if (result.error) {
                setError(result.error)
                setPreview(null)
            } else {
                setPreview(result)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Preview failed")
            setPreview(null)
        } finally {
            setLoading(false)
        }
    }, [general?.scenario, racing])

    useEffect(() => {
        loadPreview()
    }, [loadPreview, snapshotKey])

    const styles = useMemo(
        () =>
            StyleSheet.create({
                root: {
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.borderHair,
                    backgroundColor: colors.surfaceRaised,
                    gap: 6,
                },
                label: { fontSize: 12, color: colors.textMuted, fontWeight: "700" },
                body: { fontSize: 13, color: colors.text, lineHeight: 18 },
                muted: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
                link: { fontSize: 12, color: colors.brand, fontWeight: "600" },
            }),
        [colors],
    )

    if (!racing.enableSmartRaceSolver) return null

    return (
        <View style={styles.root}>
            <Text style={styles.label}>SOLVER PREVIEW</Text>
            {loading ? (
                <ActivityIndicator color={colors.brand} size="small" />
            ) : error ? (
                <Text style={styles.muted}>{error}</Text>
            ) : preview ? (
                <>
                    <Text style={styles.body}>
                        {preview.projectedEpithets.length} projected epithet{preview.projectedEpithets.length === 1 ? "" : "s"} · score{" "}
                        {Math.round(preview.totalScore).toLocaleString()}
                    </Text>
                    {preview.projectedEpithets.length > 0 ? (
                        <Text style={styles.muted} numberOfLines={2}>
                            {preview.projectedEpithets.slice(0, 6).join(" · ")}
                            {preview.projectedEpithets.length > 6 ? " …" : ""}
                        </Text>
                    ) : null}
                </>
            ) : (
                <Text style={styles.muted}>No preview yet.</Text>
            )}
            {onOpenSolver ? (
                <Pressable onPress={onOpenSolver} accessibilityRole="button">
                    <Text style={styles.link}>Open full calendar</Text>
                </Pressable>
            ) : null}
        </View>
    )
}
