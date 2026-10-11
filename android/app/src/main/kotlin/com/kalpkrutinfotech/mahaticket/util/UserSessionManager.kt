package com.kalpkrutinfotech.mahaticket.util

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class UserSessionManager private constructor(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private val _isLoggedIn = MutableStateFlow(prefs.getBoolean(KEY_IS_LOGGED_IN, false))
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    private val _userName = MutableStateFlow(prefs.getString(KEY_USER_NAME, null))
    val userName: StateFlow<String?> = _userName.asStateFlow()

    private val _userEmail = MutableStateFlow(prefs.getString(KEY_USER_EMAIL, null))
    val userEmail: StateFlow<String?> = _userEmail.asStateFlow()

    private val _userPhone = MutableStateFlow(prefs.getString(KEY_USER_PHONE, null))
    val userPhone: StateFlow<String?> = _userPhone.asStateFlow()

    private val _userRole = MutableStateFlow(prefs.getString(KEY_USER_ROLE, "customer") ?: "customer")
    val userRole: StateFlow<String> = _userRole.asStateFlow()

    private val _userAvatar = MutableStateFlow(prefs.getString(KEY_USER_AVATAR, null))
    val userAvatar: StateFlow<String?> = _userAvatar.asStateFlow()

    fun saveSession(
        id: Int? = null,
        uid: String? = null,
        email: String,
        name: String? = null,
        phone: String? = null,
        role: String? = "customer",
        token: String? = null,
        avatarUrl: String? = null
    ) {
        val editor = prefs.edit()
        editor.putBoolean(KEY_IS_LOGGED_IN, true)
        editor.putString(KEY_USER_EMAIL, email)
        if (name != null) editor.putString(KEY_USER_NAME, name)
        if (phone != null) editor.putString(KEY_USER_PHONE, phone)
        if (id != null) editor.putInt(KEY_USER_ID, id)
        if (uid != null) editor.putString(KEY_USER_UID, uid)
        if (role != null) editor.putString(KEY_USER_ROLE, role)
        if (token != null) editor.putString(KEY_AUTH_TOKEN, token)
        if (avatarUrl != null) editor.putString(KEY_USER_AVATAR, avatarUrl)
        editor.apply()

        _isLoggedIn.value = true
        _userEmail.value = email
        if (name != null) _userName.value = name
        if (phone != null) _userPhone.value = phone
        if (role != null) _userRole.value = role
        if (avatarUrl != null) _userAvatar.value = avatarUrl
    }

    fun saveAvatarUrl(url: String) {
        prefs.edit().putString(KEY_USER_AVATAR, url).apply()
        _userAvatar.value = url
    }

    fun saveProfile(name: String?, phone: String?, avatarUrl: String? = null) {
        val editor = prefs.edit()
        if (name != null) {
            editor.putString(KEY_USER_NAME, name)
            _userName.value = name
        }
        if (phone != null) {
            editor.putString(KEY_USER_PHONE, phone)
            _userPhone.value = phone
        }
        if (avatarUrl != null) {
            editor.putString(KEY_USER_AVATAR, avatarUrl)
            _userAvatar.value = avatarUrl
        }
        editor.apply()
    }

    fun saveToken(token: String) {
        prefs.edit().putString(KEY_AUTH_TOKEN, token).apply()
    }

    fun clearSession() {
        prefs.edit().clear().apply()
        _isLoggedIn.value = false
        _userName.value = null
        _userEmail.value = null
        _userPhone.value = null
        _userAvatar.value = null
        _userRole.value = "customer"
        try {
            com.kalpkrutinfotech.mahaticket.data.api.RetrofitClient.clearCookies()
        } catch (e: Exception) {
            // Ignore if not initialized
        }
    }

    fun getEmail(): String? = prefs.getString(KEY_USER_EMAIL, null)
    fun getName(): String? = prefs.getString(KEY_USER_NAME, null)
    fun getPhone(): String? = prefs.getString(KEY_USER_PHONE, null)
    fun getAvatarUrl(): String? = prefs.getString(KEY_USER_AVATAR, null)
    fun getUserId(): Int = prefs.getInt(KEY_USER_ID, -1)
    fun getUid(): String? = prefs.getString(KEY_USER_UID, null)
    fun getRole(): String = prefs.getString(KEY_USER_ROLE, "customer") ?: "customer"
    fun getToken(): String? = prefs.getString(KEY_AUTH_TOKEN, null)
    fun isLoggedIn(): Boolean = prefs.getBoolean(KEY_IS_LOGGED_IN, false)

    fun isOrganizer(): Boolean {
        val r = getRole()
        return r.equals("organizer", ignoreCase = true) || isAdmin()
    }

    fun isAdmin(): Boolean {
        val r = getRole()
        return r.equals("admin", ignoreCase = true) || r.equals("super_admin", ignoreCase = true)
    }

    fun getLanguage(): String = prefs.getString(KEY_LANGUAGE, "mr") ?: "mr"

    fun saveLanguage(lang: String) {
        prefs.edit().putString(KEY_LANGUAGE, lang).apply()
    }

    companion object {
        private const val PREFS_NAME = "mahaticket_user_prefs"
        private const val KEY_IS_LOGGED_IN = "is_logged_in"
        private const val KEY_LANGUAGE = "app_language"
        private const val KEY_USER_EMAIL = "user_email"
        private const val KEY_USER_NAME = "user_name"
        private const val KEY_USER_PHONE = "user_phone"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_UID = "user_uid"
        private const val KEY_USER_ROLE = "user_role"
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_USER_AVATAR = "user_avatar"

        @Volatile
        private var instance: UserSessionManager? = null

        fun getInstance(context: Context): UserSessionManager {
            return instance ?: synchronized(this) {
                instance ?: UserSessionManager(context.applicationContext).also { instance = it }
            }
        }
    }
}
