import { useMemo } from "react"
import { View, Text, StyleSheet, Pressable } from "react-native"
import { useTheme } from "../context/ThemeContext"
import type { Settings } from "../context/BotStateContext"
import {
    getCareerAutomationSteps,
    isCareerSelectionReady,
    isFullCareerAutomationEnabled,
    type CareerAutomationStepStatus,
} from "../lib/parentFarmingCareerAutomation"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

interface ParentFarmingCareerAutomationCardProps {
    settings: Settings
    onEnableFullAutomation: () => void
}

const statusGlyph = (status: CareerAutomationStepStatus): string => {
    switch (status) {
        case "ready":
            return "✓"
        case "warning":
            return "!"
        default:
            return "○"
    }
}

const statusColor = (status: CareerAutomationStepStatus, colors: ReturnType<typeof useTheme>["colors"]): string => {
    switch (status) {
        case "ready":
            return colors.brand
        case "warning":
            return colors.warning ?? colors.textMuted
        default:
            return colors.textMuted
    }
}

/**
 * Readiness checklist and one-tap enable for career-selection automation.
 */
export const ParentFarmingCareerAutomationCard = ({ settings, onEnableFullAutomation }: ParentFarmingCareerAutomationCardProps) => {
    const { colors } = useTheme()
    const steps = useMemo(() => getCareerAutomationSteps(settings), [settings])
    const ready = isCareerSelectionReady(settings)
    const fullAutomation = isFullCareerAutomationEnabled(settings)

    const styles = useMemo(
        () =>
            StyleSheet.create({
                root: {
                    marginHorizontal: SPACING.md,
                    marginBottom: SPACING.md,
                    padding: SPACING.md,
                    borderRadius: RADII.lg,
                    borderWidth: 1,
                    borderColor: ready ? colors.brand : colors.borderHair,
                    backgroundColor: ready ? colors.brandSubtle : colors.surfaceRaised,
                    gap: SPACING.sm,
                },
                headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm },
                title: { ...TYPE.monoLabel, color: colors.brand, fontWeight: "700", flex: 1 },
                badge: {
                    paddingVertical: 2,
                    paddingHorizontal: SPACING.sm,
                    borderRadius: RADII.sm,
                    backgroundColor: ready ? colors.brand : colors.surface,
                    borderWidth: 1,
                    borderColor: ready ? colors.brand : colors.borderHair,
                },
                badgeText: { ...TYPE.caption, color: ready ? colors.bg : colors.textMuted, fontWeight: "700" },
                flow: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18 },
                stepRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm },
                stepGlyph: { ...TYPE.body, fontWeight: "700", width: 16, textAlign: "center" },
                stepBody: { flex: 1 },
                stepLabel: { ...TYPE.body, color: colors.text, fontWeight: "600" },
                stepDetail: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18, marginTop: 2 },
                cta: {
                    marginTop: SPACING.xs,
                    paddingVertical: SPACING.sm,
                    paddingHorizontal: SPACING.md,
                    borderRadius: RADII.md,
                    backgroundColor: colors.brand,
                    alignItems: "center",
                },
                ctaText: { ...TYPE.caption, color: colors.bg, fontWeight: "700" },
                hint: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18 },
            }),
        [colors, ready],
    )

    return (
        <View style={styles.root}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>CAREER SELECTION</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{ready ? "READY" : fullAutomation ? "NEEDS SETUP" : "PARTIAL"}</Text>
                </View>
            </View>
            <Text style={styles.flow}>Bot order: legacy parents → start career → train (equip/borrow supports manually)</Text>
            {steps.map((step) => (
                <View key={step.id} style={styles.stepRow}>
                    <Text style={[styles.stepGlyph, { color: statusColor(step.status, colors) }]}>{statusGlyph(step.status)}</Text>
                    <View style={styles.stepBody}>
                        <Text style={styles.stepLabel}>{step.label}</Text>
                        <Text style={styles.stepDetail}>{step.detail}</Text>
                    </View>
                </View>
            ))}
            {!fullAutomation ? (
                <Pressable onPress={onEnableFullAutomation} style={styles.cta} accessibilityRole="button">
                    <Text style={styles.ctaText}>Enable full career automation</Text>
                </Pressable>
            ) : ready ? (
                <Text style={styles.hint}>Start the bot on the career selection screen — no manual taps needed before training.</Text>
            ) : (
                <Text style={styles.hint}>Pick a character setup or goal preset to finish readiness.</Text>
            )}
        </View>
    )
}
