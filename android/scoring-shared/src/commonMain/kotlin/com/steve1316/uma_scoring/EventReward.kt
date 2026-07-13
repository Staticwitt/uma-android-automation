package com.steve1316.uma_scoring

/**
 * Structured, quantified effects parsed from a single training-event option's reward text (one option can list several `\n`-separated lines such as `Speed +20`, `Energy -15`,
 * `Get Practice Perfect ○ status`). Everything is reduced to a small set of numeric channels so the option can be scored in run context. Lines the parser does not recognize
 * (separators, `※` footnotes, `Fans +500`, purely conditional text) contribute nothing rather than throwing.
 *
 * @property statGains Direct per-stat gains (negatives are stat losses). `All stats +N` expands to every stat.
 * @property randomStatTotal Stat points on an unspecified stat (`N random stat(s) +X`, `Last trained stat +X`), summed. Valued at a neutral priority since the target stat is unknown.
 * @property skillPoints Skill points, including skill-hint lines (a hint is worth roughly its level in SP).
 * @property energy Conservative (worst-case) net energy delta. A range like `-5/-20` contributes the most negative value so the scorer never over-credits a gamble.
 * @property maxEnergy Permanent maximum-energy increase.
 * @property mood Net mood steps (each step shifts every future training).
 * @property bond Net bond gain with the event's owner.
 * @property goodStatuses Count of beneficial statuses granted (e.g. `Practice Perfect ○`, `Charming ○`).
 * @property badStatuses Count of detrimental statuses inflicted (e.g. `Slow Metabolism`, `Practice Poor`, `Migraine`).
 */
data class EventOptionEffects(
    val statGains: Map<StatName, Int> = emptyMap(),
    val randomStatTotal: Int = 0,
    val skillPoints: Int = 0,
    val energy: Int = 0,
    val maxEnergy: Int = 0,
    val mood: Int = 0,
    val bond: Int = 0,
    val goodStatuses: Int = 0,
    val badStatuses: Int = 0,
)

/**
 * Per-effect weights, all expressed in "stat-point-equivalent" units so the option score is comparable to a plain stat total. Defaults are hand-tuned so that, at neutral energy,
 * a targeted stat gain and a similarly-sized skill/energy/mood reward trade off sensibly. Exposed for callers that want to bias the optimizer.
 *
 * @property skillPointValue Value of one skill point.
 * @property energyValueFull Value of one energy point when energy is already full (near-wasted).
 * @property energyValueEmpty Value of one energy point when energy is fully depleted (recovery is precious).
 * @property maxEnergyValue Value of one point of permanent maximum energy.
 * @property moodValue Value of one mood step.
 * @property bondValue Value of one bond point.
 * @property randomStatValue Value of one stat point landing on an unknown stat.
 * @property goodStatusValue Value of one beneficial status.
 * @property badStatusValue Penalty magnitude for one detrimental status.
 * @property priorityCoefficient Slope of the priority bonus: a stat's multiplier is `1 + priorityCoefficient * (priorityCount - priorityIndex)`.
 */
data class EventScoringWeights(
    val skillPointValue: Double = 0.45,
    val energyValueFull: Double = 0.15,
    val energyValueEmpty: Double = 1.3,
    val maxEnergyValue: Double = 1.0,
    val moodValue: Double = 12.0,
    val bondValue: Double = 0.8,
    val randomStatValue: Double = 0.7,
    val goodStatusValue: Double = 9.0,
    val badStatusValue: Double = 20.0,
    val priorityCoefficient: Double = 0.15,
)

/**
 * The run context an event option is scored against.
 *
 * @property currentStats Current per-stat values (drives the soft-cap devaluation of gains).
 * @property statPriority Stats in priority order, highest first (drives the priority multiplier).
 * @property currentEnergy Current energy.
 * @property maxEnergy Current maximum energy (energy value interpolates between full and empty across this range).
 * @property scenario Campaign name, for the per-scenario stat caps.
 * @property weights Tunable weights.
 */
data class EventChoiceContext(
    val currentStats: Map<StatName, Int> = emptyMap(),
    val statPriority: List<StatName> = emptyList(),
    val currentEnergy: Int = 50,
    val maxEnergy: Int = 100,
    val scenario: String = "",
    val weights: EventScoringWeights = EventScoringWeights(),
)

/** One option's evaluation. */
data class EventOptionScore(val index: Int, val score: Double, val effects: EventOptionEffects)

/** The full evaluation of an event's options. [bestIndex] is the highest-scoring option (ties resolve to the earliest, matching the game's option order). */
data class EventChoiceResult(val bestIndex: Int, val scores: List<EventOptionScore>)

/** Status names that are detrimental. Matched case-insensitively as substrings so decorated variants (`Practice Poor`, `Get Migraine status`) are caught. */
private val BAD_STATUS_KEYWORDS =
    listOf(
        "slow metabolism",
        "practice poor",
        "migraine",
        "night owl",
        "skin outbreak",
        "sharp teeth",
        "gatekept",
        "insomnia",
        "under the weather",
        "overweight",
    )

private val STAT_LINE = Regex("""^(Speed|Stamina|Power|Guts|Wit)\b""", RegexOption.IGNORE_CASE)
private val SIGNED_INT = Regex("""[+\-]\d+""")

/**
 * Parse one option's full reward text (its `\n`-separated lines) into structured effects. Unrecognized lines are skipped. The parse is deliberately conservative: energy ranges
 * take their worst case, and only clearly-named stats/skills/energy/mood/bond are credited.
 */
fun parseEventOption(text: String): EventOptionEffects {
    val statGains = mutableMapOf<StatName, Int>()
    var randomStatTotal = 0
    var skillPoints = 0
    var energy = 0
    var maxEnergy = 0
    var mood = 0
    var bond = 0
    var good = 0
    var bad = 0

    for (raw in text.split("\n")) {
        val line = raw.trim()
        if (line.isEmpty()) continue
        val lower = line.lowercase()

        // Footnotes / conditionals / separators contribute nothing.
        if (line.startsWith("※") || lower.startsWith("or (") || lower.startsWith("randomly") || line.all { it == '-' }) continue

        // Statuses first: they contain no leading stat number and may mention stat words in their name.
        if (lower.contains("status")) {
            if (BAD_STATUS_KEYWORDS.any { lower.contains(it) }) bad++ else good++
            continue
        }

        val firstInt = SIGNED_INT.find(line)?.value?.toIntOrNull()

        when {
            STAT_LINE.containsMatchIn(line) -> {
                val stat = StatName.fromName(line.substringBefore(" ").trim())
                if (stat != null && firstInt != null) statGains[stat] = (statGains[stat] ?: 0) + firstInt
            }
            lower.startsWith("all stats") -> {
                if (firstInt != null) for (s in StatName.entries) statGains[s] = (statGains[s] ?: 0) + firstInt
            }
            lower.startsWith("skill points") -> if (firstInt != null) skillPoints += firstInt
            lower.startsWith("maximum energy") -> if (firstInt != null) maxEnergy += firstInt
            lower.startsWith("energy") -> {
                // Worst case of a range (e.g. "-5/-20" -> -20; "+10 / +20" -> +10) so a gamble is never over-credited.
                val nums = SIGNED_INT.findAll(line).map { it.value.toInt() }.toList()
                if (nums.isNotEmpty()) energy += nums.min()
            }
            lower.startsWith("mood") -> if (firstInt != null) mood += firstInt
            lower.startsWith("last trained stat") -> if (firstInt != null) randomStatTotal += firstInt
            lower.contains("random stat") -> {
                // "N random stat(s) +X" -> N * X points spread across unknown stats.
                val nums = SIGNED_INT.findAll(line).map { it.value.toInt() }.toList()
                val leadingCount = Regex("""^(\d+)""").find(line)?.groupValues?.get(1)?.toIntOrNull() ?: 1
                if (nums.isNotEmpty()) randomStatTotal += leadingCount * nums.last()
            }
            lower.contains("hint") -> if (firstInt != null) skillPoints += firstInt * HINT_SKILL_POINT_EQUIVALENT
            Regex("""bond\s*[+\-]?\d+""").containsMatchIn(lower) -> if (firstInt != null) bond += firstInt
            // Everything else (Fans, unnamed conditionals) is ignored.
        }
    }

    return EventOptionEffects(
        statGains = statGains,
        randomStatTotal = randomStatTotal,
        skillPoints = skillPoints,
        energy = energy,
        maxEnergy = maxEnergy,
        mood = mood,
        bond = bond,
        goodStatuses = good,
        badStatuses = bad,
    )
}

/** A skill hint is worth roughly this many skill points per hint level (a coarse but stable proxy for the purchase discount it grants). */
private const val HINT_SKILL_POINT_EQUIVALENT = 8

/**
 * Value of one energy point in the current context: precious when depleted, near-worthless when full. Linearly interpolates [EventScoringWeights.energyValueEmpty] down to
 * [EventScoringWeights.energyValueFull] as energy climbs from 0 to [maxEnergy]. Energy losses are charged at the value energy has *now* (losing energy at full is cheap; at empty it hurts).
 */
private fun energyPointValue(currentEnergy: Int, maxEnergy: Int, weights: EventScoringWeights): Double {
    if (maxEnergy <= 0) return weights.energyValueFull
    val fullness = (currentEnergy.toDouble() / maxEnergy).coerceIn(0.0, 1.0)
    return weights.energyValueEmpty + (weights.energyValueFull - weights.energyValueEmpty) * fullness
}

/** Priority multiplier for a stat: higher-priority stats (earlier in [statPriority]) are worth more. Off-priority stats get a flat 1.0. */
private fun priorityMultiplier(stat: StatName, statPriority: List<StatName>, weights: EventScoringWeights): Double {
    val idx = statPriority.indexOf(stat)
    return if (idx == -1) 1.0 else 1.0 + weights.priorityCoefficient * (statPriority.size - idx)
}

/**
 * Score a parsed option in run context. The score is in stat-point-equivalent units: a stat gain is worth its size, scaled by priority and devalued past the soft cap
 * (reusing [softCapEffectivenessMultiplier] / [getScenarioStatCap]); every other channel converts through [EventScoringWeights]. Losses and bad statuses subtract.
 */
fun scoreEventOption(effects: EventOptionEffects, context: EventChoiceContext): Double {
    val w = context.weights
    var score = 0.0

    for ((stat, gain) in effects.statGains) {
        val current = context.currentStats[stat] ?: 0
        val mult = priorityMultiplier(stat, context.statPriority, w)
        score +=
            if (gain >= 0) {
                gain * mult * softCapEffectivenessMultiplier(current, gain, getScenarioStatCap(context.scenario, stat))
            } else {
                // A stat loss is charged at full priority value; we do not soft-cap a loss.
                gain * mult
            }
    }

    score += effects.randomStatTotal * w.randomStatValue
    score += effects.skillPoints * w.skillPointValue
    score += effects.energy * energyPointValue(context.currentEnergy, context.maxEnergy, w)
    score += effects.maxEnergy * w.maxEnergyValue
    score += effects.mood * w.moodValue
    score += effects.bond * w.bondValue
    score += effects.goodStatuses * w.goodStatusValue
    score -= effects.badStatuses * w.badStatusValue

    return score
}

/**
 * Parse and score every option of a training event and pick the best. Ties resolve to the earliest option so behavior is deterministic and matches how the game lists options.
 *
 * @param options The raw reward text of each option, in on-screen order.
 * @param context The run context to score against.
 * @return The chosen index plus every option's score and parsed effects (for logging / display). [EventChoiceResult.bestIndex] is 0 when [options] is empty.
 */
fun chooseBestEventOption(options: List<String>, context: EventChoiceContext): EventChoiceResult {
    val scores =
        options.mapIndexed { index, text ->
            val effects = parseEventOption(text)
            EventOptionScore(index, scoreEventOption(effects, context), effects)
        }
    val bestIndex = scores.maxByOrNull { it.score }?.index ?: 0
    return EventChoiceResult(bestIndex, scores)
}
