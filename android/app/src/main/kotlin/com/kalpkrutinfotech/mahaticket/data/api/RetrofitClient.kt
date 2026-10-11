package com.kalpkrutinfotech.mahaticket.data.api

import com.kalpkrutinfotech.mahaticket.BuildConfig
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

object RetrofitClient {

    private val cookieStore = ConcurrentHashMap<String, MutableList<Cookie>>()
    private var sessionManager: com.kalpkrutinfotech.mahaticket.util.UserSessionManager? = null

    fun init(manager: com.kalpkrutinfotech.mahaticket.util.UserSessionManager) {
        sessionManager = manager
    }

    fun clearCookies() {
        cookieStore.clear()
    }

    private val sessionCookieJar = object : CookieJar {
        override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
            val host = url.host
            val existing = cookieStore.getOrPut(host) { mutableListOf() }
            for (newCookie in cookies) {
                existing.removeAll { it.name == newCookie.name }
                existing.add(newCookie)
                if (newCookie.name == "mahaticket_customer_session") {
                    sessionManager?.saveToken(newCookie.value)
                }
            }
        }

        override fun loadForRequest(url: HttpUrl): List<Cookie> {
            val host = url.host
            val existing = cookieStore.getOrPut(host) { mutableListOf() }
            val storedToken = sessionManager?.getToken()
            if (!storedToken.isNullOrBlank() && existing.none { it.name == "mahaticket_customer_session" }) {
                try {
                    val restoredCookie = Cookie.Builder()
                        .name("mahaticket_customer_session")
                        .value(storedToken)
                        .domain(host)
                        .path("/")
                        .build()
                    existing.add(restoredCookie)
                } catch (e: Exception) {
                    // Ignore parse error
                }
            }
            return existing
        }
    }

    private val authHeaderInterceptor = okhttp3.Interceptor { chain ->
        val original = chain.request()
        val token = sessionManager?.getToken()
        val request = if (!token.isNullOrBlank() && original.header("Authorization") == null) {
            original.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            original
        }
        chain.proceed(request)
    }

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG) {
            HttpLoggingInterceptor.Level.HEADERS
        } else {
            HttpLoggingInterceptor.Level.NONE
        }
        redactHeader("Authorization")
        redactHeader("Cookie")
        redactHeader("Set-Cookie")
        redactHeader("x-razorpay-signature")
    }

    private val okHttpClient = OkHttpClient.Builder()
        .cookieJar(sessionCookieJar)
        .addInterceptor(authHeaderInterceptor)
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val normalizedBaseUrl: String by lazy {
        val raw = BuildConfig.API_BASE_URL.trim()
        if (raw.endsWith("/")) raw else "$raw/"
    }

    private val retrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(normalizedBaseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    val apiService: MahaTicketApiService by lazy {
        retrofit.create(MahaTicketApiService::class.java)
    }
}
