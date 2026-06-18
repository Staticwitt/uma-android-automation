package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import org.json.JSONArray
import org.json.JSONObject

/**
 * Applies pre-resolved parent-farming goal queue patches between multi-run careers.
 * Patches are written by React when the user saves the queue or breeding plan.
 */
object ParentFarmingGoalQueue {
    private const val TAG = "[PF_GOAL_QUEUE]"

    data class ResolvedPatch(
        val label: String,
        val bundleKey: String,
        val goalPresetKey: String,
        val scenario: String,
        val characterPreset: String,
        val aptitudes: String,
        val targetEpithets: String,
        val forcedEpithets: String,
        val weights: String,
        val sparkStrategy: String,
        val legacyStrategy: String,
        val supportBorrow: String,
        val preferredDistanceOverride: String,
        val enablePrioritizeSkillHints: Boolean,
        val targetFactorSkills: String,
        val usePreviousAsLegacy: Boolean,
        val legacyParentPreferredPair: String,
    )

    @Volatile private var patches: List<ResolvedPatch> = emptyList()
    @Volatile private var activeIndex: Int = -1
    @Volatile private var activePatch: ResolvedPatch? = null

    fun isEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMode", false) &&
            SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMultiRun", false) &&
            SettingsHelper.getBooleanSetting("racing", "enableParentFarmingGoalQueue", false)

    fun resetSession() {
        patches = loadPatches()
        activeIndex = if (isEnabled() && patches.isNotEmpty()) 0 else -1
        activePatch = patches.getOrNull(activeIndex)
        if (activePatch != null) {
            MessageLog.i(TAG, "Goal queue session started (${patches.size} goals). First: ${activePatch!!.label}")
            logActivePatch(activePatch!!)
        }
    }

    /** Read-only lookup of the patch for an upcoming run, without mutating the active patch. */
    fun peekPatchForRunIndex(runIndex: Int): ResolvedPatch? {
        if (!isEnabled() || patches.isEmpty()) return null
        val index = runIndex.coerceIn(0, patches.lastIndex)
        return patches[index]
    }

    fun applyForRunIndex(runIndex: Int) {
        if (!isEnabled() || patches.isEmpty()) {
            activePatch = null
            activeIndex = -1
            return
        }
        val index = runIndex.coerceIn(0, patches.lastIndex)
        activeIndex = index
        activePatch = patches[index]
        MessageLog.i(TAG, "Goal queue run ${runIndex + 1}/${patches.size}: ${activePatch!!.label}")
        logActivePatch(activePatch!!)
    }

    fun activeLabel(): String = activePatch?.label ?: ""

    fun preferredDistanceOverride(): String? = activePatch?.preferredDistanceOverride?.takeIf { it.isNotEmpty() }

    fun hasActiveOverride(): Boolean = activePatch != null

    /** Reads a racing setting with the active goal-queue patch applied when present. */
    fun racingString(key: String, fallback: String = ""): String = overrideString(key, SettingsHelper.getStringSetting("racing", key, fallback))

    fun overrideString(key: String, fallback: String): String {
        val patch = activePatch ?: return fallback
        return when (key) {
            "smartRaceSolverCharacterPreset" -> patch.characterPreset.ifEmpty { fallback }
            "smartRaceSolverAptitudes" -> patch.aptitudes.ifEmpty { fallback }
            "smartRaceSolverTargetEpithets" -> patch.targetEpithets.ifEmpty { fallback }
            "smartRaceSolverForcedEpithets" -> patch.forcedEpithets.ifEmpty { fallback }
            "smartRaceSolverWeights" -> patch.weights.ifEmpty { fallback }
            "sparkSelectionStrategy" -> patch.sparkStrategy.ifEmpty { fallback }
            "legacyParentSelectionStrategy" -> patch.legacyStrategy.ifEmpty { fallback }
            "supportBorrowPreferredCards" -> patch.supportBorrow.ifEmpty { fallback }
            "parentFarmingBundleKey" -> patch.bundleKey
            "parentFarmingGoalPresetKey" -> patch.goalPresetKey
            "parentFarmingBundleLabel" -> if (patch.bundleKey.isNotEmpty()) patch.label else ""
            "parentFarmingGoalPresetLabel" -> patch.label
            "parentFarmingTargetFactorSkills" -> patch.targetFactorSkills.ifEmpty { fallback }
            "legacyParentPreferredPair" -> patch.legacyParentPreferredPair.ifEmpty { fallback }
            else -> fallback
        }
    }

    fun overrideBoolean(key: String, fallback: Boolean): Boolean {
        val patch = activePatch ?: return fallback
        return when (key) {
            "enablePrioritizeSkillHints" -> patch.enablePrioritizeSkillHints
            else -> fallback
        }
    }

    fun overrideScenario(fallback: String): String = activePatch?.scenario?.ifEmpty { fallback } ?: fallback

    private fun logActivePatch(patch: ResolvedPatch) {
        MessageLog.i(
            TAG,
            "Active patch: trainee=${patch.characterPreset}, scenario=${patch.scenario}, " +
                "factors=${patch.targetFactorSkills}, usePreviousLegacy=${patch.usePreviousAsLegacy}, " +
                "legacyPair=${patch.legacyParentPreferredPair}",
        )
    }

    private fun loadPatches(): List<ResolvedPatch> {
        val json = SettingsHelper.getStringSetting("racing", "parentFarmingGoalQueueResolved", "[]")
        if (json.isBlank()) return emptyList()
        return runCatching {
            val arr = JSONArray(json)
            buildList {
                for (i in 0 until arr.length()) {
                    val obj = arr.optJSONObject(i) ?: continue
                    add(
                        ResolvedPatch(
                            label = obj.optString("label", "Goal ${i + 1}"),
                            bundleKey = obj.optString("bundleKey", ""),
                            goalPresetKey = obj.optString("goalPresetKey", ""),
                            scenario = obj.optString("scenario", ""),
                            characterPreset = obj.optString("characterPreset", ""),
                            aptitudes = obj.optString("aptitudes", "{}"),
                            targetEpithets = obj.optString("targetEpithets", "[]"),
                            forcedEpithets = obj.optString("forcedEpithets", "[]"),
                            weights = obj.optString("weights", "{}"),
                            sparkStrategy = obj.optString("sparkStrategy", "Default"),
                            legacyStrategy = obj.optString("legacyStrategy", "Default"),
                            supportBorrow = obj.optString("supportBorrow", "[]"),
                            preferredDistanceOverride = obj.optString("preferredDistanceOverride", "Default"),
                            enablePrioritizeSkillHints = obj.optBoolean("enablePrioritizeSkillHints", false),
                            targetFactorSkills = obj.optString("targetFactorSkills", "[]"),
                            usePreviousAsLegacy = obj.optBoolean("usePreviousAsLegacy", false),
                            legacyParentPreferredPair = obj.optString("legacyParentPreferredPair", "[]"),
                        ),
                    )
                }
            }
        }.getOrElse {
            MessageLog.w(TAG, "Failed to parse goal queue patches.")
            emptyList()
        }
    }
}
