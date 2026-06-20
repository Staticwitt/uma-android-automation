import React, { useCallback, useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { FlashList } from "@shopify/flash-list"
import * as DocumentPicker from "expo-document-picker"
import { File } from "expo-file-system"
import ReportCard from "../../components/DecisionReport/ReportCard"
import FileDivider from "../../components/EventLog/FileDivider"
import { parseDecisionReports, type LogFileInput, type DecisionReportRecord, type FileDividerRecord } from "../../lib/decisionReportParser"
import CustomButton from "../../components/CustomButton"
import { useTheme } from "../../context/ThemeContext"
import { useToast } from "../../context/ToastContext"
import { useSettings } from "../../context/SettingsContext"
import Ionicons from "@react-native-vector-icons/ionicons"
import { DomainHeader } from "../../components/ui/domain-header"
import { usePerformanceLogging } from "../../hooks/usePerformanceLogging"

type MixedRecord = DecisionReportRecord | FileDividerRecord

/**
 * The Decision Report Viewer page.
 * Lets users import bot log files and browse the `[DECISION]`-tagged Decision Report blocks recorded by `DecisionTracer`
 * as expandable per-turn cards, instead of scanning raw log text to answer "why did the bot do X this turn?".
 */
const DecisionReportViewer: React.FC = () => {
    usePerformanceLogging("DecisionReportViewer")
    const { colors } = useTheme()
    const { showError } = useToast()
    const { openDataDirectory } = useSettings()

    const [records, setRecords] = useState<MixedRecord[]>([])

    const styles = useMemo(
        () =>
            StyleSheet.create({
                root: {
                    flex: 1,
                    backgroundColor: colors.bg,
                },
                content: {
                    padding: 12,
                },
                empty: {
                    marginTop: 12,
                    marginBottom: 12,
                    color: colors.textMuted,
                },
            }),
        [colors]
    )

    /**
     * Handles file selection for log files by reading the selected files and extracting Decision Report blocks.
     */
    async function onPickFiles() {
        try {
            const result = await DocumentPicker.getDocumentAsync({ multiple: true, type: "text/plain", copyToCacheDirectory: true })
            if (result.canceled) return

            const assets = result.assets || []
            const fileInputs: LogFileInput[] = []
            for (const a of assets) {
                const uri = a.uri
                const name = a.name || "log.txt"
                const content = await new File(uri).text()
                fileInputs.push({ name, content })
            }

            const res = parseDecisionReports(fileInputs)
            const errorMessages = res.errors.map((e) => e.message)

            // Defer state updates to prevent mounting conflicts when FlashList is updating.
            setTimeout(() => {
                setRecords(res.records)
                if (errorMessages.length > 0) {
                    showError(errorMessages.join("\n"), { durationMs: 6000 })
                }
            }, 0)
        } catch (e: any) {
            const errorMessage = String(e?.message || e)
            setTimeout(() => {
                showError(errorMessage)
            }, 0)
        }
    }

    const renderItem = useCallback(({ item }: { item: MixedRecord }) => {
        if (item.kind === "fileDivider") return <FileDivider divider={item} />
        return <ReportCard record={item} />
    }, [])

    const keyExtractor = useCallback((item: MixedRecord, idx: number) => {
        if (item.kind === "fileDivider") return `file-divider-${item.fileName}-${idx}`
        return `report-${item.fileName}-${item.dayNumber}-${idx}`
    }, [])

    return (
        <View style={styles.root}>
            <View style={styles.content}>
                {/* FlashList doesn't support sticky headers the same way as ScrollView, so PageHeader stays a sibling above the list (non-sticky). */}
                <DomainHeader
                    breadcrumb="Tools"
                    title="Decision Report Viewer"
                    subtitle="Import bot logs and browse why the bot made each decision, turn by turn."
                    style={{ marginBottom: 12 }}
                />

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <CustomButton variant="outline" style={{ flex: 1 }} icon={<Ionicons name="folder-outline" size={16} color={colors.text} />} onPress={openDataDirectory}>
                        Open Data Directory
                    </CustomButton>
                    <CustomButton variant="primary" style={{ flex: 1 }} icon={<Ionicons name="folder-open" size={16} color={colors.onBrand} />} onPress={onPickFiles}>
                        Select Log Files
                    </CustomButton>
                </View>
            </View>

            <View style={{ flex: 1 }}>
                <FlashList
                    data={records}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    getItemType={(item) => item.kind}
                    contentContainerStyle={{ paddingHorizontal: 12 }}
                    ListEmptyComponent={<Text style={styles.empty}>Select log files above to browse their Decision Report blocks.</Text>}
                />
            </View>
        </View>
    )
}

export default DecisionReportViewer
