package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ParentFarmingSessionStateTest {
    @Test
    fun toJson_fromJson_roundTrips() {
        val state =
            ParentFarmingSessionState.Saved(
                fingerprint = "[{\"label\":\"Gen 1\"}]",
                sessionId = "session-123",
                runsCompleted = 2,
                bestQualityScore = 87,
                bestQualityGrade = "A",
                bestRunIndex = 1,
                borrowRotationOffset = 3,
            )

        val restored = ParentFarmingSessionState.fromJson(ParentFarmingSessionState.toJson(state))

        assertEquals(state, restored)
    }

    @Test
    fun fromJson_defaultsMissingFields() {
        val restored = ParentFarmingSessionState.fromJson(org.json.JSONObject("{}"))

        assertEquals("", restored.fingerprint)
        assertEquals("", restored.sessionId)
        assertEquals(0, restored.runsCompleted)
        assertEquals(0, restored.bestQualityScore)
        assertEquals("", restored.bestQualityGrade)
        assertEquals(0, restored.bestRunIndex)
        assertEquals(0, restored.borrowRotationOffset)
    }
}
