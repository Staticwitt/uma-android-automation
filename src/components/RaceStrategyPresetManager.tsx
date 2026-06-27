import React, { useMemo, useState, useCallback } from "react"
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native"
import Ionicons from "@react-native-vector-icons/ionicons"
import { useTheme } from "../context/ThemeContext"
import type { RaceStrategyPreset } from "../lib/raceStrategyPresets"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

interface RaceStrategyPresetManagerProps {
    presets: RaceStrategyPreset[]
    onApply: (preset: RaceStrategyPreset) => void
    onSave: (label: string) => void
    onDelete: (key: string) => void
}

/** Save, apply, and delete named race strategy bundles for quick manual reuse between runs. */
export const RaceStrategyPresetManager = ({ presets, onApply, onSave, onDelete }: RaceStrategyPresetManagerProps) => {
    const { colors } = useTheme()
    const [nameInput, setNameInput] = useState("")

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
                label: { ...TYPE.body, color: colors.text, flex: 1 },
                applyChip: {
                    paddingHorizontal: SPACING.sm,
                    paddingVertical: 6,
                    borderRadius: RADII.pill,
                    borderWidth: 1,
                    borderColor: colors.brandBorder,
                    backgroundColor: colors.brandSubtle,
                },
                applyChipText: { ...TYPE.caption, color: colors.brand, fontWeight: "600" as const },
                saveRow: { flexDirection: "row", gap: SPACING.xs, marginTop: SPACING.sm, alignItems: "center" },
                input: {
                    flex: 1,
                    borderWidth: 1,
                    borderColor: colors.borderHair,
                    borderRadius: RADII.md,
                    paddingHorizontal: SPACING.sm,
                    paddingVertical: SPACING.xs,
                    color: colors.text,
                    fontSize: 14,
                    backgroundColor: colors.bg,
                },
                saveChip: {
                    paddingHorizontal: SPACING.sm,
                    paddingVertical: SPACING.xs + 2,
                    borderRadius: RADII.md,
                    borderWidth: 1,
                    borderColor: colors.brand,
                    backgroundColor: colors.brand,
                },
                saveChipText: { ...TYPE.caption, color: colors.onBrand, fontWeight: "600" as const },
            }),
        [colors],
    )

    const handleSave = useCallback(() => {
        const label = nameInput.trim()
        if (!label) return
        onSave(label)
        setNameInput("")
    }, [nameInput, onSave])

    return (
        <View>
            <Text style={styles.summary}>
                {presets.length === 0
                    ? "Save the strategy fields above as a named preset to switch between routes quickly."
                    : "Apply a saved preset, or save the current strategy as a new one."}
            </Text>
            {presets.map((preset) => (
                <View key={preset.key} style={styles.row}>
                    <Text style={styles.label}>{preset.label}</Text>
                    <Pressable style={styles.applyChip} onPress={() => onApply(preset)} android_ripple={{ color: colors.ripple, foreground: true }}>
                        <Text style={styles.applyChipText}>Apply</Text>
                    </Pressable>
                    <Pressable onPress={() => onDelete(preset.key)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete preset ${preset.label}`}>
                        <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                    </Pressable>
                </View>
            ))}
            <View style={styles.saveRow}>
                <TextInput
                    style={styles.input}
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="Preset name (e.g. Mile Sprint)"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    autoCorrect={false}
                    onSubmitEditing={handleSave}
                />
                <Pressable style={styles.saveChip} onPress={handleSave} android_ripple={{ color: colors.ripple, foreground: true }}>
                    <Text style={styles.saveChipText}>Save</Text>
                </Pressable>
            </View>
        </View>
    )
}
