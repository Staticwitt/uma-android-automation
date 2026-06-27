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
 * Persists completed regular (non-parent-farming) career runs locally for in-app history.
 *
 * Mirrors [ParentRunArchive]'s file-backed JSON array pattern, but only keeps the generic
 * end-of-career fields available for any campaign run instead of parent-farming-specific data
 * like epithets, spark picks, or quality scoring.
 */
object CareerRunArchive {
    private const val TAG = "[${MainActivity.loggerTag}]CareerRunArchive"
    private const val FILE_NAME = "career_run_archive.json"
    private const val MAX_ENTRIES = 50

    fun archiveFile(context: Context): File = File(context.filesDir, FILE_NAME)

    /** Appends a run record. Newest entries are stored first. */
    fun append(context: Context, trainee: Trainee, scenario: String, elapsedMs: Long?, raceStats: RunRaceStats) {
        try {
            val file = archiveFile(context)
            val records = readArray(file)
            val entry = recordFromTrainee(trainee, scenario, elapsedMs, raceStats)
            val updated = JSONArray()
            updated.put(entry)
            for (i in 0 until records.length()) {
                if (i >= MAX_ENTRIES - 1) break
                updated.put(records.getJSONObject(i))
            }
            writeArray(file, updated)
            MessageLog.i(TAG, "Archived career run for ${trainee.name.ifEmpty { "Unknown" }} (${updated.length()} saved).")
        } catch (t: Throwable) {
            MessageLog.w(TAG, "Failed to archive career run: ${t.message}")
        }
    }

    /** Returns the archive JSON array as a string (may be `[]`). */
    fun readJson(context: Context): String =
        runCatching {
            readArray(archiveFile(context)).toString()
        }.getOrElse { "[]" }

    fun clear(context: Context) {
        runCatching {
            writeArray(archiveFile(context), JSONArray())
        }.onFailure { MessageLog.w(TAG, "Failed to clear career run archive: ${it.message}") }
    }

    private fun recordFromTrainee(trainee: Trainee, scenario: String, elapsedMs: Long?, raceStats: RunRaceStats): JSONObject =
        JSONObject()
            .put("id", UUID.randomUUID().toString())
            .put("completedAtMs", System.currentTimeMillis())
            .put("scenario", scenario)
            .put("traineeName", trainee.name)
            .put("careerRank", trainee.careerRank)
            .put("careerRating", trainee.careerRating)
            .put("raceWins", raceStats.wins)
            .put("raceLosses", raceStats.losses)
            .put("elapsedMs", elapsedMs ?: -1)
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
