import React, { useEffect, useMemo, useState } from "react"
import { View, Text, Pressable } from "react-native"
import { Input } from "../../../components/ui/input"
import TabStrip from "../../../components/ui/tab-strip"
import { Section } from "../../../components/ui/section"
import { useTheme } from "../../../context/ThemeContext"
import type { WeightsMap } from "../../../lib/solver/constants"

type WeightTabKey = "core" | "scheduling" | "economy"

const WEIGHT_TABS: { key: WeightTabKey; label: string }[] = [
    { key: "core", label: "Core" },
    { key: "scheduling", label: "Schedule" },
    { key: "economy", label: "Economy" },
]

export interface SmartRaceSolverWeightsEditorProps {
    weights: WeightsMap
    updateWeight: (key: keyof WeightsMap, value: number | string | boolean) => void
    styles: Record<string, object>
}

/**
 * Tabbed editor for Smart Race Solver scoring weights.
 */
export const SmartRaceSolverWeightsEditor = React.memo(({ weights, updateWeight, styles }: SmartRaceSolverWeightsEditorProps) => {
    const { colors } = useTheme()
    const [activeTab, setActiveTab] = useState<WeightTabKey>("core")

    const [raceValueInput, setRaceValueInput] = useState(weights.raceValue.toString())
    const [epithetValueInput, setEpithetValueInput] = useState(weights.epithetValue.toString())
    const [targetEpithetMultiplierInput, setTargetEpithetMultiplierInput] = useState(weights.targetEpithetMultiplier.toString())
    const [hintWeightInput, setHintWeightInput] = useState(weights.hintWeight.toString())
    const [consecPenaltyInput, setConsecPenaltyInput] = useState(weights.consecutiveRacePenalty.toString())
    const [summerPenaltyInput, setSummerPenaltyInput] = useState(weights.summerPenalty.toString())
    const [raceBonusPctInput, setRaceBonusPctInput] = useState(weights.raceBonusPct.toString())
    const [raceCostPctInput, setRaceCostPctInput] = useState(weights.raceCostPct.toString())
    const [fanWeightInput, setFanWeightInput] = useState(weights.fanWeight.toString())
    const [minimumRaceGapTurnsInput, setMinimumRaceGapTurnsInput] = useState(weights.minimumRaceGapTurns.toString())

    useEffect(() => setRaceValueInput(weights.raceValue.toString()), [weights.raceValue])
    useEffect(() => setEpithetValueInput(weights.epithetValue.toString()), [weights.epithetValue])
    useEffect(() => setTargetEpithetMultiplierInput(weights.targetEpithetMultiplier.toString()), [weights.targetEpithetMultiplier])
    useEffect(() => setHintWeightInput(weights.hintWeight.toString()), [weights.hintWeight])
    useEffect(() => setConsecPenaltyInput(weights.consecutiveRacePenalty.toString()), [weights.consecutiveRacePenalty])
    useEffect(() => setSummerPenaltyInput(weights.summerPenalty.toString()), [weights.summerPenalty])
    useEffect(() => setRaceBonusPctInput(weights.raceBonusPct.toString()), [weights.raceBonusPct])
    useEffect(() => setRaceCostPctInput(weights.raceCostPct.toString()), [weights.raceCostPct])
    useEffect(() => setFanWeightInput(weights.fanWeight.toString()), [weights.fanWeight])
    useEffect(() => setMinimumRaceGapTurnsInput(weights.minimumRaceGapTurns.toString()), [weights.minimumRaceGapTurns])

    const tabBody = useMemo(() => {
        switch (activeTab) {
            case "core":
                return (
                    <>
                        <Pressable android_ripple={{ color: colors.ripple, foreground: true }}>
                            <Text style={styles.inputLabel}>Race Value Weight</Text>
                            <Input
                                style={styles.input}
                                value={raceValueInput}
                                onChangeText={(t: string) => /^-?\d*\.?\d*$/.test(t) && setRaceValueInput(t)}
                                onBlur={() => updateWeight("raceValue", parseFloat(raceValueInput) || 0)}
                                keyboardType="decimal-pad"
                                placeholder="1.0"
                            />
                            <Text style={styles.inputDescription}>
                                Multiplier on every race's stat + SP reward. Default 1.0. Raise to 2.0 to make the schedule more race-heavy; lower to 0.5 to favor training.
                            </Text>
                        </Pressable>

                        <Pressable android_ripple={{ color: colors.ripple, foreground: true }}>
                            <Text style={styles.inputLabel}>Epithet Value Weight</Text>
                            <Input
                                style={styles.input}
                                value={epithetValueInput}
                                onChangeText={(t: string) => /^-?\d*\.?\d*$/.test(t) && setEpithetValueInput(t)}
                                onBlur={() => updateWeight("epithetValue", parseFloat(epithetValueInput) || 0)}
                                keyboardType="decimal-pad"
                                placeholder="1.0"
                            />
                            <Text style={styles.inputDescription}>
                                Multiplier on epithet stat rewards. Default 1.0 weights an epithet's stats equally with race stats. Raise to 5.0 if you want the solver to chase epithets even at the
                                cost of fewer total races.
                            </Text>
                        </Pressable>

                        <Pressable android_ripple={{ color: colors.ripple, foreground: true }}>
                            <Text style={styles.inputLabel}>Target Epithet Multiplier</Text>
                            <Input
                                style={styles.input}
                                value={targetEpithetMultiplierInput}
                                onChangeText={(t: string) => /^-?\d*\.?\d*$/.test(t) && setTargetEpithetMultiplierInput(t)}
                                onBlur={() => updateWeight("targetEpithetMultiplier", parseFloat(targetEpithetMultiplierInput) || 1)}
                                keyboardType="decimal-pad"
                                placeholder="3.0"
                            />
                            <Text style={styles.inputDescription}>
                                Extra multiplier for selected Target Epithets only. Default 3.0 makes hand-picked goals matter more than incidental epithets; parent goal presets use 4.0.
                            </Text>
                        </Pressable>

                        <Pressable android_ripple={{ color: colors.ripple, foreground: true }}>
                            <Text style={styles.inputLabel}>Fan Weight</Text>
                            <Input
                                style={styles.input}
                                value={fanWeightInput}
                                onChangeText={(t: string) => /^-?\d*\.?\d*$/.test(t) && setFanWeightInput(t)}
                                onBlur={() => updateWeight("fanWeight", parseFloat(fanWeightInput) || 0)}
                                keyboardType="decimal-pad"
                                placeholder="0.0"
                            />
                            <Text style={styles.inputDescription}>
                                Score per fan earned from a race. Default 0.0 ignores fans entirely (Stat Epitaphs preset). 0.001 (Fans + Epitaphs preset) makes a 25k-fan G1 worth ~25 score
                                points - meaningful but not dominant. Above 0.005 the solver will race almost every eligible turn.
                            </Text>
                        </Pressable>
                    </>
                )
            case "scheduling":
                return (
                    <>
                        <Pressable android_ripple={{ color: colors.ripple, foreground: true }}>
                            <Text style={styles.inputLabel}>Minimum Race Gap Turns</Text>
                            <Input
                                style={styles.input}
                                value={minimumRaceGapTurnsInput}
                                onChangeText={(t: string) => /^\d*$/.test(t) && setMinimumRaceGapTurnsInput(t)}
                                onBlur={() => updateWeight("minimumRaceGapTurns", Math.max(0, Math.floor(parseFloat(minimumRaceGapTurnsInput) || 0)))}
                                keyboardType="number-pad"
                                placeholder="0"
                            />
                            <Text style={styles.inputDescription}>
                                Hard minimum number of non-race turns between solver-planned races. Set to 1 for at least one training/rest turn between races. Parent farming presets use 1 by default.
                            </Text>
                        </Pressable>

                        <Pressable android_ripple={{ color: colors.ripple, foreground: true }}>
                            <Text style={styles.inputLabel}>Hint Reward Weight</Text>
                            <Input
                                style={styles.input}
                                value={hintWeightInput}
                                onChangeText={(t: string) => /^-?\d*\.?\d*$/.test(t) && setHintWeightInput(t)}
                                onBlur={() => updateWeight("hintWeight", parseFloat(hintWeightInput) || 0)}
                                keyboardType="decimal-pad"
                                placeholder="8.0"
                            />
                            <Text style={styles.inputDescription}>
                                Score given for completing a skill-hint epithet (one that grants a skill instead of stats). Default 8.0 ≈ value of one G1 race. Drop to 0 to skip hint-only epithets
                                entirely.
                            </Text>
                        </Pressable>

                        <Pressable android_ripple={{ color: colors.ripple, foreground: true }}>
                            <Text style={styles.inputLabel}>Consecutive Race Penalty</Text>
                            <Input
                                style={styles.input}
                                value={consecPenaltyInput}
                                onChangeText={(t: string) => /^-?\d*\.?\d*$/.test(t) && setConsecPenaltyInput(t)}
                                onBlur={() => updateWeight("consecutiveRacePenalty", parseFloat(consecPenaltyInput) || 0)}
                                keyboardType="decimal-pad"
                                placeholder="3.0"
                            />
                            <Text style={styles.inputDescription}>
                                Penalty per race when racing 3+ turns in a row. Models in-game motivation/condition loss. Late-Dec turns (23, 47, 71) are exempt because the year ends there. Set to 0 to
                                disable.
                            </Text>
                        </Pressable>

                        <Pressable android_ripple={{ color: colors.ripple, foreground: true }}>
                            <Text style={styles.inputLabel}>Summer Block Penalty</Text>
                            <Input
                                style={styles.input}
                                value={summerPenaltyInput}
                                onChangeText={(t: string) => /^-?\d*\.?\d*$/.test(t) && setSummerPenaltyInput(t)}
                                onBlur={() => updateWeight("summerPenalty", parseFloat(summerPenaltyInput) || 0)}
                                keyboardType="decimal-pad"
                                placeholder="5.0"
                            />
                            <Text style={styles.inputDescription}>
                                Penalty for racing during summer training camps (turns 12-14, 36-39, 60-63). High enough to discourage racing through summer, low enough that an epithet-completing race
                                can still be picked.
                            </Text>
                        </Pressable>
                    </>
                )
            case "economy":
                return (
                    <>
                        <Pressable android_ripple={{ color: colors.ripple, foreground: true }}>
                            <Text style={styles.inputLabel}>Race Bonus %</Text>
                            <Input
                                style={styles.input}
                                value={raceBonusPctInput}
                                onChangeText={(t: string) => /^-?\d*\.?\d*$/.test(t) && setRaceBonusPctInput(t)}
                                onBlur={() => updateWeight("raceBonusPct", parseFloat(raceBonusPctInput) || 0)}
                                keyboardType="decimal-pad"
                                placeholder="50.0"
                            />
                            <Text style={styles.inputDescription}>
                                Percentage uplift applied to base stat/SP reward of every race before scoring. Default 50%. Higher = the solver picks more races overall.
                            </Text>
                        </Pressable>

                        <Pressable android_ripple={{ color: colors.ripple, foreground: true }}>
                            <Text style={styles.inputLabel}>Race Cost %</Text>
                            <Input
                                style={styles.input}
                                value={raceCostPctInput}
                                onChangeText={(t: string) => /^-?\d*\.?\d*$/.test(t) && setRaceCostPctInput(t)}
                                onBlur={() => updateWeight("raceCostPct", parseFloat(raceCostPctInput) || 0)}
                                keyboardType="decimal-pad"
                                placeholder="100.0"
                            />
                            <Text style={styles.inputDescription}>
                                Cost subtracted from each race's reward, expressed as a percentage of a G2 race's baseline value. At 100 (default), G2 and G3 races score zero net and only get raced when
                                they progress an epithet. Lower this to schedule more races.
                            </Text>
                        </Pressable>
                    </>
                )
        }
    }, [
        activeTab,
        colors.ripple,
        consecPenaltyInput,
        epithetValueInput,
        fanWeightInput,
        hintWeightInput,
        minimumRaceGapTurnsInput,
        raceBonusPctInput,
        raceCostPctInput,
        raceValueInput,
        styles,
        summerPenaltyInput,
        targetEpithetMultiplierInput,
        updateWeight,
    ])

    return (
        <View>
            <TabStrip items={WEIGHT_TABS} activeKey={activeTab} onChange={(key) => setActiveTab(key as WeightTabKey)} style={{ marginBottom: 12 }} />
            <Section label="Weight values" collapsible defaultOpen>
                <View style={{ padding: 16 }}>{tabBody}</View>
            </Section>
        </View>
    )
})
SmartRaceSolverWeightsEditor.displayName = "SmartRaceSolverWeightsEditor"
