package com.steve1316.uma_android_automation.utils

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.nio.file.Files
import java.nio.file.Paths

/** Guards [ScrollList.process] timeout wiring. */
class ScrollListTimeoutTest {
    @Test
    fun process_usesCallerSuppliedMaxTimeMs() {
        val source =
            Files.readString(
                Paths.get("src/main/java/com/steve1316/uma_android_automation/utils/ScrollList.kt"),
            )
        assertTrue(source.contains("loopTimeoutMs: Long = maxTimeMs.toLong()"))
        assertFalse(source.contains("val maxTimeMs: Long = 60000"))
    }
}
