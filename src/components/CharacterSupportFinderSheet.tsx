import { useCallback, useEffect, useMemo, useState } from "react"
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { CharacterSupportRecommendationView } from "./CharacterSupportRecommendationView"
import { SheetModal } from "./ui/sheet-modal"
import { ModalFooterChip } from "./ui/modal-list"
import { Input } from "./ui/input"
import {
    formatSupportDeckClipboard,
    listCharactersForSupportFinder,
    recommendSupportDeckForCharacter,
    type SupportDeckRecommendation,
} from "../lib/recommendSupportDeck"
import { copyToClipboard } from "../lib/utils"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

interface CharacterSupportFinderSheetProps {
    visible: boolean
    initialCharacterName?: string
    ownedInventory?: string[]
    onClose: () => void
    onApplyFriendBorrow: (characterName: string, borrowOrder: string[]) => void
    onApplyFullDeck: (characterName: string, ownedCards: string[], borrowOrder: string[]) => void
    onEditOwnedInventory?: () => void
}

/**
 * Searchable sheet: pick any Uma and view recommended support deck + friend borrow order.
 */
export const CharacterSupportFinderSheet = ({
    visible,
    initialCharacterName,
    ownedInventory = [],
    onClose,
    onApplyFriendBorrow,
    onApplyFullDeck,
    onEditOwnedInventory,
}: CharacterSupportFinderSheetProps) => {
    const { colors } = useTheme()
    const [search, setSearch] = useState("")
    const [selectedName, setSelectedName] = useState(initialCharacterName ?? "")

    useEffect(() => {
        if (visible) {
            setSelectedName(initialCharacterName ?? "")
            setSearch("")
        }
    }, [visible, initialCharacterName])

    const allCharacters = useMemo(() => listCharactersForSupportFinder(), [])
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return allCharacters
        return allCharacters.filter((c) => c.name.toLowerCase().includes(q))
    }, [allCharacters, search])

    const recommendation: SupportDeckRecommendation | null = useMemo(
        () => (selectedName ? recommendSupportDeckForCharacter(selectedName, { ownedInventory }) : null),
        [selectedName, ownedInventory],
    )

    const handleApplyBorrow = useCallback(() => {
        if (!recommendation) return
        onApplyFriendBorrow(recommendation.characterName, recommendation.friendBorrowOrder)
        onClose()
    }, [onApplyFriendBorrow, onClose, recommendation])

    const handleApplyFullDeck = useCallback(() => {
        if (!recommendation) return
        onApplyFullDeck(recommendation.characterName, recommendation.ownedCards, recommendation.friendBorrowOrder)
        onClose()
    }, [onApplyFullDeck, onClose, recommendation])

    const handleCopy = useCallback(async () => {
        if (!recommendation) return
        await copyToClipboard(formatSupportDeckClipboard(recommendation))
        Alert.alert("Copied", "Support deck copied to clipboard.")
    }, [recommendation])

    const styles = useMemo(
        () =>
            StyleSheet.create({
                intro: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18, marginBottom: SPACING.md },
                list: { maxHeight: 200, marginBottom: SPACING.md },
                row: {
                    paddingVertical: SPACING.sm,
                    paddingHorizontal: SPACING.md,
                    borderRadius: RADII.md,
                    borderWidth: 1,
                    borderColor: colors.borderHair,
                    marginBottom: SPACING.xs,
                    backgroundColor: colors.surface,
                },
                rowActive: { borderColor: colors.brand, backgroundColor: colors.brandSubtle },
                rowName: { ...TYPE.body, color: colors.text },
                rowApt: { ...TYPE.caption, color: colors.textMuted, marginTop: 2 },
                empty: { ...TYPE.caption, color: colors.textMuted, padding: SPACING.md },
                ownedRow: {
                    padding: SPACING.sm,
                    marginBottom: SPACING.md,
                    borderRadius: RADII.md,
                    borderWidth: 1,
                    borderColor: colors.borderHair,
                    backgroundColor: colors.surface,
                },
            }),
        [colors],
    )

    const header = (
        <View>
            <Text style={{ ...TYPE.h2, color: colors.text }}>Best supports for your Uma</Text>
            <Text style={styles.intro}>
                Pick a trainee to see a recommended four-support deck plus friend borrow order. Decks match parent-farming routes when a character setup exists; otherwise aptitudes pick a route.
            </Text>
        </View>
    )

    const footer = (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, justifyContent: "flex-end" }}>
            <ModalFooterChip label="Close" onPress={onClose} tone="neutral" />
            <ModalFooterChip label="Copy deck" onPress={handleCopy} tone="neutral" disabled={!recommendation} />
            <ModalFooterChip label="Apply friend borrow" onPress={handleApplyBorrow} tone="neutral" disabled={!recommendation} />
            <ModalFooterChip label="Apply full deck" onPress={handleApplyFullDeck} tone="primary" disabled={!recommendation} />
        </View>
    )

    return (
        <SheetModal visible={visible} onRequestClose={onClose} header={header} footer={footer} maxWidth={560} heightFraction={0.85}>
            <ScrollView keyboardShouldPersistTaps="handled">
                {onEditOwnedInventory && (
                    <Pressable style={styles.ownedRow} onPress={onEditOwnedInventory} android_ripple={{ color: colors.ripple, foreground: true }}>
                        <Text style={{ ...TYPE.body, color: colors.brand, fontWeight: "600" }}>Owned inventory: {ownedInventory.length} card(s)</Text>
                        <Text style={{ ...TYPE.caption, color: colors.textMuted, marginTop: 4 }}>Tap to edit — recommendations prefer owned cards when swapping slots.</Text>
                    </Pressable>
                )}
                <Input value={search} onChangeText={setSearch} placeholder="Search characters..." />
                <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {filtered.map((c) => {
                        const active = selectedName === c.name
                        return (
                            <Pressable
                                key={c.name}
                                style={[styles.row, active && styles.rowActive]}
                                onPress={() => setSelectedName(c.name)}
                                android_ripple={{ color: colors.ripple, foreground: true }}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                            >
                                <Text style={styles.rowName}>{c.name}</Text>
                                <Text style={styles.rowApt}>
                                    Sprint {c.distanceAptitudes.Sprint} · Mile {c.distanceAptitudes.Mile} · Med {c.distanceAptitudes.Medium} · Long{" "}
                                    {c.distanceAptitudes.Long}
                                </Text>
                            </Pressable>
                        )
                    })}
                    {filtered.length === 0 && <Text style={styles.empty}>No matches.</Text>}
                </ScrollView>
                {recommendation ? <CharacterSupportRecommendationView recommendation={recommendation} /> : null}
            </ScrollView>
        </SheetModal>
    )
}
