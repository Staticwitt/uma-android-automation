import React, { useMemo } from "react"
import { View, Text, Pressable, StyleSheet } from "react-native"
import { ChevronRight } from "lucide-react-native"
import { GlassSurface } from "./glass-surface"
import { useTheme } from "../../context/ThemeContext"
import { TYPE } from "../../lib/type"
import { SPACING } from "../../lib/spacing"
import { RADII } from "../../lib/radii"

export interface DomainLandingCardProps {
    title: string
    description: string
    icon: React.ReactNode
    onPress: () => void
    /** When true, icon well uses brand tint. */
    active?: boolean
}

/**
 * Glass card linking to a settings sub-page from a domain landing hub.
 */
export const DomainLandingCard = ({ title, description, icon, onPress, active = false }: DomainLandingCardProps) => {
    const { colors } = useTheme()
    const styles = useMemo(
        () =>
            StyleSheet.create({
                row: { flexDirection: "row", alignItems: "center", gap: SPACING.md, padding: SPACING.md },
                iconWell: {
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    backgroundColor: active ? colors.brandSubtle : colors.surfaceRaised,
                    alignItems: "center",
                    justifyContent: "center",
                },
                body: { flex: 1 },
                title: { ...TYPE.body, color: colors.text, fontWeight: "600" as const },
                description: { ...TYPE.caption, color: colors.textMuted },
            }),
        [colors, active],
    )

    return (
        <Pressable onPress={onPress} android_ripple={{ color: colors.ripple, foreground: true }} accessibilityRole="button" style={{ marginBottom: SPACING.md }}>
            <GlassSurface style={{ borderRadius: RADII.lg }}>
                <View style={styles.row}>
                    <View style={styles.iconWell}>{icon}</View>
                    <View style={styles.body}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.description} numberOfLines={2}>
                            {description}
                        </Text>
                    </View>
                    <ChevronRight size={16} color={colors.textMuted} />
                </View>
            </GlassSurface>
        </Pressable>
    )
}
