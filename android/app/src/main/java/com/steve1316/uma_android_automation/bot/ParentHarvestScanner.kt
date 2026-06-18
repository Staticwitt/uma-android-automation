package com.steve1316.uma_android_automation.bot

import com.steve1316.automation_library.utils.MessageLog
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.components.ButtonSkillListFullStats
import com.steve1316.uma_android_automation.components.ButtonClose
import com.steve1316.uma_android_automation.utils.ScrollList
import com.steve1316.uma_android_automation.utils.ScrollListEntry
import com.steve1316.uma_android_automation.utils.ScrollListEntryDetectionConfig
import org.json.JSONArray

/**
 * Scrapes inherited factors / skills at career end for parent harvest reporting.
 */
object ParentHarvestScanner {
    private const val TAG = "[PF_HARVEST]"

    data class HarvestResult(
        val matchedFactors: List<String>,
        val targetHits: List<String>,
        val summary: String,
        val verdict: String,
    )

    fun isEnabled(): Boolean =
        SettingsHelper.getBooleanSetting("racing", "enableParentFarmingMode", false) &&
            SettingsHelper.getBooleanSetting("racing", "enableParentFarmingHarvestReport", true)

    fun scanAtCareerEnd(game: Game): HarvestResult? {
        if (!isEnabled()) return null
        val targets = readTargetFactors()
        val collected = mutableSetOf<String>()

        if (ButtonSkillListFullStats.check(game.imageUtils)) {
            ButtonSkillListFullStats.click(game.imageUtils)
            game.wait(1.0)
            ScrollList.processWithFallback(
                game,
                entryDetectionConfig = ScrollListEntryDetectionConfig(bUseGeneric = true),
                keyExtractor = { entry -> ocrEntry(game, entry) },
                onEntry = { _, entry ->
                    val text = ocrEntry(game, entry)
                    val matches = FactorSkillMatcher.matchInText(game.myContext, text, limit = 3)
                    for (match in matches) {
                        collected.add(match.skillName)
                    }
                    false
                },
            )
            ButtonClose.click(game.imageUtils)
            game.wait(0.6)
        }

        val targetHits = targets.filter { target ->
            collected.any { factor -> factor.contains(target, ignoreCase = true) || target.contains(factor, ignoreCase = true) }
        }
        val summary =
            if (collected.isEmpty()) {
                "No inherited skills OCR-scraped (spark history still logged)."
            } else {
                collected.sorted().joinToString(" · ")
            }
        val verdict = buildVerdict(collected, targetHits, targets)
        MessageLog.i(TAG, "Harvest: $summary")
        if (targetHits.isNotEmpty()) MessageLog.i(TAG, "Target factor hits: ${targetHits.joinToString(" · ")}")
        MessageLog.i(TAG, "Verdict: $verdict")
        return HarvestResult(collected.sorted(), targetHits, summary, verdict)
    }

    private fun buildVerdict(collected: Set<String>, targetHits: List<String>, targets: List<String>): String =
        when {
            targets.isNotEmpty() && targetHits.size == targets.size -> "KEEP — all target factors found"
            targets.isNotEmpty() && targetHits.isNotEmpty() -> "PARTIAL — ${targetHits.size}/${targets.size} target factors"
            targets.isNotEmpty() -> "REROLL — missing target factors"
            collected.isNotEmpty() -> "REVIEW — ${collected.size} inherited skills scraped"
            else -> "UNKNOWN — no factor OCR"
        }

    private fun readTargetFactors(): List<String> =
        SupportCardSelection.readStringList(
            SettingsHelper.getStringSetting("racing", "parentFarmingTargetFactorSkills", "[]"),
        )

    private fun ocrEntry(game: Game, entry: ScrollListEntry): String =
        game.imageUtils.performOCROnRegion(
            entry.bitmap,
            0,
            0,
            entry.bitmap.width,
            entry.bitmap.height,
            useThreshold = false,
            useGrayscale = true,
            scale = 2.0,
            ocrEngine = "tesseract",
            debugName = "harvest_skill_entry",
        )

    fun harvestToJson(result: HarvestResult?): String {
        if (result == null) return "{}"
        return org.json.JSONObject()
            .put("matchedFactors", JSONArray(result.matchedFactors))
            .put("targetHits", JSONArray(result.targetHits))
            .put("summary", result.summary)
            .put("verdict", result.verdict)
            .toString()
    }
}
