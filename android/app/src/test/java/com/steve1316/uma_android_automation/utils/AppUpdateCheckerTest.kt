package com.steve1316.uma_android_automation.utils

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.ByteArrayInputStream

class AppUpdateCheckerTest {
    private val sampleXml =
        """
        <AppUpdater>
          <update>
            <latestVersion>5.7.9</latestVersion>
            <latestVersionCode>79</latestVersionCode>
            <url>https://github.com/Staticwitt/uma-android-automation/releases/tag/v5.7.9</url>
            <apkUrl>https://example.com/app.apk</apkUrl>
            <releaseNotes>Test release notes</releaseNotes>
          </update>
        </AppUpdater>
        """.trimIndent()

    @Test
    fun parseUpdateXml_reads_version_code_and_apk_url() {
        val info = AppUpdateChecker.parseUpdateXml(ByteArrayInputStream(sampleXml.toByteArray()))
        requireNotNull(info)
        assertTrue(info.latestVersion == "5.7.9")
        assertTrue(info.latestVersionCode == 79)
        assertTrue(info.apkUrl == "https://example.com/app.apk")
        assertTrue(info.releaseNotes.contains("Test release notes"))
    }

    @Test
    fun isUpdateAvailable_prefers_version_code() {
        val info =
            AppUpdateInfo(
                latestVersion = "5.7.9",
                latestVersionCode = 79,
                url = "https://example.com",
                apkUrl = null,
                releaseNotes = "notes",
            )
        assertTrue(AppUpdateChecker.isUpdateAvailable(info, "5.7.8", 78))
        assertFalse(AppUpdateChecker.isUpdateAvailable(info, "5.7.9", 79))
        assertFalse(AppUpdateChecker.isUpdateAvailable(info, "5.8.0", 80))
    }

    @Test
    fun isUpdateAvailable_falls_back_to_version_name() {
        val info =
            AppUpdateInfo(
                latestVersion = "5.8.0",
                latestVersionCode = 0,
                url = "https://example.com",
                apkUrl = null,
                releaseNotes = "notes",
            )
        assertTrue(AppUpdateChecker.isUpdateAvailable(info, "5.7.9", 79))
        assertFalse(AppUpdateChecker.isUpdateAvailable(info, "5.8.0", 0))
    }
}
