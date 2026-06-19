package com.steve1316.uma_android_automation.bot

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

/** Guards career-selection automation order in [Campaign.process]. */
class CareerSelectionAutomationOrderTest {
    @Test
    fun campaignProcess_runsParentsBeforeOwnedEquipAndBorrow() {
        val source = File("src/main/java/com/steve1316/uma_android_automation/bot/Campaign.kt").readText()
        val legacyIndex = source.indexOf("LegacyParentSelector.tryTriggerAutoSelect")
        val equipIndex = source.indexOf("OwnedSupportDeckEquipper.tryEquipOwnedDeck")
        val borrowIndex = source.indexOf("SupportCardBorrower.tryOpenBorrowDialog")
        // Search from borrowIndex: an unrelated, earlier "final_confirmation" call site also matches
        // this string, which would otherwise make startIndex resolve before borrowIndex.
        val startIndex = source.indexOf("CareerSelectionAutomation.tryStartCareer", borrowIndex)

        assertTrue(legacyIndex >= 0 && equipIndex > legacyIndex, "legacy parent step should appear before owned equip")
        assertTrue(equipIndex >= 0 && borrowIndex > equipIndex, "owned equip should appear before borrow")
        assertTrue(borrowIndex >= 0 && startIndex > borrowIndex, "borrow should appear before auto-start")
    }
}
