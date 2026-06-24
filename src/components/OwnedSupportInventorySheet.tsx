import { useCallback, useEffect, useMemo, useState } from "react"
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native"
import Ionicons from "@react-native-vector-icons/ionicons"
import supportsData from "../data/supports.json"
import { useTheme } from "../context/ThemeContext"
import DraggablePriorityList from "./DraggablePriorityList"
import { SheetModal } from "./ui/sheet-modal"
import { ModalFooterChip } from "./ui/modal-list"
import { Input } from "./ui/input"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"
import { clampLimitBreak, MAX_LIMIT_BREAK } from "../lib/supportDeckScoring"

const ALL_SUPPORT_NAMES = Object.keys(supportsData).sort((a, b) => a.localeCompare(b))

interface OwnedSupportInventorySheetProps {
    visible: boolean
    ownedCards: string[]
    /** Card name → limit break level (0-4); unlisted cards default to MLB. */
    limitBreaks?: Record<string, number>
    onClose: () => void
    onSave: (cards: string[], limitBreaks: Record<string, number>) => void
}

const LimitBreakStepper = ({ level, onChange }: { level: number; onChange: (next: number) => void }) => {
    const { colors } = useTheme()
    const styles = useMemo(
        () =>
            StyleSheet.create({
                row: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
                button: {
                    width: 22,
                    height: 22,
                    borderRadius: RADII.sm,
                    borderWidth: 1,
                    borderColor: colors.borderHair,
                    alignItems: "center",
                    justifyContent: "center",
                },
                value: { ...TYPE.monoLabel, color: colors.text, fontSize: 11, minWidth: 30, textAlign: "center" },
            }),
        [colors],
    )
    return (
        <View style={styles.row}>
            <Pressable
                style={styles.button}
                onPress={() => onChange(clampLimitBreak(level - 1))}
                disabled={level <= 0}
                accessibilityLabel="Decrease limit break"
            >
                <Ionicons name="remove" size={14} color={level <= 0 ? colors.textMuted : colors.text} />
            </Pressable>
            <Text style={styles.value}>{level >= MAX_LIMIT_BREAK ? "MLB" : `LB${level}`}</Text>
            <Pressable
                style={styles.button}
                onPress={() => onChange(clampLimitBreak(level + 1))}
                disabled={level >= MAX_LIMIT_BREAK}
                accessibilityLabel="Increase limit break"
            >
                <Ionicons name="add" size={14} color={level >= MAX_LIMIT_BREAK ? colors.textMuted : colors.text} />
            </Pressable>
        </View>
    )
}

/**
 * Multi-select sheet for support cards the user owns. Recommendations prefer these names when swapping deck slots.
 * Each owned card also gets a limit break level (0-4), which scales its contribution to deck/borrow scoring.
 */
export const OwnedSupportInventorySheet = ({ visible, ownedCards, limitBreaks, onClose, onSave }: OwnedSupportInventorySheetProps) => {
    const { colors } = useTheme()
    const [selectedIds, setSelectedIds] = useState<string[]>(ownedCards)
    const [cardLimitBreaks, setCardLimitBreaks] = useState<Record<string, number>>(limitBreaks ?? {})
    const [search, setSearch] = useState("")

    useEffect(() => {
        if (visible) {
            setSelectedIds(ownedCards)
            setCardLimitBreaks(limitBreaks ?? {})
            setSearch("")
        }
    }, [visible, ownedCards, limitBreaks])

    const items = useMemo(() => ALL_SUPPORT_NAMES.map((name) => ({ id: name, label: name })), [])

    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return items
        return items.filter((item) => item.label.toLowerCase().includes(q))
    }, [items, search])

    const setCardLimitBreak = useCallback((name: string, level: number) => {
        setCardLimitBreaks((prev) => ({ ...prev, [name]: clampLimitBreak(level) }))
    }, [])

    const handleSave = useCallback(() => {
        const prunedLimitBreaks = Object.fromEntries(Object.entries(cardLimitBreaks).filter(([name]) => selectedIds.includes(name)))
        onSave(selectedIds, prunedLimitBreaks)
        onClose()
    }, [cardLimitBreaks, onClose, onSave, selectedIds])

    const styles = useMemo(
        () =>
            StyleSheet.create({
                intro: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18, marginBottom: SPACING.md },
                lbSectionTitle: { ...TYPE.monoLabel, color: colors.textMuted, fontSize: 10, letterSpacing: 1.2, marginBottom: SPACING.sm },
                lbRow: {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: SPACING.xs + 2,
                },
                lbLabel: { ...TYPE.body, color: colors.text, flex: 1 },
                separator: { borderTopWidth: 1, borderStyle: "dashed", borderColor: colors.borderHair, marginVertical: SPACING.md },
            }),
        [colors],
    )

    const header = (
        <View>
            <Text style={{ ...TYPE.h2, color: colors.text }}>Owned support cards</Text>
            <Text style={styles.intro}>
                Optional. When you own four or more cards, deck recommendations search your collection for the best type mix. Friend borrow is still automated separately.
            </Text>
            <Input
                value={search}
                onChangeText={setSearch}
                placeholder="Search supports…"
                autoCapitalize="none"
                autoCorrect={false}
            />
        </View>
    )

    const footer = (
        <View style={{ flexDirection: "row", gap: SPACING.sm, justifyContent: "flex-end" }}>
            <ModalFooterChip label="Cancel" onPress={onClose} tone="neutral" />
            <ModalFooterChip label="Save owned cards" onPress={handleSave} tone="primary" />
        </View>
    )

    return (
        <SheetModal visible={visible} onRequestClose={onClose} header={header} footer={footer} maxWidth={560} heightFraction={0.75}>
            <ScrollView keyboardShouldPersistTaps="handled">
                {selectedIds.length > 0 ? (
                    <>
                        <Text style={styles.lbSectionTitle}>LIMIT BREAK LEVELS</Text>
                        {selectedIds.map((name) => (
                            <View key={name} style={styles.lbRow}>
                                <Text style={styles.lbLabel}>{name}</Text>
                                <LimitBreakStepper
                                    level={clampLimitBreak(cardLimitBreaks[name] ?? MAX_LIMIT_BREAK)}
                                    onChange={(next) => setCardLimitBreak(name, next)}
                                />
                            </View>
                        ))}
                        <View style={styles.separator} />
                    </>
                ) : null}
                <DraggablePriorityList
                    items={filteredItems}
                    selectedItems={selectedIds}
                    onSelectionChange={setSelectedIds}
                    onOrderChange={setSelectedIds}
                />
            </ScrollView>
        </SheetModal>
    )
}
