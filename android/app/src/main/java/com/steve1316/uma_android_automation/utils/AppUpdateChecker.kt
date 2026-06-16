package com.steve1316.uma_android_automation.utils

import android.app.Activity
import android.app.Dialog
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.drawable.ColorDrawable
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.ReplacementSpan
import android.util.DisplayMetrics
import android.view.ViewGroup
import android.widget.Button
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.steve1316.uma_android_automation.BuildConfig
import com.steve1316.uma_android_automation.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.xmlpull.v1.XmlPullParser
import org.xmlpull.v1.XmlPullParserFactory
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

data class AppUpdateInfo(
    val latestVersion: String,
    val latestVersionCode: Int,
    val url: String,
    val apkUrl: String?,
    /** Optional x86_64 split APK for emulators and x86_64 devices. */
    val apkUrlX8664: String?,
    val releaseNotes: String,
)

/** How the update dialog should present itself. */
enum class AppUpdateDisplayMode { UPDATE_AVAILABLE, CURRENT_CHANGELOG }

/**
 * Checks for app updates by fetching [AppUpdateChecker.UPDATE_XML_URL] on GitHub. When a newer build is available, shows a dialog with
 * release notes and can download the matching ABI split APK directly and launch the package installer.
 */
class AppUpdateChecker(private val activity: Activity) {
    companion object {
        const val UPDATE_XML_URL: String =
            "https://raw.githubusercontent.com/Staticwitt/uma-android-automation/master/android/app/update.xml"

        private const val MAX_SCROLL_HEIGHT_RATIO = 0.5

        /**
         * Parses the remote update XML stream.
         *
         * @param inputStream Raw XML from [UPDATE_XML_URL].
         * @return Parsed [AppUpdateInfo], or null when required fields are missing.
         */
        fun parseUpdateXml(inputStream: InputStream): AppUpdateInfo? {
            val parser = XmlPullParserFactory.newInstance().newPullParser()
            parser.setInput(inputStream, null)

            var latestVersion: String? = null
            var latestVersionCode: Int? = null
            var url: String? = null
            var apkUrl: String? = null
            var apkUrlX8664: String? = null
            var releaseNotes: String? = null
            var currentTag: String? = null

            var eventType = parser.eventType
            while (eventType != XmlPullParser.END_DOCUMENT) {
                when (eventType) {
                    XmlPullParser.START_TAG -> currentTag = parser.name
                    XmlPullParser.TEXT -> {
                        val text = parser.text?.trim() ?: ""
                        if (text.isEmpty()) {
                            eventType = parser.next()
                            continue
                        }
                        when (currentTag) {
                            "latestVersion" -> latestVersion = text
                            "latestVersionCode" -> latestVersionCode = text.toIntOrNull()
                            "url" -> url = text
                            "apkUrl" -> apkUrl = text
                            "apkUrlX8664" -> apkUrlX8664 = text
                            "releaseNotes" -> releaseNotes = text.trim()
                        }
                    }
                    XmlPullParser.END_TAG -> currentTag = null
                }
                eventType = parser.next()
            }

            return if (latestVersion != null && url != null && releaseNotes != null) {
                AppUpdateInfo(
                    latestVersion = latestVersion,
                    latestVersionCode = latestVersionCode ?: 0,
                    url = url,
                    apkUrl = apkUrl?.takeIf { it.isNotEmpty() },
                    apkUrlX8664 = apkUrlX8664?.takeIf { it.isNotEmpty() },
                    releaseNotes = releaseNotes,
                )
            } else {
                null
            }
        }

        /** Picks arm64 or x86_64 download URL based on the device's primary supported ABI. */
        fun resolveApkUrlForDevice(updateInfo: AppUpdateInfo): String? {
            val primaryAbi = Build.SUPPORTED_ABIS?.firstOrNull() ?: ""
            if (primaryAbi == "x86_64" && updateInfo.apkUrlX8664 != null) {
                return updateInfo.apkUrlX8664
            }
            return updateInfo.apkUrl
        }

        /**
         * Returns true when the remote update is newer than the installed build.
         * Prefers [latestVersionCode] when both sides have a positive code; otherwise compares semver segments.
         */
        fun isUpdateAvailable(updateInfo: AppUpdateInfo, currentVersionName: String, currentVersionCode: Int): Boolean {
            if (updateInfo.latestVersionCode > 0 && currentVersionCode > 0) {
                return updateInfo.latestVersionCode > currentVersionCode
            }
            return isNewerVersionName(updateInfo.latestVersion, currentVersionName)
        }

        private fun isNewerVersionName(latest: String, current: String): Boolean {
            val latestParts = latest.split(".").map { it.toIntOrNull() ?: 0 }
            val currentParts = current.split(".").map { it.toIntOrNull() ?: 0 }
            val maxLen = maxOf(latestParts.size, currentParts.size)
            for (i in 0 until maxLen) {
                val l = latestParts.getOrElse(i) { 0 }
                val c = currentParts.getOrElse(i) { 0 }
                if (l > c) return true
                if (l < c) return false
            }
            return false
        }
    }

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    /**
     * Fetches the remote update XML and shows the update dialog when a newer build is available.
     *
     * @param forceShow When true, always shows the dialog (useful for manual checks from the drawer).
     */
    fun checkForUpdate(forceShow: Boolean = false) {
        scope.launch {
            try {
                val updateInfo = fetchUpdateInfo() ?: return@launch
                val available = isUpdateAvailable(updateInfo, BuildConfig.VERSION_NAME, BuildConfig.VERSION_CODE)
                if (available) {
                    showUpdateDialog(updateInfo, AppUpdateDisplayMode.UPDATE_AVAILABLE)
                } else if (forceShow) {
                    Toast.makeText(activity, "You're on the latest version (v${BuildConfig.VERSION_NAME}).", Toast.LENGTH_SHORT).show()
                }
            } catch (_: Exception) {
                if (forceShow) {
                    Toast.makeText(activity, "Could not check for updates. Check your connection.", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    /** Fetches update XML and shows the installed version's changelog in read-only mode. */
    fun showCurrentChangelog() {
        scope.launch {
            try {
                val updateInfo = fetchUpdateInfo() ?: return@launch
                showUpdateDialog(updateInfo, AppUpdateDisplayMode.CURRENT_CHANGELOG)
            } catch (_: Exception) {
                Toast.makeText(activity, "Could not load changelog.", Toast.LENGTH_LONG).show()
            }
        }
    }

    private suspend fun fetchUpdateInfo(): AppUpdateInfo? =
        withContext(Dispatchers.IO) {
            URL(UPDATE_XML_URL).openStream().use { parseUpdateXml(it) }
        }

    private fun showUpdateDialog(updateInfo: AppUpdateInfo, mode: AppUpdateDisplayMode) {
        if (activity.isFinishing || activity.isDestroyed) return

        val dialog = Dialog(activity)
        dialog.setContentView(R.layout.dialog_app_update)
        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        val title = dialog.findViewById<TextView>(R.id.dialog_title)
        val subtitle = dialog.findViewById<TextView>(R.id.dialog_subtitle)
        val dismissBtn = dialog.findViewById<Button>(R.id.btn_dismiss)
        val updateBtn = dialog.findViewById<Button>(R.id.btn_update)
        val resolvedApkUrl = resolveApkUrlForDevice(updateInfo)
        val canDirectInstall = mode == AppUpdateDisplayMode.UPDATE_AVAILABLE && resolvedApkUrl != null

        when (mode) {
            AppUpdateDisplayMode.UPDATE_AVAILABLE -> {
                title.text = "Update Available"
                subtitle.text = "Version ${updateInfo.latestVersion} is available (installed v${BuildConfig.VERSION_NAME})"
                dismissBtn.text = "Later"
                updateBtn.text = if (canDirectInstall) "Download & Install" else "View on GitHub"
            }
            AppUpdateDisplayMode.CURRENT_CHANGELOG -> {
                title.text = "Changelog"
                subtitle.text = "Installed version v${BuildConfig.VERSION_NAME}"
                dismissBtn.text = "Close"
                updateBtn.text = "View on GitHub"
            }
        }

        dialog.findViewById<TextView>(R.id.dialog_release_notes).text = formatReleaseNotes(updateInfo.releaseNotes)

        val scrollView = dialog.findViewById<ScrollView>(R.id.dialog_scroll)
        scrollView.post {
            val metrics = DisplayMetrics()
            @Suppress("DEPRECATION")
            activity.windowManager.defaultDisplay.getMetrics(metrics)
            val maxHeight = (metrics.heightPixels * MAX_SCROLL_HEIGHT_RATIO).toInt()
            if (scrollView.height > maxHeight) {
                scrollView.layoutParams = scrollView.layoutParams.apply { height = maxHeight }
            }
        }

        dismissBtn.setOnClickListener { dialog.dismiss() }

        updateBtn.setOnClickListener {
            if (canDirectInstall) {
                startDownloadAndInstall(updateInfo, dialog, updateBtn, dismissBtn)
            } else {
                activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(updateInfo.url)))
                dialog.dismiss()
            }
        }

        dialog.show()
        val metrics = DisplayMetrics()
        @Suppress("DEPRECATION")
        activity.windowManager.defaultDisplay.getMetrics(metrics)
        dialog.window?.setLayout((metrics.widthPixels * 0.85).toInt(), ViewGroup.LayoutParams.WRAP_CONTENT)
    }

    private fun startDownloadAndInstall(
        updateInfo: AppUpdateInfo,
        dialog: Dialog,
        updateBtn: Button,
        dismissBtn: Button,
    ) {
        val apkUrl = resolveApkUrlForDevice(updateInfo) ?: return
        if (!ensureInstallPermission()) return

        updateBtn.isEnabled = false
        dismissBtn.isEnabled = false
        updateBtn.text = "Downloading…"

        scope.launch {
            try {
                val apkFile =
                    withContext(Dispatchers.IO) {
                        downloadApk(apkUrl) { percent ->
                            scope.launch {
                                updateBtn.text = "Downloading… $percent%"
                            }
                        }
                    }
                dialog.dismiss()
                launchPackageInstaller(apkFile)
            } catch (e: Exception) {
                updateBtn.isEnabled = true
                dismissBtn.isEnabled = true
                updateBtn.text = "Download & Install"
                Toast.makeText(activity, "Update download failed: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun ensureInstallPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true
        if (activity.packageManager.canRequestPackageInstalls()) return true

        Toast.makeText(activity, "Allow installs from this app to update in place.", Toast.LENGTH_LONG).show()
        val intent =
            Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${activity.packageName}"))
        activity.startActivity(intent)
        return false
    }

    private fun downloadApk(apkUrl: String, onProgress: (Int) -> Unit): File {
        val updatesDir = File(activity.cacheDir, "updates")
        updatesDir.mkdirs()
        val apkFile = File(updatesDir, "update-${BuildConfig.VERSION_CODE}.apk")
        if (apkFile.exists()) apkFile.delete()

        val connection = (URL(apkUrl).openConnection() as HttpURLConnection).apply {
            connectTimeout = 30_000
            readTimeout = 120_000
            instanceFollowRedirects = true
        }

        connection.connect()
        val responseCode = connection.responseCode
        if (responseCode !in 200..299) {
            connection.disconnect()
            throw IllegalStateException("Server returned HTTP $responseCode for update APK")
        }

        connection.inputStream.use { input ->
            val totalBytes = connection.contentLengthLong.takeIf { it > 0 } ?: -1L
            FileOutputStream(apkFile).use { output ->
                val buffer = ByteArray(8192)
                var downloaded = 0L
                var read: Int
                while (input.read(buffer).also { read = it } != -1) {
                    output.write(buffer, 0, read)
                    downloaded += read
                    if (totalBytes > 0) {
                        val percent = ((downloaded * 100) / totalBytes).toInt().coerceIn(0, 100)
                        onProgress(percent)
                    }
                }
            }
        }
        connection.disconnect()
        onProgress(100)
        return apkFile
    }

    private fun launchPackageInstaller(apkFile: File) {
        val uri =
            FileProvider.getUriForFile(
                activity,
                "${activity.packageName}.fileprovider",
                apkFile,
            )
        val intent =
            Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        activity.startActivity(intent)
    }

    private class RoundedBackgroundSpan(
        private val backgroundColor: Int,
        private val textColor: Int,
        private val cornerRadius: Float = 8f,
        private val horizontalPadding: Float = 6f,
    ) : ReplacementSpan() {
        override fun getSize(paint: Paint, text: CharSequence, start: Int, end: Int, fm: Paint.FontMetricsInt?): Int {
            val originalTypeface = paint.typeface
            paint.typeface = Typeface.MONOSPACE
            val width = (paint.measureText(text, start, end) + horizontalPadding * 2).toInt()
            paint.typeface = originalTypeface
            return width
        }

        override fun draw(canvas: Canvas, text: CharSequence, start: Int, end: Int, x: Float, top: Int, y: Int, bottom: Int, paint: Paint) {
            val originalTypeface = paint.typeface
            paint.typeface = Typeface.MONOSPACE
            val textWidth = paint.measureText(text, start, end)
            val fm = paint.fontMetrics
            val pillTop = y + fm.ascent - 2f
            val pillBottom = y + fm.descent + 2f
            val rect = RectF(x, pillTop, x + textWidth + horizontalPadding * 2, pillBottom)
            val bgPaint = Paint(paint)
            bgPaint.color = backgroundColor
            canvas.drawRoundRect(rect, cornerRadius, cornerRadius, bgPaint)
            paint.color = textColor
            canvas.drawText(text, start, end, x + horizontalPadding, y.toFloat(), paint)
            paint.typeface = originalTypeface
        }
    }

    private fun formatReleaseNotes(text: String): SpannableStringBuilder {
        val bulletText = text.replace(Regex("(?m)^- "), "\u2022 ")
        val builder = SpannableStringBuilder()
        val codeBgColor = ContextCompat.getColor(activity, R.color.dialog_code_background)
        val codeTextColor = ContextCompat.getColor(activity, R.color.dialog_code_text)
        val density = activity.resources.displayMetrics.density
        val cornerRadius = 6f * density
        val horizontalPadding = 4f * density

        var i = 0
        while (i < bulletText.length) {
            val backtickStart = bulletText.indexOf('`', i)
            if (backtickStart == -1) {
                builder.append(bulletText, i, bulletText.length)
                break
            }
            val backtickEnd = bulletText.indexOf('`', backtickStart + 1)
            if (backtickEnd == -1) {
                builder.append(bulletText, i, bulletText.length)
                break
            }
            builder.append(bulletText, i, backtickStart)
            val codeContent = bulletText.substring(backtickStart + 1, backtickEnd)
            val spanStart = builder.length
            builder.append(codeContent)
            val spanEnd = builder.length
            builder.setSpan(
                RoundedBackgroundSpan(codeBgColor, codeTextColor, cornerRadius, horizontalPadding),
                spanStart,
                spanEnd,
                Spanned.SPAN_EXCLUSIVE_EXCLUSIVE,
            )
            i = backtickEnd + 1
        }
        return builder
    }
}
