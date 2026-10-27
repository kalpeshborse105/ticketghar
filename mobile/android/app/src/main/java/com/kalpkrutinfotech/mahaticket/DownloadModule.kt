package com.kalpkrutinfotech.mahaticket

import android.content.ContentValues
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.BufferedInputStream
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * Reliable PDF downloader — DownloadManager often leaves 0-byte "Waiting for retry"
 * files when the server needs Authorization / short-lived tokens or returns JSON errors.
 * We fetch the bytes ourselves, verify PDF magic, then publish to Downloads.
 */
class DownloadModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val io = Executors.newSingleThreadExecutor()

    override fun getName(): String = "TicketDownloader"

    @ReactMethod
    fun downloadFile(
        url: String,
        filename: String,
        title: String,
        description: String,
        promise: Promise
    ) {
        downloadFileWithAuth(url, filename, title, description, null, promise)
    }

    @ReactMethod
    fun downloadFileWithAuth(
        url: String,
        filename: String,
        title: String,
        description: String,
        authHeader: String?,
        promise: Promise
    ) {
        io.execute {
            try {
                val safeFilename = filename
                    .replace(Regex("[^a-zA-Z0-9._-]"), "_")
                    .let { if (it.lowercase().endsWith(".pdf")) it else "$it.pdf" }

                val bytes = fetchPdfBytes(url, authHeader)
                if (bytes.size < 5 || String(bytes, 0, 4) != "%PDF") {
                    promise.reject(
                        "DOWNLOAD_NOT_PDF",
                        "Server did not return a PDF (${bytes.size} bytes). Check login or try again."
                    )
                    return@execute
                }

                val savedPath = savePdfToDownloads(safeFilename, bytes)
                // Also notify system Download UI with a completed local entry when possible
                tryEnqueueCompletedHint(title, description, savedPath)

                promise.resolve(savedPath)
            } catch (e: Exception) {
                // Never enqueue DownloadManager fallback — it creates 0-byte "Waiting to retry" stubs
                // when auth/token fails. Surface the real error to JS instead.
                promise.reject("DOWNLOAD_ERROR", e.message ?: "PDF download failed", e)
            }
        }
    }

    private fun fetchPdfBytes(urlStr: String, authHeader: String?, redirectsLeft: Int = 5): ByteArray {
        var current = urlStr
        var left = redirectsLeft
        while (true) {
            val conn = (URL(current).openConnection() as HttpURLConnection).apply {
                instanceFollowRedirects = false
                connectTimeout = 25000
                readTimeout = 45000
                requestMethod = "GET"
                setRequestProperty("Accept", "application/pdf,*/*")
                setRequestProperty("User-Agent", "MahaTicketAndroid/1.0")
                if (!authHeader.isNullOrBlank()) {
                    setRequestProperty("Authorization", authHeader)
                }
            }
            val code = conn.responseCode
            if (code in 300..399 && left > 0) {
                val loc = conn.getHeaderField("Location")
                conn.disconnect()
                if (loc.isNullOrBlank()) throw IllegalStateException("Redirect without Location ($code)")
                current = if (loc.startsWith("http")) loc else URL(URL(current), loc).toString()
                left -= 1
                continue
            }
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val body = BufferedInputStream(stream).use { it.readBytes() }
            conn.disconnect()
            if (code !in 200..299) {
                val preview = body.toString(Charsets.UTF_8).take(180)
                throw IllegalStateException("HTTP $code: $preview")
            }
            return body
        }
    }

    private fun savePdfToDownloads(filename: String, bytes: ByteArray): String {
        val resolver = reactApplicationContext.contentResolver
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, filename)
                put(MediaStore.Downloads.MIME_TYPE, "application/pdf")
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
            val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: throw IllegalStateException("MediaStore insert failed")
            resolver.openOutputStream(uri)?.use { it.write(bytes) }
                ?: throw IllegalStateException("Cannot open output stream")
            values.clear()
            values.put(MediaStore.Downloads.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
            return uri.toString()
        }

        val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        if (!dir.exists()) dir.mkdirs()
        val file = File(dir, filename)
        FileOutputStream(file).use { it.write(bytes) }
        return file.absolutePath
    }

    private fun tryEnqueueCompletedHint(title: String, description: String, path: String) {
        // No-op placeholder — file is already in Downloads via MediaStore.
        // Kept for future notification polish without creating a second 0-byte DownloadManager job.
        if (title.isEmpty() && description.isEmpty() && path.isEmpty()) return
    }
}
