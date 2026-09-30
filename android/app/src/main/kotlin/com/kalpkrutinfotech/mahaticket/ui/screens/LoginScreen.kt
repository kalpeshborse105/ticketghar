package com.kalpkrutinfotech.mahaticket.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kalpkrutinfotech.mahaticket.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit
) {
    var emailOrPhone by remember { mutableStateOf("") }
    var showOtpField by remember { mutableStateOf(false) }
    var otp by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // App Logo/Title
            Text(
                text = "MahaTicket",
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            Text(
                text = "महाटिकिट",
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(48.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(4.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = if (showOtpField) "OTP प्रविष्ट करा" else "लॉगिन / साइन अप",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = if (showOtpField) 
                            "तुमच्या ${emailOrPhone} वर पाठवलेला OTP प्रविष्ट करा" 
                        else 
                            "सुरू ठेवण्यासाठी तुमचा ईमेल किंवा मोबाईल नंबर प्रविष्ट करा",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    if (!showOtpField) {
                        // Email/Phone Input
                        OutlinedTextField(
                            value = emailOrPhone,
                            onValueChange = { 
                                emailOrPhone = it
                                errorMessage = null
                            },
                            label = { Text("ईमेल किंवा मोबाईल नंबर") },
                            leadingIcon = {
                                Icon(Icons.Default.Email, contentDescription = null)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                unfocusedBorderColor = MahaBorder
                            )
                        )

                        Spacer(modifier = Modifier.height(20.dp))

                        Button(
                            onClick = {
                                if (emailOrPhone.isBlank()) {
                                    errorMessage = "कृपया ईमेल किंवा मोबाईल नंबर प्रविष्ट करा"
                                } else {
                                    isLoading = true
                                    // Simulate OTP send
                                    scope.launch {
                                        delay(1000)
                                        isLoading = false
                                        showOtpField = true
                                    }
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            enabled = !isLoading,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.primary
                            ),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(24.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Text("OTP पाठवा", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    } else {
                        // OTP Input
                        OutlinedTextField(
                            value = otp,
                            onValueChange = { 
                                if (it.length <= 6) {
                                    otp = it
                                    errorMessage = null
                                }
                            },
                            label = { Text("6-अंकी OTP") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                unfocusedBorderColor = MahaBorder
                            )
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        // Resend OTP
                        TextButton(
                            onClick = {
                                // Resend OTP logic
                            }
                        ) {
                            Text("OTP पुन्हा पाठवा", color = MaterialTheme.colorScheme.primary)
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Button(
                            onClick = {
                                if (otp.length != 6) {
                                    errorMessage = "कृपया 6-अंकी OTP प्रविष्ट करा"
                                } else {
                                    isLoading = true
                                    // For now, save session locally and proceed
                                    // In production, verify OTP with backend
                                    scope.launch {
                                        delay(1000)
                                        // Save user session locally (SharedPreferences)
                                        // For now, just call onLoginSuccess
                                        onLoginSuccess()
                                    }
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            enabled = !isLoading,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.primary
                            ),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(24.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Text("सत्यापित करा", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Change number
                        TextButton(
                            onClick = {
                                showOtpField = false
                                otp = ""
                            }
                        ) {
                            Text("नंबर बदला", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }

                    // Error Message
                    if (errorMessage != null) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = errorMessage ?: "",
                            color = MahaError,
                            fontSize = 13.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Google Sign In (Disabled for now)
            OutlinedButton(
                onClick = { /* Google Sign In */ },
                enabled = false,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = MahaTextSecondary
                )
            ) {
                Text("Google सह साइन इन करा (लवकरच)", fontSize = 15.sp)
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Guest Mode Note
            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant,
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    text = "नोंद: बुकिंग करण्यासाठी ईमेल/मोबाईल आवश्यक आहे",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(8.dp)
                )
            }
        }
    }
}
