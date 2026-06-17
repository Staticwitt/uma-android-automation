import { useContext, useMemo } from "react"
import { View, ScrollView, StyleSheet } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Flag, Leaf, Cpu } from "lucide-react-native"
import { DomainHeader } from "../../components/ui/domain-header"
import { DomainLandingCard } from "../../components/ui/domain-landing-card"
import { SearchPageProvider } from "../../context/SearchPageContext"
import { RacingContext, defaultSettings, useSettingsSnapshot } from "../../context/BotStateContext"
import { useTheme } from "../../context/ThemeContext"
import { formatCareerAutomationSummary } from "../../lib/parentFarmingCareerAutomation"
import { getParentFarmingActiveLabels } from "../../lib/parentFarmingDrift"
import { SPACING } from "../../lib/spacing"

const RacingLanding = () => {
    const navigation = useNavigation()
    const { colors } = useTheme()
    const { racing } = useContext(RacingContext)
    const settings = useSettingsSnapshot()
    const racingSettings = { ...defaultSettings.racing, ...racing }
    const { enableParentFarmingMode, enableSmartRaceSolver } = racingSettings

    const parentFarmingSummary = useMemo(() => {
        if (!enableParentFarmingMode) return "Off — configure goal presets and character setups."
        const { bundleLabel, goalPresetLabel } = getParentFarmingActiveLabels(settings)
        const preset = bundleLabel || goalPresetLabel || "On"
        return `${preset} · ${formatCareerAutomationSummary(settings)}`
    }, [enableParentFarmingMode, settings])

    const styles = useMemo(
        () =>
            StyleSheet.create({
                root: { flex: 1, margin: 10, backgroundColor: colors.bg },
            }),
        [colors],
    )

    return (
        <View style={styles.root}>
            <SearchPageProvider page="RacingLanding">
                <DomainHeader breadcrumb="Gameplay" title="Racing & Farming" subtitle="Race behavior, smart solver planning, and parent farming goals." />
                <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xl }}>
                    <View className="m-1">
                        <DomainLandingCard
                            title="Race Behavior"
                            description="Farming fans, mandatory races, retries, and general racing automation."
                            icon={<Flag size={18} color={colors.brand} />}
                            onPress={() => navigation.navigate("RacingSettings" as never)}
                        />
                        <DomainLandingCard
                            title="Smart Race Solver"
                            description="72-turn schedule planner, epithet targeting, and calendar preview."
                            icon={<Cpu size={18} color={enableSmartRaceSolver ? colors.brand : colors.textMuted} />}
                            active={enableSmartRaceSolver}
                            onPress={() => navigation.navigate("SmartRaceSolverSettings" as never)}
                        />
                        <DomainLandingCard
                            title="Parent Farming"
                            description={parentFarmingSummary}
                            icon={<Leaf size={18} color={enableParentFarmingMode ? colors.brand : colors.textMuted} />}
                            active={enableParentFarmingMode}
                            onPress={() => navigation.navigate("ParentFarmingSettings" as never)}
                        />
                    </View>
                </ScrollView>
            </SearchPageProvider>
        </View>
    )
}

export default RacingLanding
