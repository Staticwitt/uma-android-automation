import React, { useMemo } from "react"
import { View, Text, Pressable, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"
import {
    defaultBreedingPlan,
    parseParentFarmingBreedingPlan,
    serializeParentFarmingBreedingPlan,
    type ParentFarmingBreedingGeneration,
} from "../lib/parentFarmingBreedingPlan"
import { PARENT_FARMING_GOAL_PRESETS } from "../lib/parentFarmingGoalPresets"
import { PARENT_FARMING_CHARACTER_BUNDLES } from "../lib/parentFarmingCharacterBundles"
import { Input } from "./ui/input"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

interface ParentFarmingBreedingPlanEditorProps {
    json: string
    onChange: (json: string) => void
}

export const ParentFarmingBreedingPlanEditor = ({ json, onChange }: ParentFarmingBreedingPlanEditorProps) => {
    const { colors } = useTheme()
    const plan = useMemo(() => parseParentFarmingBreedingPlan(json), [json])

    const updateGenerations = (generations: ParentFarmingBreedingGeneration[]) => {
        onChange(serializeParentFarmingBreedingPlan({ generations }))
    }

    const updateGeneration = (index: number, patch: Partial<ParentFarmingBreedingGeneration>) => {
        const next = plan.generations.map((gen, i) => (i === index ? { ...gen, ...patch } : gen))
        updateGenerations(next)
    }

    const addGeneration = () => {
        updateGenerations([
            ...plan.generations,
            {
                label: `Gen ${plan.generations.length + 1}`,
                goalPresetKey: "g1-fans",
                targetFactorSkills: [],
                usePreviousAsLegacy: plan.generations.length > 0,
            },
        ])
    }

    const removeGeneration = (index: number) => {
        updateGenerations(plan.generations.filter((_, i) => i !== index))
    }

    if (plan.generations.length === 0) {
        return (
            <Pressable
                onPress={() => onChange(serializeParentFarmingBreedingPlan(defaultBreedingPlan()))}
                style={{
                    padding: SPACING.md,
                    borderRadius: RADII.md,
                    borderWidth: 1,
                    borderColor: colors.brandBorder,
                    backgroundColor: colors.brandSubtle,
                }}
                accessibilityRole="button"
            >
                <Text style={{ ...TYPE.body, color: colors.brand, fontWeight: "600" }}>Load example breeding plan</Text>
            </Pressable>
        )
    }

    return (
        <View style={{ gap: SPACING.md }}>
            {plan.generations.map((gen, index) => (
                <View
                    key={`${gen.label}-${index}`}
                    style={{
                        padding: SPACING.md,
                        borderRadius: RADII.md,
                        borderWidth: 1,
                        borderColor: colors.borderHair,
                        backgroundColor: colors.surface,
                        gap: SPACING.sm,
                    }}
                >
                    <Text style={{ ...TYPE.body, color: colors.text, fontWeight: "700" }}>{gen.label}</Text>
                    <Input value={gen.label} onChangeText={(label) => updateGeneration(index, { label })} placeholder="Generation label" />
                    <Text style={{ ...TYPE.caption, color: colors.textMuted }}>Goal preset</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs }}>
                        {PARENT_FARMING_GOAL_PRESETS.slice(0, 8).map((preset) => (
                            <Pressable
                                key={preset.key}
                                onPress={() => updateGeneration(index, { goalPresetKey: preset.key, bundleKey: undefined })}
                                style={{
                                    paddingHorizontal: SPACING.sm,
                                    paddingVertical: 6,
                                    borderRadius: RADII.sm,
                                    borderWidth: 1,
                                    borderColor: gen.goalPresetKey === preset.key ? colors.brand : colors.borderHair,
                                    backgroundColor: gen.goalPresetKey === preset.key ? colors.brandSubtle : colors.bg,
                                }}
                            >
                                <Text style={{ ...TYPE.caption, color: colors.text }}>{preset.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                    <Text style={{ ...TYPE.caption, color: colors.textMuted }}>Or character bundle</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs }}>
                        {PARENT_FARMING_CHARACTER_BUNDLES.slice(0, 6).map((bundle) => (
                            <Pressable
                                key={bundle.key}
                                onPress={() =>
                                    updateGeneration(index, {
                                        bundleKey: bundle.key,
                                        goalPresetKey: bundle.goalPresetKey,
                                    })
                                }
                                style={{
                                    paddingHorizontal: SPACING.sm,
                                    paddingVertical: 6,
                                    borderRadius: RADII.sm,
                                    borderWidth: 1,
                                    borderColor: gen.bundleKey === bundle.key ? colors.brand : colors.borderHair,
                                    backgroundColor: gen.bundleKey === bundle.key ? colors.brandSubtle : colors.bg,
                                }}
                            >
                                <Text style={{ ...TYPE.caption, color: colors.text }}>{bundle.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                    <Input
                        value={gen.targetFactorSkills.join(", ")}
                        onChangeText={(text) =>
                            updateGeneration(index, {
                                targetFactorSkills: text
                                    .split(",")
                                    .map((part) => part.trim())
                                    .filter(Boolean),
                            })
                        }
                        placeholder="Target factor skills (comma-separated)"
                    />
                    <Pressable onPress={() => removeGeneration(index)} accessibilityRole="button">
                        <Text style={{ ...TYPE.caption, color: colors.textMuted }}>Remove generation</Text>
                    </Pressable>
                </View>
            ))}
            <Pressable onPress={addGeneration} accessibilityRole="button">
                <Text style={{ ...TYPE.caption, color: colors.brand, fontWeight: "600" }}>Add generation</Text>
            </Pressable>
        </View>
    )
}
