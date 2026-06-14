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

    fun archiveFile(context: Context): File = File(context.filesDir, FILE_NAME)

    /**
     * Appends a run record built from [input]. Newest entries are stored first.
     */
    fun append(context: Context, input: ParentRunSummaryInput) {
        try {
            val file = archiveFile(context)
            val records = readArray(file)
            val entry = recordFromInput(input)
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

    internal fun recordFromInput(input: ParentRunSummaryInput): JSONObject {
        val trainee = input.trainee
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
