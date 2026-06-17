import React, { type ComponentProps } from "react"
import { View, StyleSheet } from "react-native"
import type Ionicons from "@react-native-vector-icons/ionicons"
import HeroStatusCard, { type HeroStatus } from "../HeroStatusCard"
import SelectButton from "../SelectButton"
import { SPACING } from "../../lib/spacing"
import { HOME_SCENARIOS } from "./scenarios"
import type { DeviceMetrics } from "../../lib/displayProfile"

export interface RunPanelProps {
    status: HeroStatus
    profile: string
    scenario: string
    deviceMetrics: DeviceMetrics | null
    selectVariant: ComponentProps<typeof SelectButton>["variant"]
    selectIconName?: ComponentProps<typeof Ionicons>["name"]
    onScenarioChange: (scenario: string) => void
    onPress: () => void
}

/**
 * Home run surface: status pill, active profile, and scenario start/stop control.
 */
export const RunPanel = ({ status, profile, scenario, deviceMetrics, selectVariant, selectIconName, onScenarioChange, onPress }: RunPanelProps) => (
    <View style={styles.host}>
        <HeroStatusCard
            status={status}
            profile={profile}
            cta={
                <SelectButton
                    variant={selectVariant}
                    iconName={selectIconName}
                    options={[...HOME_SCENARIOS]}
                    placeholder={deviceMetrics ? "Select a Scenario" : "Not Ready"}
                    value={scenario}
                    onValueChange={(value) => onScenarioChange(value || "")}
                    onPress={onPress}
                />
            }
        />
    </View>
)

const styles = StyleSheet.create({
    host: {
        width: "100%",
        marginBottom: SPACING.md,
    },
})
