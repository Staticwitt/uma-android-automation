import { View, Text, StyleSheet } from "react-native"
import PageHeader, { type PageHeaderProps } from "../PageHeader"
import { useTheme } from "../../context/ThemeContext"
import { TYPE } from "../../lib/type"
import { SPACING } from "../../lib/spacing"

export interface DomainHeaderProps extends PageHeaderProps {
    /** Optional domain label shown above the page title (e.g. "Racing"). */
    breadcrumb?: string
    /** Optional one-line summary under the title area. */
    subtitle?: string
}

/**
 * Page header with optional domain breadcrumb and subtitle for settings domains.
 */
export const DomainHeader = ({ breadcrumb, subtitle, title, titleComponent, ...rest }: DomainHeaderProps) => {
    const { colors } = useTheme()

    const composedTitle =
        titleComponent ??
        (breadcrumb || subtitle ? (
            <View style={styles.titleStack}>
                {breadcrumb ? <Text style={[TYPE.monoLabel, { color: colors.textMuted }]}>{breadcrumb.toUpperCase()}</Text> : null}
                {title ? <Text style={[TYPE.h1, { color: colors.text }]}>{title}</Text> : null}
                {subtitle ? <Text style={[TYPE.caption, { color: colors.textMuted }]}>{subtitle}</Text> : null}
            </View>
        ) : undefined)

    return <PageHeader {...rest} title={composedTitle ? "" : title} titleComponent={composedTitle} />
}

const styles = StyleSheet.create({
    titleStack: {
        flex: 1,
        minWidth: 0,
        gap: 2,
        paddingVertical: SPACING.xs,
    },
})
