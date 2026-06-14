import { useMemo, useState, useCallback, useEffect } from "react"
import { View, Text, ScrollView, StyleSheet } from "react-native"
import supportsData from "../data/supports.json"
import { useTheme } from "../context/ThemeContext"
import type { ParentFarmingCharacterBundle } from "../lib/parentFarmingCharacterBundles"
import { resolveSupportBorrowCardsForBundle, parseSupportBorrowOverrides, type ParentFarmingSupportBorrowOverrides } from "../lib/parentFarmingSupportBorrow"
import DraggablePriorityList from "./DraggablePriorityList"
import { SheetModal } from "./ui/sheet-modal"
import { ModalFooterChip } from "./ui/modal-list"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"

const ALL_SUPPORT_NAMES = Object.keys(supportsData).sort((a, b) => a.localeCompare(b))

interface ParentFarmingBundleSupportSheetProps {
    visible: boolean
    bundle: ParentFarmingCharacterBundle | null
    overrides: ParentFarmingSupportBorrowOverrides
    onClose: () => void
    onSave: (bundleKey: string, cards: string[]) => void
}

/**
 * Ordered multi-select sheet for a bundle's friend support borrow list.
 */
export const ParentFarmingBundleSupportSheet = ({ visible, bundle, overrides, onClose, onSave }: ParentFarmingBundleSupportSheetProps) => {
    const { colors } = useTheme()
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    useEffect(() => {
        if (visible && bundle) {
            setSelectedIds(resolveSupportBorrowCardsForBundle(bundle, overrides))
        }
    }, [visible, bundle, overrides])

    const items = useMemo(
        () => ALL_SUPPORT_NAMES.map((name) => ({ id: name, label: name })),
        [],
    )

    const handleSave = useCallback(() => {
        if (!bundle) return
        onSave(bundle.key, selectedIds)
        onClose()
    }, [bundle, onClose, onSave, selectedIds])

    const styles = useMemo(
        () =>
            StyleSheet.create({
                intro: { ...TYPE.caption, color: colors.textMuted, lineHeight: 18, marginBottom: SPACING.md },
            }),
        [colors],
    )

    if (!bundle) return null

    const header = (
        <View>
            <Text style={{ ...TYPE.h2, color: colors.text }}>Support borrow — {bundle.label}</Text>
            <Text style={styles.intro}>
                Pick friend supports in priority order (top = first OCR match at career selection). Up to five is typical for visible borrow slots.
            </Text>
        </View>
    )

    const footer = (
        <View style={{ flexDirection: "row", gap: SPACING.sm, justifyContent: "flex-end" }}>
            <ModalFooterChip label="Cancel" onPress={onClose} tone="neutral" />
            <ModalFooterChip label="Save supports" onPress={handleSave} tone="primary" />
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

/** Updates overrides map and returns the new JSON string for settings. */
export const saveBundleSupportBorrowOverride = (
    overridesJson: string,
    bundleKey: string,
    cards: string[],
): string => {
    const overrides = parseSupportBorrowOverrides(overridesJson)
    overrides[bundleKey] = cards
    return JSON.stringify(overrides)
}
