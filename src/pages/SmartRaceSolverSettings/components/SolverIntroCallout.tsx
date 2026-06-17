import React from "react"
import { View, Text } from "react-native"
import InfoCallout from "../../../components/ui/info-callout"
import { useTheme } from "../../../context/ThemeContext"
import { TYPE } from "../../../lib/type"
import { SPACING } from "../../../lib/spacing"

const SubTopic = ({ title, children }: { title: string; children: React.ReactNode }) => {
    const { colors } = useTheme()
    return (
        <View style={{ marginBottom: SPACING.sm }}>
            <Text style={[TYPE.h2, { color: colors.text, marginBottom: SPACING.xs }]}>{title}</Text>
            <Text style={[TYPE.body, { color: colors.textMuted }]}>{children}</Text>
        </View>
    )
}

/** Collapsible intro copy for the Smart Race Solver settings page. */
export const SolverIntroCallout = () => (
    <InfoCallout title="How the solver works">
        <SubTopic title="How it works">
            The solver searches the entire 72-turn career and picks, for every turn, the best decision (Race / Train / Rest) that maximizes your projected score against the target epithet
            rewards. The bot only races on the turns the solver has chosen in the calculated schedule - every other turn becomes training or rest, even when Farming Fans would otherwise add an
            extra race. Hard goal requirements (fan / trophy / goal-points) and the Force Racing setting are the only things that can override the schedule.
        </SubTopic>
        <SubTopic title="What happens when you lose a race">
            A loss is recorded against that turn and the solver immediately re-plans the remaining turns. Epithets that depended on the lost race may shift to alternative paths or drop out
            entirely, so later races / trainings can change to keep the rest of the run on the highest-scoring track still available.
        </SubTopic>
        <SubTopic title="Race History scrape">
            On bot start (and only when the career is past the pre-debut turns), the bot opens the in-game Career → Race History dialog and scrapes every past race entry. Each row is matched to the
            race calendar so wins seed your epithet progress and losses are remembered when re-planning. This lets you stop and resume a career mid-run without the solver forgetting what already
            happened.
        </SubTopic>
        <SubTopic title="Epithets without matchers">
            Some epithets in the data set have no structured matchers in the code - usually because the in-game condition (like "Win your first G1 in Senior class") is difficult to be modeled as a
            per-race rule. These are marked with a small red dot in the top-right corner of their chip. The solver treats them as untouched and never picks races to advance them, so they won't be
            auto-completed. Adding one to Forced makes every candidate schedule infeasible since the condition can never be satisfied, so leave them out of Forced even if you plan to earn them
            yourself in-game.
        </SubTopic>
    </InfoCallout>
)
