import { useMemo, type ReactNode } from "react"
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native"
import { useTheme } from "../../context/ThemeContext"
import { TYPE } from "../../lib/type"
import { SPACING } from "../../lib/spacing"
import { RADII } from "../../lib/radii"

export type CalloutVariant = "info" | "warning" | "success" | "danger"

export interface CalloutProps {
    /** Visual tone for background and border. */
    variant?: CalloutVariant
    /** Optional short title rendered above body text. */
    title?: string
    /** Callout body. Strings render with default body styles. */
    children: ReactNode
    style?: StyleProp<ViewStyle>
}

/**
 * Unified inline callout for info, warnings, success, and error states.
 * Replaces legacy InfoContainer / WarningContainer styling with semantic tokens.
 */
export const Callout = ({ variant = "info", title, children, style }: CalloutProps) => {
    const { colors } = useTheme()

    const palette = useMemo(() => {
        switch (variant) {
            case "warning":
                return {
                    backgroundColor: colors.warningSubtle ?? colors.warningBg,
                    borderColor: colors.warningBorder ?? colors.warning,
                    textColor: colors.warningText ?? colors.text,
                }
            case "success":
                return {
                    backgroundColor: colors.successSubtle,
                    borderColor: colors.success,
                    textColor: colors.text,
                }
            case "danger":
                return {
                    backgroundColor: "rgba(244, 63, 94, 0.10)",
                    borderColor: colors.error,
                    textColor: colors.text,
                }
            case "info":
            default:
                return {
                    backgroundColor: colors.brandSubtle,
                    borderColor: colors.brandBorder,
                    textColor: colors.text,
                }
        }
    }, [colors, variant])

    const styles = useMemo(
        () =>
            StyleSheet.create({
                container: {
                    backgroundColor: palette.backgroundColor,
                    borderLeftWidth: 3,
                    borderLeftColor: palette.borderColor,
                    borderRadius: RADII.md,
                    padding: SPACING.md,
                    marginTop: SPACING.sm,
                },
                title: {
                    ...TYPE.body,
                    color: palette.textColor,
                    fontWeight: "600",
                    marginBottom: SPACING.xs,
                },
                text: {
                    ...TYPE.caption,
                    color: palette.textColor,
                    lineHeight: 20,
                },
            }),
        [palette],
    )

    return (
        <View style={[styles.container, style]}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {typeof children === "string" ? <Text style={styles.text}>{children}</Text> : children}
        </View>
    )
}
