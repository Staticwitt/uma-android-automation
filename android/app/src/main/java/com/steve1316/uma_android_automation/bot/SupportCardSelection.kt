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

    fun ocrRegion(
        imageUtils: CustomImageUtils,
        sourceBitmap: Bitmap,
        centerX: Double,
        centerY: Double,
        widthFraction: Double,
        heightFraction: Double,
        debugName: String,
    ): String =
        imageUtils.performOCROnRegion(
            sourceBitmap,
            imageUtils.relX(centerX, -((SharedData.displayWidth * widthFraction) / 2).toInt()),
            imageUtils.relY(centerY, -((SharedData.displayHeight * heightFraction) / 2).toInt()),
            (SharedData.displayWidth * widthFraction).toInt(),
            (SharedData.displayHeight * heightFraction).toInt(),
            useThreshold = false,
            useGrayscale = true,
            scale = 2.0,
            ocrEngine = "tesseract",
            debugName = debugName,
        )

    /** Scrolls a support picker list and taps the first row matching [cardName]. */
    fun findAndTapCardInList(game: Game, cardName: String, logTag: String): Boolean {
        if (isTraineeCharacter(cardName)) {
            com.steve1316.automation_library.utils.MessageLog.w(
                logTag,
                "Refusing to select trainee \"$cardName\" as support.",
            )
            return false
        }
        var tapped = false
        ScrollList.processWithFallback(
            game,
            fallbackComponent = LabelEventProgress,
            entryDetectionConfig = ScrollListEntryDetectionConfig(bUseGeneric = true),
            keyExtractor = { entry -> ocrEntry(game.imageUtils, entry) },
            onEntry = { _, entry ->
                val text = ocrEntry(game.imageUtils, entry)
                val score = matchScore(text, cardName)
                if (score >= MIN_NAME_MATCH_SCORE) {
                    com.steve1316.automation_library.utils.MessageLog.i(
                        logTag,
                        "Tapping support \"$cardName\" (score=$score, ocr=\"$text\").",
                    )
                    game.tap(entry.bbox.cx.toDouble(), entry.bbox.cy.toDouble())
                    game.wait(0.8)
                    tapped = true
                    true
                } else {
                    false
                }
            },
        )
        if (!tapped) {
            dismissListPicker(game)
        }
        return tapped
    }

    /** Closes a scrollable card/parent picker so career-selection automation can continue. */
    fun dismissListPicker(game: Game) {
        when {
            ButtonBackGreen.click(game.imageUtils) -> game.wait(0.5)
            ButtonBack.click(game.imageUtils) -> game.wait(0.5)
        }
    }

    private fun ocrEntry(imageUtils: CustomImageUtils, entry: ScrollListEntry): String =
        imageUtils.performOCROnRegion(
            entry.bitmap,
            0,
            0,
            entry.bitmap.width,
            entry.bitmap.height,
            useThreshold = false,
            useGrayscale = true,
            scale = 2.0,
            ocrEngine = "tesseract",
            debugName = "support_card_list_entry",
        ).lowercase()
}
