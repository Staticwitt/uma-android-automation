import React, { useCallback, useMemo } from "react"
import { View, Text, Pressable, StyleSheet } from "react-native"
import Ionicons from "@react-native-vector-icons/ionicons"
import { useTheme } from "../context/ThemeContext"
import { PARENT_FARMING_CHARACTER_BUNDLES } from "../lib/parentFarmingCharacterBundles"
import { PARENT_FARMING_GOAL_PRESETS } from "../lib/parentFarmingGoalPresets"
import type { ParentFarmingGoalQueueItem } from "../lib/parentFarmingGoalQueue"
import { formatGoalQueueSummary } from "../lib/parentFarmingGoalQueue"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

interface ParentFarmingGoalQueueEditorProps {
    items: ParentFarmingGoalQueueItem[]
    onChange: (items: ParentFarmingGoalQueueItem[]) => void
}

const QUEUE_PICKERS: { type: ParentFarmingGoalQueueItem["type"]; options: { key: string; label: string }[] }[] = [
    {
        type: "bundle",
        options: PARENT_FARMING_CHARACTER_BUNDLES.map((bundle) => ({ key: bundle.key, label: bundle.label })),
    },
    {
        type: "preset",
        options: PARENT_FARMING_GOAL_PRESETS.map((preset) => ({ key: preset.key, label: preset.label })),
    },
]

export const ParentFarmingGoalQueueEditor = ({ items, onChange }: ParentFarmingGoalQueueEditorProps) => {
    const { colors } = useTheme()
    const styles = useMemo(
        () =>
            StyleSheet.create({
                summary: { ...TYPE.caption, color: colors.textMuted, marginBottom: SPACING.sm, lineHeight: 18 },
                row: {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING.sm,
                    paddingVertical: SPACING.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderHair,
                },
                index: { ...TYPE.monoLabel, color: colors.brand, width: 24 },
                label: { ...TYPE.body, color: colors.text, flex: 1 },
                type: { ...TYPE.caption, color: colors.textMuted },
                addRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs, marginTop: SPACING.sm },
                chip: {
                    paddingHorizontal: SPACING.sm,
                    paddingVertical: 6,
                    borderRadius: RADII.pill,
                    borderWidth: 1,
                    borderColor: colors.borderHair,
                    backgroundColor: colors.surface,
                },
                chipText: { ...TYPE.caption, color: colors.text },
            }),
        [colors],
    )

    const removeAt = useCallback((index: number) => onChange(items.filter((_, i) => i !== index)), [items, onChange])

    const addItem = useCallback(
        (type: ParentFarmingGoalQueueItem["type"], key: string, label: string) => {
            if (items.some((item) => item.type === type && item.key === key)) return
            onChange([...items, { type, key, label }])
        },
        [items, onChange],
    )

    return (
        <View>
            <Text style={styles.summary}>
                {items.length === 0
                    ? "Add goals to cycle through different bundles or presets each multi-run career."
                    : formatGoalQueueSummary(items)}
            </Text>
            {items.map((item, index) => (
                <View key={`${item.type}-${item.key}-${index}`} style={styles.row}>
                    <Text style={styles.index}>{index + 1}</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>{item.label || item.key}</Text>
                        <Text style={styles.type}>{item.type === "bundle" ? "Character bundle" : "Goal preset"}</Text>
                    </View>
                    <Pressable onPress={() => removeAt(index)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove queue item">
                        <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                    </Pressable>
                </View>
            ))}
            <View style={styles.addRow}>
                {QUEUE_PICKERS.flatMap((group) =>
                    group.options.slice(0, 6).map((option) => (
                        <Pressable
                            key={`${group.type}-${option.key}`}
                            style={styles.chip}
                            onPress={() => addItem(group.type, option.key, option.label)}
                            android_ripple={{ color: colors.ripple, foreground: true }}
                        >
                            <Text style={styles.chipText}>+ {option.label}</Text>
                        </Pressable>
                    )),
                )}
            </View>
        </View>
    )
}
