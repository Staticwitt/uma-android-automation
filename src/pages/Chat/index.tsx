import { useCallback, useMemo, useState } from "react"
import { View, ScrollView, StyleSheet, TextInput, Text, NativeModules } from "react-native"
import { useTheme } from "../../context/ThemeContext"
import CustomButton from "../../components/CustomButton"
import PageHeader from "../../components/PageHeader"

interface DocResult {
    id: string
    source: string
    heading: string
    text: string
    score: number
}

/**
 * Ask-the-docs chat page.
 *
 * v1 is retrieve-only: the user types a question, the native [LLMChatModule.searchDocs] runs MiniLM embedding
 * and cosine-searches the bundled doc index, and the top chunks are shown verbatim with their source file and
 * heading. No generation yet — zero hallucination risk. Generation will layer on once the MediaPipe/Nano services
 * and grounding verifier are wired through [ChatOrchestrator].
 */
const Chat = () => {
    const { colors } = useTheme()
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<DocResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [searched, setSearched] = useState(false)

    const handleSearch = useCallback(async () => {
        const q = query.trim()
        if (!q) return
        setIsSearching(true)
        setSearched(true)
        try {
            const raw = await NativeModules.LLMChatModule.searchDocs(q, 4)
            setResults(raw as DocResult[])
        } catch {
            setResults([])
        } finally {
            setIsSearching(false)
        }
    }, [query])

    const styles = useMemo(
        () =>
            StyleSheet.create({
                root: {
                    flex: 1,
                    margin: 10,
                    backgroundColor: colors.background,
                },
                inputRow: {
                    flexDirection: "row",
                    gap: 8,
                    marginVertical: 10,
                },
                input: {
                    flex: 1,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    color: colors.foreground,
                    backgroundColor: colors.card,
                },
                resultCard: {
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 6,
                    padding: 10,
                    marginBottom: 10,
                    backgroundColor: colors.card,
                },
                resultHeading: {
                    fontWeight: "600",
                    color: colors.foreground,
                    marginBottom: 4,
                },
                resultMeta: {
                    fontSize: 11,
                    color: colors.mutedForeground,
                    marginBottom: 6,
                },
                resultText: {
                    color: colors.foreground,
                },
                emptyText: {
                    color: colors.mutedForeground,
                    textAlign: "center",
                    marginTop: 20,
                    paddingHorizontal: 20,
                },
                disclaimer: {
                    fontSize: 11,
                    color: colors.mutedForeground,
                    marginTop: 4,
                    marginBottom: 8,
                    fontStyle: "italic",
                },
            }),
        [colors]
    )

    return (
        <View style={styles.root}>
            <PageHeader title="Ask the Docs" />
            <Text style={styles.disclaimer}>
                Answers are matched verbatim from README.md, HOW_IT_WORKS.md, and in-app option descriptions. Fully offline.
            </Text>

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Ask a question about the app..."
                    placeholderTextColor={colors.mutedForeground}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                    editable={!isSearching}
                />
                <CustomButton variant="primary" onPress={handleSearch} isLoading={isSearching} disabled={isSearching || query.trim().length === 0}>
                    Search
                </CustomButton>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
                {results.map((r) => (
                    <View key={r.id} style={styles.resultCard}>
                        <Text style={styles.resultHeading}>{r.heading}</Text>
                        <Text style={styles.resultMeta}>
                            {r.source} · similarity {(r.score * 100).toFixed(0)}%
                        </Text>
                        <Text style={styles.resultText}>{r.text}</Text>
                    </View>
                ))}
                {searched && !isSearching && results.length === 0 && <Text style={styles.emptyText}>No matching documentation found.</Text>}
            </ScrollView>
        </View>
    )
}

export default Chat
