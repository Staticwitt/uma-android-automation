package com.steve1316.uma_android_automation.bot

import com.steve1316.uma_android_automation.types.RunningStyle
import com.steve1316.uma_android_automation.types.StatName
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class RunningStyleStatBiasTest {
    private val baseTargets =
        mapOf(
            StatName.SPEED to 1000,
            StatName.STAMINA to 1000,
            StatName.POWER to 1000,
            StatName.GUTS to 1000,
            StatName.WIT to 1000,
        )

    @Test
    fun frontRunner_boostsPower_andReducesWit() {
        val result = RunningStyleStatBias.applyRunningStyleBias(baseTargets, RunningStyle.FRONT_RUNNER)

        assertEquals(1150, result[StatName.POWER])
        assertEquals(900, result[StatName.WIT])
        assertEquals(1000, result[StatName.SPEED])
        assertEquals(1000, result[StatName.STAMINA])
        assertEquals(1000, result[StatName.GUTS])
    }

    @Test
    fun endCloser_boostsGutsMost_andReducesWit() {
        val result = RunningStyleStatBias.applyRunningStyleBias(baseTargets, RunningStyle.END_CLOSER)

        assertEquals(1200, result[StatName.GUTS])
        assertEquals(1050, result[StatName.STAMINA])
        assertEquals(900, result[StatName.WIT])
        assertEquals(1000, result[StatName.SPEED])
        assertEquals(1000, result[StatName.POWER])
    }

    @Test
    fun lateSurger_boostsGutsAndPower_andReducesWitSlightly() {
        val result = RunningStyleStatBias.applyRunningStyleBias(baseTargets, RunningStyle.LATE_SURGER)

        assertEquals(1150, result[StatName.GUTS])
        assertEquals(1050, result[StatName.POWER])
        assertEquals(950, result[StatName.WIT])
    }

    @Test
    fun paceChaser_onlyBoostsWit() {
        val result = RunningStyleStatBias.applyRunningStyleBias(baseTargets, RunningStyle.PACE_CHASER)

        assertEquals(1100, result[StatName.WIT])
        assertEquals(1000, result[StatName.SPEED])
        assertEquals(1000, result[StatName.STAMINA])
        assertEquals(1000, result[StatName.POWER])
        assertEquals(1000, result[StatName.GUTS])
    }

    @Test
    fun apply_neverProducesZeroOrNegativeTarget() {
        val tinyTargets = mapOf(StatName.WIT to 1)
        val result = RunningStyleStatBias.applyRunningStyleBias(tinyTargets, RunningStyle.END_CLOSER)

        assertEquals(1, result[StatName.WIT])
    }
}
