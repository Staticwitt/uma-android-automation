package com.steve1316.uma_android_automation.bot.solver

import com.steve1316.uma_android_automation.types.Aptitude
import com.steve1316.uma_android_automation.types.StatName
import com.steve1316.uma_android_automation.types.TrackDistance
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

/** Unit tests for the heuristic Champions Meeting win-probability preview. */
@DisplayName("Champions Meeting preview")
class ChampionsMeetingPreviewTest {
    private val allA = Aptitudes.DEFAULT_A

    private fun sprintMeta() = ChampionsMeetingPreview.DEFAULT_META_STATS_BY_DISTANCE[TrackDistance.SPRINT]!!

    @Test
    @DisplayName("A trainee exactly on the meta line reads as a coin flip")
    fun testParity() {
        val r = ChampionsMeetingPreview.estimate(sprintMeta(), TrackDistance.SPRINT, allA)
        assertEquals(0.5, r.winProbability, 0.02, "Stats equal to the field with A aptitude is ~50%")
        assertEquals(r.fieldPower, r.effectivePower, 0.01, "Equal stats and A aptitude give equal power")
        assertEquals(CmReadiness.COMPETITIVE, r.readiness)
    }

    @Test
    @DisplayName("Stats well above the field read as ready")
    fun testStrong() {
        val meta = sprintMeta()
        val strong = TraineeStats(meta.speed + 200, meta.stamina + 200, meta.power + 200, meta.guts + 200, meta.wit + 200)
        val r = ChampionsMeetingPreview.estimate(strong, TrackDistance.SPRINT, allA)
        assertTrue(r.winProbability > 0.6, "A 200-across lead should read above 60%: ${r.winProbability}")
        assertEquals(CmReadiness.READY, r.readiness)
        assertTrue(r.effectivePower > r.fieldPower)
    }

    @Test
    @DisplayName("Stats well below the field read as underpowered")
    fun testWeak() {
        val meta = sprintMeta()
        val weak = TraineeStats(meta.speed - 300, meta.stamina - 300, meta.power - 300, meta.guts - 300, meta.wit - 300)
        val r = ChampionsMeetingPreview.estimate(weak, TrackDistance.SPRINT, allA)
        assertTrue(r.winProbability < 0.4, "A 300-across deficit should read below 40%: ${r.winProbability}")
        assertEquals(CmReadiness.UNDERPOWERED, r.readiness)
    }

    @Test
    @DisplayName("An off-aptitude entry tanks even with strong stats")
    fun testOffAptitude() {
        val meta = sprintMeta()
        val strong = TraineeStats(meta.speed + 200, meta.stamina + 200, meta.power + 200, meta.guts + 200, meta.wit + 200)
        // G sprint aptitude overrides otherwise-strong stats.
        val badApt = Aptitudes(sprint = Aptitude.G, mile = Aptitude.A, medium = Aptitude.A, long = Aptitude.A, turf = Aptitude.A, dirt = Aptitude.A)
        val r = ChampionsMeetingPreview.estimate(strong, TrackDistance.SPRINT, badApt)
        assertEquals(CmReadiness.UNDERPOWERED, r.readiness, "G aptitude should sink a strong-stat entry")
        assertTrue(r.winProbability < 0.1, "Off-aptitude power penalty should drop the estimate hard: ${r.winProbability}")
    }

    @Test
    @DisplayName("The weaker of distance and surface aptitude drives the penalty")
    fun testWeakerAptitudeUsed() {
        val meta = sprintMeta()
        // A distance but G surface should be penalized the same as G distance / A surface.
        val badSurface = Aptitudes(sprint = Aptitude.A, mile = Aptitude.A, medium = Aptitude.A, long = Aptitude.A, turf = Aptitude.A, dirt = Aptitude.G)
        val dirtRun = ChampionsMeetingPreview.estimate(meta, TrackDistance.SPRINT, badSurface, surface = com.steve1316.uma_android_automation.types.TrackSurface.DIRT)
        assertTrue(dirtRun.winProbability < 0.2, "A G surface aptitude must penalize a turf-strong sprinter racing on dirt")
    }

    @Test
    @DisplayName("Stat gaps report the deficit against the field and flag the limiting stat")
    fun testStatGaps() {
        // Short 150 Speed and 250 Power, everything else on the meta line.
        val meta = sprintMeta()
        val stats = TraineeStats(meta.speed - 150, meta.stamina, meta.power - 250, meta.guts, meta.wit)
        val r = ChampionsMeetingPreview.estimate(stats, TrackDistance.SPRINT, allA)
        assertEquals(150, r.statGaps[StatName.SPEED])
        assertEquals(250, r.statGaps[StatName.POWER])
        assertEquals(0, r.statGaps[StatName.WIT])
        assertEquals(StatName.POWER, r.limitingStat, "Power is the biggest deficit, so it is the limiting stat")
    }

    @Test
    @DisplayName("No limiting stat when the trainee meets the field everywhere")
    fun testNoLimitingStat() {
        val meta = sprintMeta()
        val over = TraineeStats(meta.speed + 10, meta.stamina + 10, meta.power + 10, meta.guts + 10, meta.wit + 10)
        val r = ChampionsMeetingPreview.estimate(over, TrackDistance.SPRINT, allA)
        assertNull(r.limitingStat, "Meeting the field on every stat leaves no limiting stat")
    }

    @Test
    @DisplayName("Preset lookup resolves the CM distance and surface")
    fun testEstimateForPreset() {
        // cm16_leo_2 is Nakayama 1200m turf (Sprint). A strong sprinter should preview well through the preset id.
        val meta = sprintMeta()
        val strong = TraineeStats(meta.speed + 150, meta.stamina, meta.power + 150, meta.guts, meta.wit)
        val r = ChampionsMeetingPreview.estimateForPreset(strong, "cm16_leo_2", allA)
        assertTrue(r != null, "A known preset id resolves")
        assertTrue(r!!.winProbability > 0.5, "A strong sprinter previews above 50% for the sprint Leo Cup")
    }

    @Test
    @DisplayName("An unknown preset id returns null")
    fun testUnknownPreset() {
        assertNull(ChampionsMeetingPreview.estimateForPreset(sprintMeta(), "not_a_real_cm", allA))
    }

    @Test
    @DisplayName("Win probability is always clamped into a sane band")
    fun testClamp() {
        val absurdlyStrong = TraineeStats(9999, 9999, 9999, 9999, 9999)
        val absurdlyWeak = TraineeStats(1, 1, 1, 1, 1)
        assertTrue(ChampionsMeetingPreview.estimate(absurdlyStrong, TrackDistance.SPRINT, allA).winProbability <= 0.98)
        assertTrue(ChampionsMeetingPreview.estimate(absurdlyWeak, TrackDistance.SPRINT, allA).winProbability >= 0.02)
    }
}
