package com.steve1316.uma_android_automation.utils

import android.os.Build
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
            <apkUrl>https://example.com/app-arm64.apk</apkUrl>
            <apkUrlX8664>https://example.com/app-x86_64.apk</apkUrlX8664>
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
        assertTrue(info.apkUrl == "https://example.com/app-arm64.apk")
        assertTrue(info.apkUrlX8664 == "https://example.com/app-x86_64.apk")
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
                apkUrlX8664 = null,
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
                apkUrlX8664 = null,
                releaseNotes = "notes",
            )
        assertTrue(AppUpdateChecker.isUpdateAvailable(info, "5.7.9", 79))
        assertFalse(AppUpdateChecker.isUpdateAvailable(info, "5.8.0", 0))
    }

    @Test
    fun resolveApkUrlForDevice_prefers_x86_url_on_x86_64() {
        val info =
            AppUpdateInfo(
                latestVersion = "5.9.3",
                latestVersionCode = 93,
                url = "https://example.com",
                apkUrl = "https://example.com/arm64.apk",
                apkUrlX8664 = "https://example.com/x86_64.apk",
                releaseNotes = "notes",
            )
        // Device ABI is fixed at test runtime; when primary ABI is x86_64, x86 URL wins.
        val resolved = AppUpdateChecker.resolveApkUrlForDevice(info)
        if (Build.SUPPORTED_ABIS?.firstOrNull() == "x86_64") {
            assertTrue(resolved == "https://example.com/x86_64.apk")
        } else {
            assertTrue(resolved == "https://example.com/arm64.apk")
        }
    }
}
