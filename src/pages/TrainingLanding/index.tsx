import { useMemo } from "react"
import { View, ScrollView, StyleSheet } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Dumbbell, CalendarDays } from "lucide-react-native"
import { DomainHeader } from "../../components/ui/domain-header"
import { DomainLandingCard } from "../../components/ui/domain-landing-card"
import { SearchPageProvider } from "../../context/SearchPageContext"
import { useTheme } from "../../context/ThemeContext"
import { SPACING } from "../../lib/spacing"

const TrainingLanding = () => {
    const navigation = useNavigation()
    const { colors } = useTheme()

    const styles = useMemo(
        () =>
            StyleSheet.create({
                root: { flex: 1, margin: 10, backgroundColor: colors.bg },
            }),
        [colors],
    )

    return (
        <View style={styles.root}>
            <SearchPageProvider page="TrainingLanding">
                <DomainHeader breadcrumb="Gameplay" title="Training" subtitle="Stat priorities, training behavior, and event preferences." />
                <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xl }}>
                    <View className="m-1">
                        <DomainLandingCard
                            title="Training Settings"
                            description="Stat priorities, blacklists, risky training, distance overrides, and stat targets."
                            icon={<Dumbbell size={18} color={colors.brand} />}
                            onPress={() => navigation.navigate("TrainingSettings" as never)}
                        />
                        <DomainLandingCard
                            title="Training Events"
                            description="Training event preferences and which events to pick during career runs."
                            icon={<CalendarDays size={18} color={colors.textMuted} />}
                            onPress={() => navigation.navigate("TrainingEventSettings" as never)}
                        />
                    </View>
                </ScrollView>
            </SearchPageProvider>
        </View>
    )
}

export default TrainingLanding
