import React, { useCallback, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { FlashList } from "@shopify/flash-list"
import * as Clipboard from "expo-clipboard"
import { Copy, Trash2 } from "lucide-react-native"
import { DomainHeader } from "../../components/ui/domain-header"
import CustomButton from "../../components/CustomButton"
import { ErrorReportEntry, useErrorReports } from "../../context/ErrorReportContext"
import { useTheme } from "../../context/ThemeContext"
import type { ThemeColors } from "../../lib/theme"
import { TYPE } from "../../lib/type"
import { usePerformanceLogging } from "../../hooks/usePerformanceLogging"

/**
 * Returns a human-readable label and accent color for an error report's source.
 * @param source The entry's source.
 * @param colors The active theme's color tokens.
 * @returns The label and color to render for the entry.
 */
function describeSource(source: ErrorReportEntry["source"], colors: ThemeColors): { label: string; color: string } {
    switch (source) {
        case "js-crash":
            return { label: "JS Crash", color: colors.error }
        case "js-rejection":
            return { label: "Unhandled Promise", color: colors.error }
        case "native-warning":
            return { label: "Native Warning", color: colors.warning }
        default:
            return { label: "Native Error", color: colors.error }
    }
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.bg },
        content: { padding: 12 },
        empty: { marginTop: 24, textAlign: "center", color: colors.textMuted },
        actions: { flexDirection: "row", gap: 8, marginBottom: 4 },
        item: {
            backgroundColor: colors.surface,
            borderRadius: 10,
            padding: 12,
            marginBottom: 8,
            borderLeftWidth: 3,
        },
        itemHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
        badge: { ...TYPE.caption, fontWeight: "700" } as any,
        timestamp: { ...TYPE.caption, color: colors.textMuted },
        message: { ...TYPE.body, color: colors.text, fontFamily: "monospace" },
        stack: { ...TYPE.caption, color: colors.textSubtle, fontFamily: "monospace", marginTop: 6 },
    })

/**
 * The Error Reports page. Lists captured JS crashes, unhandled promise rejections, and native
 * `[ERROR]`/`[WARNING]` log lines from the bot service in one place, newest first.
 */
const ErrorReports: React.FC = () => {
    usePerformanceLogging("ErrorReports")
    const { colors } = useTheme()
    const styles = useMemo(() => createStyles(colors), [colors])
    const { errors, clearErrors } = useErrorReports()
    const [copiedAll, setCopiedAll] = useState(false)

    const sorted = useMemo(() => [...errors].sort((a, b) => b.timestamp - a.timestamp), [errors])

    /**
     * Copies every captured error report to the clipboard, formatted as plain text.
     */
    const handleCopyAll = useCallback(async () => {
        const text = sorted.map((e) => `[${new Date(e.timestamp).toISOString()}] ${e.source}: ${e.message}${e.stack ? "\n" + e.stack : ""}`).join("\n\n")
        await Clipboard.setStringAsync(text)
        setCopiedAll(true)
        setTimeout(() => setCopiedAll(false), 1500)
    }, [sorted])

    /**
     * Renders a single error report row, color-coded by source.
     * @param item The error report entry to render.
     */
    const renderItem = useCallback(
        ({ item }: { item: ErrorReportEntry }) => {
            const { label, color } = describeSource(item.source, colors)
            return (
                <Pressable
                    style={[styles.item, { borderLeftColor: color }]}
                    onLongPress={() => Clipboard.setStringAsync(`${item.message}${item.stack ? "\n" + item.stack : ""}`)}
                    delayLongPress={500}
                    android_ripple={{ color: colors.ripple, foreground: true }}
                >
                    <View style={styles.itemHeader}>
                        <Text style={[styles.badge, { color }]}>{label}</Text>
                        <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
                    </View>
                    <Text style={styles.message}>{item.message}</Text>
                    {item.stack ? (
                        <Text style={styles.stack} numberOfLines={6}>
                            {item.stack}
                        </Text>
                    ) : null}
                </Pressable>
            )
        },
        [colors, styles]
    )

    const keyExtractor = useCallback((item: ErrorReportEntry) => item.id, [])

    return (
        <View style={styles.root}>
            <View style={styles.content}>
                <DomainHeader
                    breadcrumb="Tools"
                    title="Error Reports"
                    subtitle="JS crashes, unhandled rejections, and native errors/warnings logged across sessions."
                    style={{ marginBottom: 12 }}
                />
                <View style={styles.actions}>
                    <CustomButton variant="outline" style={{ flex: 1 }} icon={<Copy size={16} color={colors.text} />} onPress={handleCopyAll} disabled={sorted.length === 0}>
                        {copiedAll ? "Copied!" : "Copy All"}
                    </CustomButton>
                    <CustomButton variant="outline" style={{ flex: 1 }} icon={<Trash2 size={16} color={colors.error} />} onPress={clearErrors} disabled={sorted.length === 0}>
                        Clear
                    </CustomButton>
                </View>
            </View>
            <View style={{ flex: 1 }}>
                <FlashList
                    data={sorted}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12 }}
                    ListEmptyComponent={<Text style={styles.empty}>No errors recorded. Nice.</Text>}
                />
            </View>
        </View>
    )
}

export default ErrorReports
