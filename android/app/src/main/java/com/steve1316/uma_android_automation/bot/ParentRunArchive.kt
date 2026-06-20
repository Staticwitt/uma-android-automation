package com.steve1316.uma_android_automation.bot

import android.content.Context
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.uma_android_automation.MainActivity
import com.steve1316.uma_android_automation.types.RunningStyle
import com.steve1316.uma_android_automation.types.TrackDistance
import com.steve1316.uma_android_automation.types.TrackSurface
import com.steve1316.uma_android_automation.types.Trainee
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

/**
 * Persists completed parent-farming runs locally for in-app history and comparison.
 */
object ParentRunArchive {
    private const val TAG = "[${MainActivity.loggerTag}]ParentRunArchive"
    private const val FILE_NAME = "parent_run_archive.json"
    private const val MAX_ENTRIES = 50

    /** Aggregate stats from previously archived runs, used to compare a freshly completed run against history. */
    data class RunComparison(
        val runCount: Int,
        val avgFans: Long,
        val avgQualityScore: Double,
        val bestFans: Int,
        val bestQualityScore: Int,
        val bestGrade: String,
    )

    fun archiveFile(context: Context): File = File(context.filesDir, FILE_NAME)

    /** Loads comparison stats from runs already on disk. Returns null if no prior runs are archived. */
    fun loadComparison(context: Context): RunComparison? = computeComparison(readArray(archiveFile(context)))

    internal fun computeComparison(records: JSONArray): RunComparison? {
        if (records.length() == 0) return null
        var totalFans = 0L
        var totalQuality = 0L
        var bestFans = 0
        var bestQualityScore = 0
        var bestGrade = ""
        for (i in 0 until records.length()) {
            val entry = records.getJSONObject(i)
            val fans = entry.optInt("fans", 0)
            val qualityScore = entry.optInt("qualityScore", 0)
            totalFans += fans
            totalQuality += qualityScore
            if (fans > bestFans) bestFans = fans
            if (qualityScore > bestQualityScore) {
                bestQualityScore = qualityScore
                bestGrade = entry.optString("qualityGrade", "")
            }
        }
        val runCount = records.length()
        return RunComparison(
            runCount = runCount,
            avgFans = totalFans / runCount,
            avgQualityScore = totalQuality.toDouble() / runCount,
            bestFans = bestFans,
            bestQualityScore = bestQualityScore,
            bestGrade = bestGrade,
        )
    }

    /**
     * Appends a run record built from [input]. Newest entries are stored first.
     *
     * @param isSessionBest When true, marks this entry as the best run in the current multi-run session.
     */
    fun append(context: Context, input: ParentRunSummaryInput, isSessionBest: Boolean = false) {
        try {
            val file = archiveFile(context)
            val records = readArray(file)
            val entry = recordFromInput(input, isSessionBest)
            val updated = JSONArray()
            updated.put(entry)
            for (i in 0 until records.length()) {
                if (i >= MAX_ENTRIES - 1) break
                updated.put(records.getJSONObject(i))
            }
            writeArray(file, updated)
            MessageLog.i(TAG, "Archived parent run for ${input.trainee.name.ifEmpty { input.characterPreset }} (${updated.length()} saved).")
        } catch (t: Throwable) {
            MessageLog.w(TAG, "Failed to archive parent run: ${t.message}")
        }
    }

    /** Returns the archive JSON array as a string (may be `[]`). */
    fun readJson(context: Context): String =
        runCatching {
            val arr = readArray(archiveFile(context))
            arr.toString()
        }.getOrElse { "[]" }

    fun clear(context: Context) {
        runCatching {
            writeArray(archiveFile(context), JSONArray())
        }.onFailure { MessageLog.w(TAG, "Failed to clear parent run archive: ${it.message}") }
    }

    /** Marks the best run in a multi-run session after the session completes. */
    fun markSessionBest(context: Context, sessionId: String, sessionRunIndex: Int) {
        if (sessionId.isEmpty() || sessionRunIndex <= 0) return
        try {
            val file = archiveFile(context)
            val records = readArray(file)
            var updated = false
            for (i in 0 until records.length()) {
                val entry = records.getJSONObject(i)
                if (entry.optString("sessionId") != sessionId) continue
                entry.put("isSessionBest", entry.optInt("sessionRunIndex", 0) == sessionRunIndex)
                updated = true
            }
            if (updated) writeArray(file, records)
        } catch (t: Throwable) {
            MessageLog.w(TAG, "Failed to mark session best run: ${t.message}")
        }
    }

    internal fun recordFromInput(input: ParentRunSummaryInput, isSessionBest: Boolean = false): JSONObject {
        val trainee = input.trainee
        val quality = ParentRunQuality.score(input)
        val sparks = JSONArray()
        for (pick in input.sparkPicks) {
            sparks.put(
                JSONObject()
                    .put("pickIndex", pick.pickIndex)
                    .put("strategy", pick.strategy)
                    .put("optionTexts", JSONArray(pick.optionTexts)),
            )
        }
        return JSONObject()
            .put("id", UUID.randomUUID().toString())
            .put("completedAtMs", System.currentTimeMillis())
            .put("scenario", input.scenario)
            .put("profileName", input.profileName)
            .put("bundleLabel", input.bundleLabel)
            .put("goalPresetLabel", input.goalPresetLabel)
            .put("characterPreset", input.characterPreset)
            .put("traineeName", trainee.name)
            .put("sparkStrategy", input.sparkStrategy)
            .put("targetEpithets", JSONArray(input.targetEpithets))
            .put("forcedEpithets", JSONArray(input.forcedEpithets))
            .put("completedTargetEpithets", JSONArray(input.completedTargetEpithets))
            .put("incompleteTargetEpithets", JSONArray(input.incompleteTargetEpithets))
            .put("extraCompletedEpithets", JSONArray(input.extraCompletedEpithets))
            .put("sparkPicks", sparks)
            .put("fanWeight", input.fanWeight)
            .put("minimumFanTarget", input.minimumFanTarget)
            .put("minimumRaceGapTurns", input.minimumRaceGapTurns)
            .put("targetEpithetMultiplier", input.targetEpithetMultiplier)
            .put("raceWins", input.raceStats.wins)
            .put("raceLosses", input.raceStats.losses)
            .put("elapsedMs", input.elapsedMs ?: -1)
            .put("trainingBias", input.trainingBias)
            .put("fans", trainee.fans)
            .put("fanClass", trainee.fanCountClass.name)
            .put("skillPoints", trainee.skillPoints)
            .put(
                "stats",
                JSONObject()
                    .put("speed", trainee.stats.speed)
                    .put("stamina", trainee.stats.stamina)
                    .put("power", trainee.stats.power)
                    .put("guts", trainee.stats.guts)
                    .put("wit", trainee.stats.wit),
            )
            .put("surfaceAptitudes", aptitudesJson(TrackSurface.entries) { trainee.trackSurfaceAptitudes[it]?.name ?: "" })
            .put("distanceAptitudes", aptitudesJson(TrackDistance.entries) { trainee.trackDistanceAptitudes[it]?.name ?: "" })
            .put("styleAptitudes", aptitudesJson(RunningStyle.entries) { trainee.runningStyleAptitudes[it]?.name ?: "" })
            .put("qualityScore", quality.score)
            .put("qualityGrade", quality.grade)
            .put("qualityBreakdown", ParentRunQuality.breakdownToJson(quality.breakdown))
            .put("sessionId", input.sessionId)
            .put("sessionRunIndex", input.sessionRunIndex)
            .put("sessionRunTarget", input.sessionRunTarget)
            .put("isSessionBest", isSessionBest)
            .put("inheritanceSummary", input.inheritanceSummary)
            .put("harvestSummary", input.harvestSummary)
            .put("harvestVerdict", input.harvestVerdict)
            .put("harvestFactors", JSONArray(input.harvestFactors))
    }

    private fun <T : Enum<T>> aptitudesJson(entries: List<T>, value: (T) -> String): JSONObject {
        val obj = JSONObject()
        for (entry in entries) {
            obj.put(entry.name, value(entry))
        }
        return obj
    }

    private fun readArray(file: File): JSONArray {
        if (!file.exists()) return JSONArray()
        val raw = file.readText()
        if (raw.isBlank()) return JSONArray()
        return runCatching { JSONArray(raw) }.getOrElse { JSONArray() }
    }

    private fun writeArray(file: File, array: JSONArray) {
        file.parentFile?.mkdirs()
        file.writeText(array.toString())
    }
}
