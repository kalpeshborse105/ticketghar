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

    fun saveSession(
        id: Int? = null,
        uid: String? = null,
        email: String,
        name: String? = null,
        phone: String? = null,
        role: String? = "customer"
    ) {
        val editor = prefs.edit()
        editor.putBoolean(KEY_IS_LOGGED_IN, true)
        editor.putString(KEY_USER_EMAIL, email)
        if (name != null) editor.putString(KEY_USER_NAME, name)
        if (phone != null) editor.putString(KEY_USER_PHONE, phone)
        if (id != null) editor.putInt(KEY_USER_ID, id)
        if (uid != null) editor.putString(KEY_USER_UID, uid)
        if (role != null) editor.putString(KEY_USER_ROLE, role)
        editor.apply()

        _isLoggedIn.value = true
        _userEmail.value = email
        if (name != null) _userName.value = name
        if (phone != null) _userPhone.value = phone
    }

    fun clearSession() {
        prefs.edit().clear().apply()
        _isLoggedIn.value = false
        _userName.value = null
        _userEmail.value = null
        _userPhone.value = null
    }

    fun getEmail(): String? = prefs.getString(KEY_USER_EMAIL, null)
    fun getName(): String? = prefs.getString(KEY_USER_NAME, null)
    fun getPhone(): String? = prefs.getString(KEY_USER_PHONE, null)
    fun getUserId(): Int = prefs.getInt(KEY_USER_ID, -1)

    companion object {
        private const val PREFS_NAME = "mahaticket_user_prefs"
        private const val KEY_IS_LOGGED_IN = "is_logged_in"
        private const val KEY_USER_EMAIL = "user_email"
        private const val KEY_USER_NAME = "user_name"
        private const val KEY_USER_PHONE = "user_phone"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_UID = "user_uid"
        private const val KEY_USER_ROLE = "user_role"

        @Volatile
        private var instance: UserSessionManager? = null

        fun getInstance(context: Context): UserSessionManager {
            return instance ?: synchronized(this) {
                instance ?: UserSessionManager(context.applicationContext).also { instance = it }
            }
        }
    }
}
