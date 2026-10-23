package com.kalpkrutinfotech.mahaticket

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DownloadModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
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
        try {
            val safeFilename = filename.replace(Regex("[^a-zA-Z0-9._-]"), "_")
            val request = DownloadManager.Request(Uri.parse(url))
            request.setTitle(title)
            request.setDescription(description)
            request.setMimeType("application/pdf")
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, safeFilename)
            request.setAllowedOverMetered(true)
            request.setAllowedOverRoaming(true)

            if (!authHeader.isNullOrBlank()) {
                request.addRequestHeader("Authorization", authHeader)
            }

            val manager = reactApplicationContext.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            val downloadId = manager.enqueue(request)
            promise.resolve(downloadId.toString())
        } catch (e: Exception) {
            promise.reject("DOWNLOAD_ERROR", e.message, e)
        }
    }
}
