package com.steve1316.uma_scoring

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Unit tests for the training-event option parser and context-aware scorer. Parser cases assert exact structured fields; scorer cases assert relative ordering (a targeted stat
 * beats an off-target one, energy is precious only when depleted, bad statuses subtract) rather than brittle float values.
 */
class EventRewardTest {
    private val allPriority = listOf(StatName.SPEED, StatName.STAMINA, StatName.POWER, StatName.GUTS, StatName.WIT)

    // ---- Parser ----

    @Test
    fun parsesDirectStatGains() {
        val e = parseEventOption("Speed +20\nStamina +20")
        assertEquals(20, e.statGains[StatName.SPEED])
        assertEquals(20, e.statGains[StatName.STAMINA])
        assertEquals(0, e.skillPoints)
    }

    @Test
    fun expandsAllStatsAcrossEveryStat() {
        val e = parseEventOption("All stats +10")
        for (s in StatName.entries) assertEquals(10, e.statGains[s], "$s should gain 10 from 'All stats +10'")
    }

    @Test
    fun takesWorstCaseOfAnEnergyRange() {
        assertEquals(-20, parseEventOption("Energy -5/-20").energy, "A range must be charged at its worst case")
        assertEquals(10, parseEventOption("Energy +10 / +20").energy)
        assertEquals(-15, parseEventOption("Energy -15").energy)
    }

    @Test
    fun distinguishesMaximumEnergyFromEnergy() {
        val e = parseEventOption("Maximum Energy +12")
        assertEquals(12, e.maxEnergy)
        assertEquals(0, e.energy)
    }

    @Test
    fun parsesSkillPointsMoodBondAndHints() {
        assertEquals(45, parseEventOption("Skill points +45").skillPoints)
        assertEquals(1, parseEventOption("Mood +1").mood)
        assertEquals(15, parseEventOption("Etsuko Otonashi bond +15").bond)
        // A hint level converts to a skill-point equivalent (2 * 8).
        assertEquals(16, parseEventOption("Straightaway Adept hint +2").skillPoints)
    }

    @Test
    fun parsesRandomAndLastTrainedStatsAsUnspecified() {
        assertEquals(50, parseEventOption("5 random stats +10").randomStatTotal)
        assertEquals(10, parseEventOption("1 random stat +10").randomStatTotal)
        assertEquals(-10, parseEventOption("Last trained stat -10").randomStatTotal)
        // Unspecified stats must not be attributed to a named stat.
        assertTrue(parseEventOption("5 random stats +10").statGains.isEmpty())
    }

    @Test
    fun classifiesGoodAndBadStatuses() {
        assertEquals(1, parseEventOption("Get Practice Perfect ○ status").goodStatuses)
        assertEquals(0, parseEventOption("Get Practice Perfect ○ status").badStatuses)
        assertEquals(1, parseEventOption("Get Slow Metabolism status").badStatuses)
        assertEquals(1, parseEventOption("Get Practice Poor status").badStatuses)
    }

    @Test
    fun ignoresSeparatorsFootnotesAndUnknownLines() {
        val e = parseEventOption("----------\n※ Get a win streak of 3+ G1 races\nFans +500\nRandomly either")
        assertEquals(EventOptionEffects(), e, "Non-quantifiable lines must parse to no effects, not throw")
    }

    @Test
    fun parsesAMixedMultiLineOption() {
        val e = parseEventOption("Speed +10\nPower +10\n(random) Get Charming ○ status")
        assertEquals(10, e.statGains[StatName.SPEED])
        assertEquals(10, e.statGains[StatName.POWER])
        assertEquals(1, e.goodStatuses)
    }

    // ---- Scorer ----

    private fun ctx(energy: Int, priority: List<StatName> = allPriority) =
        EventChoiceContext(
            currentStats = StatName.entries.associateWith { 600 },
            statPriority = priority,
            currentEnergy = energy,
            maxEnergy = 100,
            scenario = "URA Finale",
        )

    @Test
    fun prefersHigherPriorityStat() {
        val speed = parseEventOption("Speed +20")
        val wit = parseEventOption("Wit +20")
        val c = ctx(energy = 60)
        assertTrue(scoreEventOption(speed, c) > scoreEventOption(wit, c), "A top-priority stat should outscore a bottom-priority one of equal size")
    }

    @Test
    fun energyIsPreciousOnlyWhenDepleted() {
        val options = listOf("Energy +30", "Speed +20")
        // Depleted: the energy option should win.
        assertEquals(0, chooseBestEventOption(options, ctx(energy = 5)).bestIndex)
        // Full: the same energy is near-worthless, so the stat option should win.
        assertEquals(1, chooseBestEventOption(options, ctx(energy = 100)).bestIndex)
    }

    @Test
    fun badStatusStrictlyLowersScore() {
        val clean = parseEventOption("Power +20")
        val cursed = parseEventOption("Power +20\nGet Slow Metabolism status")
        val c = ctx(energy = 60)
        assertTrue(scoreEventOption(cursed, c) < scoreEventOption(clean, c), "A detrimental status must reduce an option's score")
    }

    @Test
    fun devaluesGainsPastTheSoftCap() {
        val gain = parseEventOption("Speed +20")
        val belowCap = EventChoiceContext(currentStats = mapOf(StatName.SPEED to 800), statPriority = allPriority, scenario = "URA Finale")
        val pastCap = EventChoiceContext(currentStats = mapOf(StatName.SPEED to 1300), statPriority = allPriority, scenario = "URA Finale")
        assertTrue(scoreEventOption(gain, pastCap) < scoreEventOption(gain, belowCap), "A gain landing above 1200 is worth less than the same gain below it")
    }

    @Test
    fun choosesBestAndReportsEveryScore() {
        val result = chooseBestEventOption(listOf("Speed +30", "Wit +5"), ctx(energy = 60))
        assertEquals(2, result.scores.size)
        assertEquals(0, result.bestIndex)
    }

    @Test
    fun emptyOptionsAreSafe() {
        val result = chooseBestEventOption(emptyList(), ctx(energy = 60))
        assertEquals(0, result.bestIndex)
        assertTrue(result.scores.isEmpty())
    }

    @Test
    fun prefersANeedyStatOverANearCappedHigherPriorityOne() {
        // Speed is top priority but already near the URA cap (1400), so a gain into it is mostly wasted; Wit is
        // bottom priority but far below cap, so an equal gain there is fully effective. The scorer should pick Wit.
        val context =
            EventChoiceContext(
                currentStats = mapOf(StatName.SPEED to 1350, StatName.WIT to 500),
                statPriority = allPriority,
                currentEnergy = 60,
                maxEnergy = 100,
                scenario = "URA Finale",
            )
        val result = chooseBestEventOption(listOf("Speed +40", "Wit +40"), context)
        assertEquals(1, result.bestIndex, "A gain into a needy stat should beat an equal gain into a near-capped higher-priority stat")
    }
}
