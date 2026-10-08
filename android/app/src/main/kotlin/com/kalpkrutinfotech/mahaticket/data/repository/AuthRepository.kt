package com.kalpkrutinfotech.mahaticket.data.repository

import com.kalpkrutinfotech.mahaticket.data.api.*
import com.kalpkrutinfotech.mahaticket.util.UserSessionManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AuthRepository(
    private val apiService: MahaTicketApiService,
    private val sessionManager: UserSessionManager
) {

    suspend fun sendOtp(email: String): Result<SendOtpResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.sendOtp(SendOtpRequest(email = email.trim().lowercase()))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.success) {
                    Result.success(body)
                } else {
                    Result.failure(Exception(body.error ?: body.message ?: "OTP पाठवण्यात त्रुटी आली"))
                }
            } else {
                val rawErr = try { response.errorBody()?.string() } catch (e: Exception) { null }
                val parsedMsg = if (!rawErr.isNullOrBlank()) {
                    try {
                        val json = org.json.JSONObject(rawErr)
                        json.optString("error", json.optString("message", rawErr))
                    } catch (e: Exception) { rawErr }
                } else "OTP पाठवणे अयशस्वी (HTTP ${response.code()})"
                Result.failure(Exception(parsedMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun verifyOtp(email: String, otp: String): Result<AuthFlowResponse> = withContext(Dispatchers.IO) {
        try {
            val cleanEmail = email.trim().lowercase()
            val response = apiService.verifyOtp(VerifyOtpRequest(email = cleanEmail, otp = otp.trim()))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.success && body.user != null) {
                    // Persist session locally
                    sessionManager.saveSession(
                        id = body.user.id,
                        uid = body.user.uid,
                        email = body.user.email ?: cleanEmail,
                        name = body.user.fullName,
                        phone = body.user.phoneNumber,
                        role = body.user.role ?: "customer"
                    )
                    Result.success(body)
                } else {
                    Result.failure(Exception(body.error ?: body.message ?: "अवैध OTP कोड"))
                }
            } else {
                val rawErr = try { response.errorBody()?.string() } catch (e: Exception) { null }
                val parsedMsg = if (!rawErr.isNullOrBlank()) {
                    try {
                        val json = org.json.JSONObject(rawErr)
                        json.optString("error", json.optString("message", rawErr))
                    } catch (e: Exception) { rawErr }
                } else "OTP पडताळणी अयशस्वी"
                Result.failure(Exception(parsedMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun loginWithPassword(email: String, password: String): Result<AuthFlowResponse> = withContext(Dispatchers.IO) {
        try {
            val cleanEmail = email.trim().lowercase()
            val response = apiService.loginWithPassword(LoginPasswordRequest(email = cleanEmail, password = password))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.success && body.user != null) {
                    // Persist session locally
                    sessionManager.saveSession(
                        id = body.user.id,
                        uid = body.user.uid,
                        email = body.user.email ?: cleanEmail,
                        name = body.user.fullName,
                        phone = body.user.phoneNumber,
                        role = body.user.role ?: "customer"
                    )
                    Result.success(body)
                } else {
                    Result.failure(Exception(body.error ?: body.message ?: "लॉगिन अयशस्वी"))
                }
            } else {
                val rawErr = try { response.errorBody()?.string() } catch (e: Exception) { null }
                val parsedMsg = if (!rawErr.isNullOrBlank()) {
                    try {
                        val json = org.json.JSONObject(rawErr)
                        json.optString("error", json.optString("message", rawErr))
                    } catch (e: Exception) { rawErr }
                } else "लॉगिन अयशस्वी"
                Result.failure(Exception(parsedMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun logout() {
        sessionManager.clearSession()
    }

    fun isUserLoggedIn(): Boolean = sessionManager.isLoggedIn.value
}
