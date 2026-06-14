import { useMemo } from "react"
import { View, Text, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"
import type { SupportDeckRecommendation, SupportDeckSlot } from "../lib/recommendSupportDeck"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

const roleLabel = (role: SupportDeckSlot["role"]): string => {
    switch (role) {
        case "trainee":
            return "Trainee"
        case "friend":
            return "Friend borrow"
        default:
            return "Support"
    }
}

interface CharacterSupportRecommendationViewProps {
    recommendation: SupportDeckRecommendation
}

/**
 * Read-only panel listing recommended trainee + support deck for a character.
 */
export const CharacterSupportRecommendationView = ({ recommendation }: CharacterSupportRecommendationViewProps) => {
    const { colors } = useTheme()

    const styles = useMemo(
        () =>
            StyleSheet.create({
                meta: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18, marginBottom: SPACING.sm },
                archetype: { ...TYPE.body, color: colors.text, fontWeight: "600", marginBottom: SPACING.xs },
                rationale: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18, marginBottom: SPACING.md },
                slot: {
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: SPACING.sm,
                    paddingVertical: SPACING.sm,
                    paddingHorizontal: SPACING.md,
                    borderRadius: RADII.md,
                    borderWidth: 1,
                    borderColor: colors.borderHair,
                    backgroundColor: colors.surface,
                    marginBottom: SPACING.xs,
                },
                slotRole: { ...TYPE.monoLabel, color: colors.brand, minWidth: 88 },
                slotName: { ...TYPE.body, color: colors.text, flex: 1 },
                slotType: { ...TYPE.caption, color: colors.textMuted },
                slotNote: { ...TYPE.caption, color: colors.textMuted, marginTop: 2 },
                borrow: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18, marginTop: SPACING.sm },
            }),
        [colors],
    )

    return (
        <View>
            <Text style={styles.archetype}>{recommendation.goalLabel} · {recommendation.archetype}</Text>
            <Text style={styles.meta}>
                Route: {recommendation.goalPresetKey}
                {recommendation.bundleKey ? ` · bundle ${recommendation.bundleKey}` : ""}
            </Text>
            <Text style={styles.rationale}>{recommendation.rationale}</Text>
            {recommendation.slots.map((slot) => (
                <View key={`${slot.role}-${slot.cardName}`} style={styles.slot}>
                    <Text style={styles.slotRole}>{roleLabel(slot.role)}</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.slotName}>{slot.cardName}</Text>
                        {slot.type ? <Text style={styles.slotType}>{slot.type}</Text> : null}
                        {slot.note ? <Text style={styles.slotNote}>{slot.note}</Text> : null}
                    </View>
                </View>
            ))}
            <Text style={styles.borrow}>
                Auto-borrow priority: {recommendation.friendBorrowOrder.slice(0, 5).join(" → ")}
            </Text>
        </View>
    )
}
