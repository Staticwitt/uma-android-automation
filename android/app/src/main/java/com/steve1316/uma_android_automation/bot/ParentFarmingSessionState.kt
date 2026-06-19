package com.steve1316.uma_android_automation.bot

import android.content.Context
import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import org.json.JSONObject
import java.io.File

/**
 * Persists in-progress multi-run session state to disk so restarting the bot mid breeding-plan can resume
 * at the same generation instead of starting over, as long as the resolved goal queue hasn't changed since.
 * Editing the breeding plan (or toggling [isEnabled] off) naturally invalidates any saved resume state.
 */
object ParentFarmingSessionState {
    private const val TAG = "[PF_SESSION_STATE]"
    private const val FILE_NAME = "parent_farming_session_state.json"

    data class Saved(
        val fingerprint: String,
        val sessionId: String,
        val runsCompleted: Int,
        val bestQualityScore: Int,
        val bestQualityGrade: String,
        val bestRunIndex: Int,
        val borrowRotationOffset: Int,
    )

    private fun file(context: Context): File = File(context.filesDir, FILE_NAME)

    fun isEnabled(): Boolean = SettingsHelper.getBooleanSetting("racing", "enableParentFarmingResumeSession", true)

    /** Fingerprint of the resolved goal queue; a changed/edited breeding plan is treated as a new session. */
    fun currentFingerprint(): String = SettingsHelper.getStringSetting("racing", "parentFarmingGoalQueueResolved", "[]")

    internal fun toJson(state: Saved): JSONObject =
        JSONObject()
            .put("fingerprint", state.fingerprint)
            .put("sessionId", state.sessionId)
            .put("runsCompleted", state.runsCompleted)
            .put("bestQualityScore", state.bestQualityScore)
            .put("bestQualityGrade", state.bestQualityGrade)
            .put("bestRunIndex", state.bestRunIndex)
            .put("borrowRotationOffset", state.borrowRotationOffset)

    internal fun fromJson(obj: JSONObject): Saved =
        Saved(
            fingerprint = obj.optString("fingerprint", ""),
            sessionId = obj.optString("sessionId", ""),
            runsCompleted = obj.optInt("runsCompleted", 0),
            bestQualityScore = obj.optInt("bestQualityScore", 0),
            bestQualityGrade = obj.optString("bestQualityGrade", ""),
            bestRunIndex = obj.optInt("bestRunIndex", 0),
            borrowRotationOffset = obj.optInt("borrowRotationOffset", 0),
        )

    fun load(context: Context): Saved? =
        runCatching {
            val file = file(context)
            if (!file.exists()) return null
            fromJson(JSONObject(file.readText()))
        }.getOrElse {
            MessageLog.w(TAG, "Failed to load session state: ${it.message}")
            null
        }

    fun save(context: Context, state: Saved) {
        runCatching { file(context).writeText(toJson(state).toString()) }
            .onFailure { MessageLog.w(TAG, "Failed to save session state: ${it.message}") }
    }

    fun clear(context: Context) {
        runCatching { file(context).delete() }.onFailure { MessageLog.w(TAG, "Failed to clear session state: ${it.message}") }
    }
}
