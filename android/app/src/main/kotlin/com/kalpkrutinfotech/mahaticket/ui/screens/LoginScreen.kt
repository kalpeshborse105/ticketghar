package com.kalpkrutinfotech.mahaticket.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kalpkrutinfotech.mahaticket.BuildConfig
import com.kalpkrutinfotech.mahaticket.MahaTicketApp
import com.kalpkrutinfotech.mahaticket.theme.*
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit
) {
    val context = LocalContext.current
    val app = context.applicationContext as? MahaTicketApp
    val authRepository = app?.authRepository

    var email by remember { mutableStateOf("") }
    var showOtpField by remember { mutableStateOf(false) }
    var usePasswordMode by remember { mutableStateOf(false) }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var otp by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MahaBg)
            .testTag("login_screen")
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // App Logo Badge
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(
                        Brush.linearGradient(
                            listOf(Color(0xFFF97316), Color(0xFFEA580C), Color(0xFFC2410C))
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(text = "🎭", fontSize = 32.sp)
            }

            Spacer(modifier = Modifier.height(14.dp))

            Text(
                text = "महाटिकिट (MahaTicket)",
                fontSize = 24.sp,
                fontWeight = FontWeight.Black,
                color = TextPrimary
            )
            Text(
                text = "महाराष्ट्राचे हक्काचे नाट्य व सांस्कृतिक तिकीट व्यासपीठ",
                fontSize = 12.sp,
                color = TextSecondary,
                fontWeight = FontWeight.Medium
            )

            Spacer(modifier = Modifier.height(28.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, MahaBorder),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = if (showOtpField) "OTP पडताळणी" else if (usePasswordMode) "पासवर्ड द्वारे लॉगिन" else "ईमेल द्वारे लॉगिन",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = if (showOtpField)
                            "${email} वर पाठवलेला ६-अंकी कोड प्रविष्ट करा"
                        else if (usePasswordMode)
                            "आपला ईमेल व सुरक्षित पासवर्ड प्रविष्ट करा"
                        else
                            "सुरक्षित लॉगिनसाठी आपला नोंदणीकृत ईमेल प्रविष्ट करा",
                        fontSize = 11.5.sp,
                        color = TextSecondary,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(18.dp))

                    if (!showOtpField && !usePasswordMode) {
                        // Email Input
                        OutlinedTextField(
                            value = email,
                            onValueChange = {
                                email = it
                                errorMessage = null
                            },
                            label = { Text("ईमेल पत्ता (Email)") },
                            placeholder = { Text("उदा. name@example.com") },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.Email,
                                    contentDescription = null,
                                    tint = MahaOrange
                                )
                            },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MahaOrange,
                                unfocusedBorderColor = MahaBorder,
                                focusedContainerColor = MahaWarmLight,
                                unfocusedContainerColor = MahaWarmLight
                            )
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        // Send OTP Button
                        Button(
                            onClick = {
                                if (email.isBlank() || !email.contains("@")) {
                                    errorMessage = "कृपया वैध ईमेल पत्ता प्रविष्ट करा (उदा. user@example.com)."
                                } else {
                                    isLoading = true
                                    errorMessage = null
                                    scope.launch {
                                        if (authRepository != null) {
                                            val result = authRepository.sendOtp(email.trim())
                                            isLoading = false
                                            result.fold(
                                                onSuccess = { resp ->
                                                    showOtpField = true
                                                    if (resp.devOtp != null) {
                                                        otp = resp.devOtp
                                                    }
                                                },
                                                onFailure = { err ->
                                                    errorMessage = err.localizedMessage ?: "OTP पाठवण्यात त्रुटी आली."
                                                }
                                            )
                                        } else {
                                            isLoading = false
                                            showOtpField = true
                                        }
                                    }
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            enabled = !isLoading,
                            colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Text("ईमेलवर OTP मिळवा (Send OTP)", fontSize = 13.5.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        TextButton(
                            onClick = { usePasswordMode = true }
                        ) {
                            Icon(Icons.Default.Lock, contentDescription = null, modifier = Modifier.size(14.dp), tint = MahaOrange)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("पासवर्डने लॉगिन करा (Password Login)", color = MahaOrange, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }

                        // Divider & Google Login (Matching Web AuthModal.tsx)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            HorizontalDivider(modifier = Modifier.weight(1f), color = MahaBorder)
                            Text(text = " किंवा ", fontSize = 11.5.sp, color = TextSecondary, modifier = Modifier.padding(horizontal = 8.dp))
                            HorizontalDivider(modifier = Modifier.weight(1f), color = MahaBorder)
                        }

                        OutlinedButton(
                            onClick = {
                                try {
                                    val googleUri = Uri.parse("${BuildConfig.API_BASE_URL}/api/auth/google?direct=true")
                                    val browserIntent = Intent(Intent.ACTION_VIEW, googleUri)
                                    context.startActivity(browserIntent)
                                } catch (e: Exception) {
                                    errorMessage = "Google लॉगिन सुरू करता आले नाही: ${e.localizedMessage}"
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(46.dp),
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, Color(0xFFCBD5E1)),
                            colors = ButtonDefaults.outlinedButtonColors(containerColor = Color.White)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Text(text = "🌐", fontSize = 15.sp)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Google ने साइन इन करा (Google Sign In)",
                                    fontSize = 12.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                            }
                        }
                    } else if (usePasswordMode) {
                        // Password Mode
                        OutlinedTextField(
                            value = email,
                            onValueChange = {
                                email = it
                                errorMessage = null
                            },
                            label = { Text("ईमेल पत्ता") },
                            placeholder = { Text("name@example.com") },
                            leadingIcon = {
                                Icon(Icons.Default.Email, contentDescription = null, tint = MahaOrange)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MahaOrange,
                                unfocusedBorderColor = MahaBorder,
                                focusedContainerColor = MahaWarmLight,
                                unfocusedContainerColor = MahaWarmLight
                            )
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = password,
                            onValueChange = {
                                password = it
                                errorMessage = null
                            },
                            label = { Text("पासवर्ड (Password)") },
                            placeholder = { Text("••••••••") },
                            leadingIcon = {
                                Icon(Icons.Default.Lock, contentDescription = null, tint = MahaOrange)
                            },
                            trailingIcon = {
                                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                    Icon(
                                        imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                        contentDescription = null,
                                        tint = TextSecondary
                                    )
                                }
                            },
                            visualTransformation = if (passwordVisible) androidx.compose.ui.text.input.VisualTransformation.None else androidx.compose.ui.text.input.PasswordVisualTransformation(),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MahaOrange,
                                unfocusedBorderColor = MahaBorder,
                                focusedContainerColor = MahaWarmLight,
                                unfocusedContainerColor = MahaWarmLight
                            )
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        Button(
                            onClick = {
                                if (email.isBlank() || password.isBlank()) {
                                    errorMessage = "कृपया ईमेल आणि पासवर्ड दोन्ही प्रविष्ट करा."
                                } else {
                                    isLoading = true
                                    errorMessage = null
                                    scope.launch {
                                        if (authRepository != null) {
                                            val result = authRepository.loginWithPassword(email.trim(), password)
                                            isLoading = false
                                            result.fold(
                                                onSuccess = { onLoginSuccess() },
                                                onFailure = { err -> errorMessage = err.localizedMessage ?: "चुकीचा ईमेल किंवा पासवर्ड." }
                                            )
                                        } else {
                                            isLoading = false
                                            onLoginSuccess()
                                        }
                                    }
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            enabled = !isLoading,
                            colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Text("लॉगिन करा (Sign In)", fontSize = 13.5.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        TextButton(
                            onClick = { usePasswordMode = false }
                        ) {
                            Text("ईमेल OTP द्वारे लॉगिन करा", color = MahaOrange, fontSize = 12.sp)
                        }
                    } else {
                        // OTP Verification Mode
                        OutlinedTextField(
                            value = otp,
                            onValueChange = {
                                if (it.length <= 6) {
                                    otp = it
                                    errorMessage = null
                                }
                            },
                            label = { Text("६-अंकी OTP (Verification Code)") },
                            placeholder = { Text("123456") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MahaOrange,
                                unfocusedBorderColor = MahaBorder,
                                focusedContainerColor = MahaWarmLight,
                                unfocusedContainerColor = MahaWarmLight
                            )
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        Button(
                            onClick = {
                                if (otp.length != 6) {
                                    errorMessage = "कृपया ६-अंकी OTP कोड प्रविष्ट करा."
                                } else {
                                    isLoading = true
                                    errorMessage = null
                                    scope.launch {
                                        if (authRepository != null) {
                                            val result = authRepository.verifyOtp(email.trim(), otp)
                                            isLoading = false
                                            result.fold(
                                                onSuccess = { onLoginSuccess() },
                                                onFailure = { err -> errorMessage = err.localizedMessage ?: "अवैध OTP कोड. कृपया पुन्हा प्रयत्न करा." }
                                            )
                                        } else {
                                            isLoading = false
                                            onLoginSuccess()
                                        }
                                    }
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            enabled = !isLoading,
                            colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Text("सत्यापित करा व पुढे जा", fontSize = 13.5.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        TextButton(
                            onClick = {
                                showOtpField = false
                                otp = ""
                            }
                        ) {
                            Text("ईमेल पत्ता बदला", color = MahaOrange, fontSize = 12.sp)
                        }
                    }

                    if (errorMessage != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = errorMessage ?: "",
                            color = Color(0xFFDC2626),
                            fontSize = 11.5.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            Surface(
                color = MahaWarm,
                shape = RoundedCornerShape(10.dp),
                border = BorderStroke(1.dp, Color(0xFFFED7AA))
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Default.Shield,
                        contentDescription = null,
                        tint = MahaOrange,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "नोंदणी न करताही थेट अतिथी (Guest) म्हणून बुकिंग करता येते.",
                        fontSize = 11.sp,
                        color = MahaOrangeDeep,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}
