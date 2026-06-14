import { useCallback, useEffect, useMemo, useState } from "react"
import { View, Text, ScrollView, StyleSheet } from "react-native"
import supportsData from "../data/supports.json"
import { useTheme } from "../context/ThemeContext"
import DraggablePriorityList from "./DraggablePriorityList"
import { SheetModal } from "./ui/sheet-modal"
import { ModalFooterChip } from "./ui/modal-list"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"

const ALL_SUPPORT_NAMES = Object.keys(supportsData).sort((a, b) => a.localeCompare(b))

interface OwnedSupportInventorySheetProps {
    visible: boolean
    ownedCards: string[]
    onClose: () => void
    onSave: (cards: string[]) => void
}

/**
 * Multi-select sheet for support cards the user owns. Recommendations prefer these names when swapping deck slots.
 */
export const OwnedSupportInventorySheet = ({ visible, ownedCards, onClose, onSave }: OwnedSupportInventorySheetProps) => {
    const { colors } = useTheme()
    const [selectedIds, setSelectedIds] = useState<string[]>(ownedCards)

    useEffect(() => {
        if (visible) setSelectedIds(ownedCards)
    }, [visible, ownedCards])

    const items = useMemo(() => ALL_SUPPORT_NAMES.map((name) => ({ id: name, label: name })), [])

    const handleSave = useCallback(() => {
        onSave(selectedIds)
        onClose()
    }, [onClose, onSave, selectedIds])

    const styles = useMemo(
        () =>
            StyleSheet.create({
                intro: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18, marginBottom: SPACING.md },
            }),
        [colors],
    )

    const header = (
        <View>
            <Text style={{ ...TYPE.h2, color: colors.text }}>Owned support cards</Text>
            <Text style={styles.intro}>
                Optional. When set, deck recommendations prefer cards you own when swapping slots. Does not limit friend borrow OCR.
            </Text>
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
                <DraggablePriorityList
                    items={items}
                    selectedItems={selectedIds}
                    onSelectionChange={setSelectedIds}
                    onOrderChange={setSelectedIds}
                />
            </ScrollView>
        </SheetModal>
    )
}
