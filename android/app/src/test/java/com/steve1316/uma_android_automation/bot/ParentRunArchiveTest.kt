package com.steve1316.uma_android_automation.bot

import com.steve1316.uma_android_automation.types.Aptitude
import com.steve1316.uma_android_automation.types.FanCountClass
import com.steve1316.uma_android_automation.types.RunningStyle
import com.steve1316.uma_android_automation.types.TrackDistance
import com.steve1316.uma_android_automation.types.TrackSurface
import com.steve1316.uma_android_automation.types.Trainee
import org.json.JSONArray
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

class ParentRunArchiveTest {
    @TempDir
    lateinit var tempDir: File

    @Test
    fun append_persists_newest_first_and_caps_entries() {
        val file = File(tempDir, "parent_run_archive.json")
        val trainee = sampleTrainee()
        val input =
            ParentRunSummaryInput(
                trainee = trainee,
                scenario = "Trackblazer",
                profileName = "Parents",
                bundleLabel = "Bundle A",
                goalPresetLabel = "G1 / Fan Parent",
                characterPreset = "Special Week",
                sparkStrategy = "StatAndAptitude",
                targetEpithets = listOf("Globe-Trotter"),
                completedTargetEpithets = listOf("Globe-Trotter"),
                incompleteTargetEpithets = emptyList(),
                extraCompletedEpithets = emptyList(),
                sparkPicks = emptyList(),
                fanWeight = 1.0,
                minimumFanTarget = 120000,
                minimumRaceGapTurns = 1,
                targetEpithetMultiplier = 4.0,
                raceStats = RunRaceStats(wins = 10, losses = 1),
                elapsedMs = 60000L,
                trainingBias = "Auto distance",
            )

        writeArray(file, JSONArray())
        appendToFile(file, input)
        appendToFile(file, input.copy(bundleLabel = "Bundle B"))

        val records = JSONArray(file.readText())
        assertEquals(2, records.length())
        assertEquals("Bundle B", records.getJSONObject(0).getString("bundleLabel"))
        assertEquals("Bundle A", records.getJSONObject(1).getString("bundleLabel"))
        assertTrue(records.getJSONObject(0).has("qualityScore"))
        assertTrue(records.getJSONObject(0).has("qualityGrade"))
        assertEquals(250000, records.getJSONObject(0).getInt("fans"))
    }

    @Test
    fun computeComparison_returns_null_for_empty_archive() {
        assertEquals(null, ParentRunArchive.computeComparison(JSONArray()))
    }

    @Test
    fun computeComparison_averages_and_tracks_best_run() {
        val records = JSONArray()
        records.put(recordWithFansAndQuality(fans = 100000, qualityScore = 60, qualityGrade = "C"))
        records.put(recordWithFansAndQuality(fans = 300000, qualityScore = 90, qualityGrade = "A"))

        val comparison = ParentRunArchive.computeComparison(records)

        assertTrue(comparison != null)
        assertEquals(2, comparison!!.runCount)
        assertEquals(200000L, comparison.avgFans)
        assertEquals(75.0, comparison.avgQualityScore)
        assertEquals(300000, comparison.bestFans)
        assertEquals(90, comparison.bestQualityScore)
        assertEquals("A", comparison.bestGrade)
    }

    private fun recordWithFansAndQuality(fans: Int, qualityScore: Int, qualityGrade: String) =
        org.json.JSONObject()
            .put("fans", fans)
            .put("qualityScore", qualityScore)
            .put("qualityGrade", qualityGrade)

    private fun sampleTrainee(): Trainee {
        val trainee = Trainee()
        trainee.name = "Special Week"
        trainee.fans = 250000
        trainee.fanCountClass = FanCountClass.GOLD
        trainee.skillPoints = 400
        trainee.stats.speed = 900
        trainee.trackSurfaceAptitudes[TrackSurface.TURF] = Aptitude.A
        trainee.trackDistanceAptitudes[TrackDistance.MILE] = Aptitude.A
        trainee.runningStyleAptitudes[RunningStyle.PACE_CHASER] = Aptitude.B
        return trainee
    }

    private fun appendToFile(file: File, input: ParentRunSummaryInput) {
        val records = JSONArray(if (file.exists()) file.readText() else "[]")
        val updated = JSONArray()
        updated.put(ParentRunArchive.recordFromInput(input))
        for (i in 0 until records.length()) {
            updated.put(records.getJSONObject(i))
        }
        writeArray(file, updated)
    }

    private fun writeArray(file: File, array: JSONArray) {
        file.writeText(array.toString())
    }
}
