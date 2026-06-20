import { View } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { BookOpen, Bug, Cpu, Dumbbell, FileText, Flag, GitBranch, Layers, MessageCircle, Sparkles } from "lucide-react-native"
import { useTheme } from "../../context/ThemeContext"
import { Section } from "../ui/section"
import { DomainLandingCard } from "../ui/domain-landing-card"
import { SPACING } from "../../lib/spacing"

/**
 * Settings hub navigation — glass domain cards grouped by category.
 */
export const SettingsHubNav = () => {
    const navigation = useNavigation()
    const { colors } = useTheme()

    const pad = { paddingHorizontal: SPACING.xs }

    return (
        <>
            <Section label="GAMEPLAY">
                <View style={pad}>
                    <DomainLandingCard
                        title="Training"
                        description="Stat priorities, training behavior, and event preferences."
                        icon={<Dumbbell size={18} color={colors.brand} />}
                        onPress={() => navigation.navigate("TrainingLanding" as never)}
                    />
                    <DomainLandingCard
                        title="Racing & Farming"
                        description="Race behavior, smart solver, and parent farming goals."
                        icon={<Flag size={18} color={colors.brand} />}
                        onPress={() => navigation.navigate("RacingLanding" as never)}
                    />
                    <DomainLandingCard
                        title="Skills"
                        description="Automated skill spending, style settings, and skill plans."
                        icon={<Sparkles size={18} color={colors.textMuted} />}
                        onPress={() => navigation.navigate("Skills" as never)}
                    />
                </View>
            </Section>

            <Section label="SCENARIO">
                <View style={pad}>
                    <DomainLandingCard
                        title="Scenario Overrides"
                        description="Campaign-specific behavior overrides."
                        icon={<Layers size={18} color={colors.textMuted} />}
                        onPress={() => navigation.navigate("ScenarioOverridesSettings" as never)}
                    />
                </View>
            </Section>

            <Section label="INTEGRATIONS">
                <View style={pad}>
                    <DomainLandingCard
                        title="Discord"
                        description="Bot notifications, live status, and run summaries."
                        icon={<MessageCircle size={18} color={colors.textMuted} />}
                        onPress={() => navigation.navigate("DiscordSettings" as never)}
                    />
                    <DomainLandingCard
                        title="LLM"
                        description="On-device docs chat and model downloads."
                        icon={<Cpu size={18} color={colors.textMuted} />}
                        onPress={() => navigation.navigate("LLMSettings" as never)}
                    />
                </View>
            </Section>

            <Section label="TOOLS">
                <View style={pad}>
                    <DomainLandingCard
                        title="Ask the Docs"
                        description="On-device documentation search and chat."
                        icon={<BookOpen size={18} color={colors.textMuted} />}
                        onPress={() => navigation.navigate("Chat" as never)}
                    />
                    <DomainLandingCard
                        title="Event Log Visualizer"
                        description="Import logs and browse a day-by-day timeline."
                        icon={<FileText size={18} color={colors.textMuted} />}
                        onPress={() => navigation.navigate("EventLogVisualizer" as never)}
                    />
                    <DomainLandingCard
                        title="Decision Report Viewer"
                        description="Import bot logs and browse why the bot made each decision, turn by turn."
                        icon={<GitBranch size={18} color={colors.textMuted} />}
                        onPress={() => navigation.navigate("DecisionReportViewer" as never)}
                    />
                    <DomainLandingCard
                        title="Debug"
                        description="Diagnostics, log viewer, and template matching tests."
                        icon={<Bug size={18} color={colors.textMuted} />}
                        onPress={() => navigation.navigate("DebugSettings" as never)}
                    />
                </View>
            </Section>
        </>
    )
}
