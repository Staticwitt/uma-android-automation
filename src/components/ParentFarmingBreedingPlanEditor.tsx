import React, { useCallback, useEffect, useMemo, useState } from "react"
import { View, Text, Pressable, Alert } from "react-native"
import { useTheme } from "../context/ThemeContext"
import {
    builtInBreedingPlans,
    formatTargetFactorSkillsInput,
    parseParentFarmingBreedingPlan,
    parseTargetFactorSkillsInput,
    serializeParentFarmingBreedingPlan,
    validateBreedingPlan,
    type ParentFarmingBreedingGeneration,
} from "../lib/parentFarmingBreedingPlan"
import { PARENT_FARMING_GOAL_PRESETS } from "../lib/parentFarmingGoalPresets"
import { PARENT_FARMING_CHARACTER_BUNDLES } from "../lib/parentFarmingCharacterBundles"
import { clearParentFarmingSessionState } from "../lib/parentFarmingSessionState"
import { Input } from "./ui/input"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

interface ParentFarmingBreedingPlanEditorProps {
    json: string
    onChange: (json: string) => void
}

interface BreedingGenerationRowProps {
    gen: ParentFarmingBreedingGeneration
    index: number
    warning?: string
    onUpdate: (index: number, patch: Partial<ParentFarmingBreedingGeneration>) => void
    onRemove: (index: number) => void
}

const BreedingGenerationRow = ({ gen, index, warning, onUpdate, onRemove }: BreedingGenerationRowProps) => {
    const { colors } = useTheme()
    const [factorText, setFactorText] = useState(() => formatTargetFactorSkillsInput(gen.targetFactorSkills))

    useEffect(() => {
        setFactorText(formatTargetFactorSkillsInput(gen.targetFactorSkills))
    }, [gen.targetFactorSkills])

    const commitFactorText = useCallback(() => {
        onUpdate(index, { targetFactorSkills: parseTargetFactorSkillsInput(factorText) })
    }, [factorText, index, onUpdate])

    return (
        <View
            style={{
                padding: SPACING.md,
                borderRadius: RADII.md,
                borderWidth: 1,
                borderColor: warning ? (colors.warning ?? colors.borderHair) : colors.borderHair,
                backgroundColor: colors.surface,
                gap: SPACING.sm,
            }}
        >
            <Text style={{ ...TYPE.body, color: colors.text, fontWeight: "700" }}>{gen.label}</Text>
            {warning && <Text style={{ ...TYPE.caption, color: colors.warningText ?? colors.warning }}>⚠️ {warning}</Text>}
            <Input value={gen.label} onChangeText={(label) => onUpdate(index, { label })} placeholder="Generation label" />
            <Text style={{ ...TYPE.caption, color: colors.textMuted }}>Goal preset</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs }}>
                {PARENT_FARMING_GOAL_PRESETS.slice(0, 8).map((preset) => (
                    <Pressable
                        key={preset.key}
                        onPress={() => onUpdate(index, { goalPresetKey: preset.key, bundleKey: undefined })}
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
                            onUpdate(index, {
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
                value={factorText}
                onChangeText={setFactorText}
                onBlur={commitFactorText}
                onSubmitEditing={commitFactorText}
                placeholder="Target factor skills (comma-separated)"
            />
            <Pressable onPress={() => onRemove(index)} accessibilityRole="button">
                <Text style={{ ...TYPE.caption, color: colors.textMuted }}>Remove generation</Text>
            </Pressable>
        </View>
    )
}

export const ParentFarmingBreedingPlanEditor = ({ json, onChange }: ParentFarmingBreedingPlanEditorProps) => {
    const { colors } = useTheme()
    const plan = useMemo(() => parseParentFarmingBreedingPlan(json), [json])
    const warnings = useMemo(() => validateBreedingPlan(plan), [plan])
    const warningByIndex = useMemo(() => new Map(warnings.map((w) => [w.generationIndex, w.message])), [warnings])

    const updateGenerations = useCallback(
        (generations: ParentFarmingBreedingGeneration[]) => {
            onChange(serializeParentFarmingBreedingPlan({ generations }))
        },
        [onChange],
    )

    const updateGeneration = useCallback(
        (index: number, patch: Partial<ParentFarmingBreedingGeneration>) => {
            const next = plan.generations.map((gen, i) => (i === index ? { ...gen, ...patch } : gen))
            updateGenerations(next)
        },
        [plan.generations, updateGenerations],
    )

    const addGeneration = useCallback(() => {
        updateGenerations([
            ...plan.generations,
            {
                label: `Gen ${plan.generations.length + 1}`,
                goalPresetKey: "g1-fans",
                targetFactorSkills: [],
                usePreviousAsLegacy: plan.generations.length > 0,
            },
        ])
    }, [plan.generations, updateGenerations])

    const removeGeneration = useCallback(
        (index: number) => {
            updateGenerations(plan.generations.filter((_, i) => i !== index))
        },
        [plan.generations, updateGenerations],
    )

    const handleResetProgress = useCallback(() => {
        Alert.alert(
            "Reset breeding plan progress?",
            "The next bot start will begin this breeding plan at generation 1 instead of resuming where it left off.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: async () => {
                        await clearParentFarmingSessionState()
                    },
                },
            ],
        )
    }, [])

    return (
        <View style={{ gap: SPACING.md }}>
            {plan.generations.length === 0 && (
                <View style={{ gap: SPACING.sm }}>
                    <Text style={{ ...TYPE.caption, color: colors.textMuted }}>Start from a built-in plan, or add a generation manually below.</Text>
                    {builtInBreedingPlans().map((builtIn) => (
                        <Pressable
                            key={builtIn.key}
                            onPress={() => onChange(serializeParentFarmingBreedingPlan(builtIn.plan))}
                            style={{
                                padding: SPACING.md,
                                borderRadius: RADII.md,
                                borderWidth: 1,
                                borderColor: colors.brandBorder,
                                backgroundColor: colors.brandSubtle,
                                gap: 4,
                            }}
                            accessibilityRole="button"
                        >
                            <Text style={{ ...TYPE.body, color: colors.brand, fontWeight: "600" }}>{builtIn.label}</Text>
                            <Text style={{ ...TYPE.caption, color: colors.textMuted }}>{builtIn.description}</Text>
                        </Pressable>
                    ))}
                </View>
            )}
            {plan.generations.map((gen, index) => (
                <BreedingGenerationRow
                    key={`breeding-gen-${index}`}
                    gen={gen}
                    index={index}
                    warning={warningByIndex.get(index)}
                    onUpdate={updateGeneration}
                    onRemove={removeGeneration}
                />
            ))}
            <View style={{ flexDirection: "row", gap: SPACING.md, flexWrap: "wrap" }}>
                <Pressable onPress={addGeneration} accessibilityRole="button">
                    <Text style={{ ...TYPE.caption, color: colors.brand, fontWeight: "600" }}>Add generation</Text>
                </Pressable>
                {plan.generations.length > 0 && (
                    <Pressable onPress={handleResetProgress} accessibilityRole="button">
                        <Text style={{ ...TYPE.caption, color: colors.textMuted, fontWeight: "600" }}>Reset progress</Text>
                    </Pressable>
                )}
            </View>
        </View>
    )
}
