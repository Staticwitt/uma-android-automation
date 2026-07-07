package com.steve1316.uma_android_automation.bot

import android.graphics.Bitmap
import com.steve1316.automation_library.data.SharedData
import com.steve1316.automation_library.utils.SettingsHelper
import com.steve1316.uma_android_automation.components.ButtonBack
import com.steve1316.uma_android_automation.components.ButtonBackGreen
import com.steve1316.uma_android_automation.components.LabelEventProgress
import com.steve1316.uma_android_automation.utils.CustomImageUtils
import com.steve1316.uma_android_automation.utils.ScrollList
import com.steve1316.uma_android_automation.utils.ScrollListEntry
import com.steve1316.uma_android_automation.utils.ScrollListEntryDetectionConfig
import net.ricecode.similarity.JaroWinklerStrategy
import net.ricecode.similarity.StringSimilarityServiceImpl
import org.json.JSONArray

/** Shared OCR + scroll-list matching for support card names at career selection. */
internal object SupportCardSelection {
    const val MIN_NAME_MATCH_SCORE = 0.82

    /** Slot labels are small — keep 2× OCR for accuracy. */
    const val SLOT_OCR_SCALE = 2.0

    /** List rows are larger crops — 1.5× is enough and faster while scrolling. */
    const val LIST_OCR_SCALE = 1.5

    private const val POST_TAP_WAIT_SEC = 0.6

    /**
     * Substrings that identify a non-card control row (e.g. the "Remove" button shown above the
     * friend list when a support card is already borrowed) rather than an actual friend/card entry,
     * so it never gets treated as a match. No real friend name or support card title will ever
     * legitimately contain these words.
     */
    private val NON_CARD_ROW_MARKERS = listOf("remove")

    private val similarity = StringSimilarityServiceImpl(JaroWinklerStrategy())

    fun readStringList(json: String): List<String> {
        if (json.isEmpty()) return emptyList()
        return runCatching {
            val array = JSONArray(json)
            buildList {
                for (i in 0 until array.length()) {
                    val value = array.optString(i)
                    if (value.isNotBlank()) add(value)
                }
            }
        }.getOrElse { emptyList() }
    }

    /** True when [name] matches the active trainee character preset (case-insensitive). */
    fun isTraineeCharacter(name: String): Boolean {
        val trainee =
            SettingsHelper.getStringSetting("racing", "smartRaceSolverCharacterPreset")
                .trim()
        if (trainee.isEmpty()) return false
        return name.trim().equals(trainee, ignoreCase = true)
    }

    /** Drops the trainee from borrow/equip candidate lists so the bot never picks itself as support. */
    fun filterTraineeFromSupportNames(names: List<String>): List<String> =
        names.filterNot { isTraineeCharacter(it) }

    fun ocrMightMatchName(normalizedOcr: String, needle: String): Boolean {
        if (needle.isEmpty()) return false
        if (normalizedOcr.contains(needle)) return true
        if (needle.length < 3) return true
        for (i in 0..needle.length - 3) {
            if (normalizedOcr.contains(needle.substring(i, i + 3))) return true
        }
        return false
    }

    fun matchScore(ocrText: String, name: String): Double {
        val normalizedOcr = ocrText.lowercase()
        val needle = name.lowercase()
        if (!ocrMightMatchName(normalizedOcr, needle)) return 0.0
        return when {
            normalizedOcr.contains(needle) -> 1.0
            else -> similarity.score(needle, normalizedOcr)
        }
    }

    internal fun matchesName(ocrText: String, name: String): Boolean = matchScore(ocrText, name) >= MIN_NAME_MATCH_SCORE

    /** First preferred name that meets [minScore], preserving list priority order. */
    internal fun firstMatchingPreferredName(
        ocrText: String,
        preferredNames: List<String>,
        minScore: Double = MIN_NAME_MATCH_SCORE,
    ): String? {
        for (name in preferredNames) {
            if (isTraineeCharacter(name)) continue
            if (matchScore(ocrText, name) >= minScore) return name
        }
        return null
    }

    fun ocrRegion(
        imageUtils: CustomImageUtils,
        sourceBitmap: Bitmap,
        centerX: Double,
        centerY: Double,
        widthFraction: Double,
        heightFraction: Double,
        debugName: String,
        scale: Double = SLOT_OCR_SCALE,
    ): String =
        imageUtils.performOCROnRegion(
            sourceBitmap,
            imageUtils.relX(centerX, -((SharedData.displayWidth * widthFraction) / 2).toInt()),
            imageUtils.relY(centerY, -((SharedData.displayHeight * heightFraction) / 2).toInt()),
            (SharedData.displayWidth * widthFraction).toInt(),
            (SharedData.displayHeight * heightFraction).toInt(),
            useThreshold = false,
            useGrayscale = true,
            scale = scale,
            ocrEngine = "tesseract",
            debugName = debugName,
        )

    /** Scrolls a support picker list and taps the first row matching [cardName]. */
    fun findAndTapCardInList(game: Game, cardName: String, logTag: String): Boolean =
        findAndTapPreferredCardInList(game, listOf(cardName), logTag) != null

    /**
     * Scrolls the picker once and taps the first row matching any name in priority order.
     *
     * @return The matched card name, or null when no row met the threshold.
     */
    fun findAndTapPreferredCardInList(game: Game, cardNames: List<String>, logTag: String): String? {
        val preferredNames = filterTraineeFromSupportNames(cardNames)
        if (preferredNames.isEmpty()) return null

        var matchedName: String? = null
        ScrollList.processWithFallback(
            game,
            fallbackComponent = LabelEventProgress,
            entryDetectionConfig = ScrollListEntryDetectionConfig(bUseGeneric = true),
            keyExtractor = { entry -> entryDedupeKey(entry) },
            onEntry = { _, entry ->
                val text = ocrEntry(game.imageUtils, entry)
                val name = if (NON_CARD_ROW_MARKERS.any { marker -> text.contains(marker) }) {
                    com.steve1316.automation_library.utils.MessageLog.d(
                        logTag,
                        "Skipping non-card control row (ocr=\"$text\").",
                    )
                    null
                } else {
                    firstMatchingPreferredName(text, preferredNames)
                }
                if (name != null) {
                    val score = matchScore(text, name)
                    com.steve1316.automation_library.utils.MessageLog.i(
                        logTag,
                        "Tapping support \"$name\" (score=$score, ocr=\"$text\").",
                    )
                    game.tap(entry.bbox.cx.toDouble(), entry.bbox.cy.toDouble())
                    game.wait(POST_TAP_WAIT_SEC)
                    matchedName = name
                    true
                } else {
                    false
                }
            },
        )
        if (matchedName == null) {
            dismissListPicker(game)
        }
        return matchedName
    }

    /** Closes a scrollable card/parent picker so career-selection automation can continue. */
    fun dismissListPicker(game: Game) {
        when {
            ButtonBackGreen.click(game.imageUtils) -> game.wait(0.4)
            ButtonBack.click(game.imageUtils) -> game.wait(0.4)
        }
    }

    internal fun entryDedupeKey(entry: ScrollListEntry): String =
        "${entry.bbox.x}:${entry.bbox.y}:${entry.bbox.w}:${entry.bbox.h}"

    private fun ocrEntry(imageUtils: CustomImageUtils, entry: ScrollListEntry): String =
        imageUtils.performOCROnRegion(
            entry.bitmap,
            0,
            0,
            entry.bitmap.width,
            entry.bitmap.height,
            useThreshold = false,
            useGrayscale = true,
            scale = LIST_OCR_SCALE,
            ocrEngine = "tesseract",
            debugName = "support_card_list_entry",
        ).lowercase()
}
