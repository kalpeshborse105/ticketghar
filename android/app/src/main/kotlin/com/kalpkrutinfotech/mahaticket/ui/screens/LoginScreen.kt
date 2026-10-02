package com.kalpkrutinfotech.mahaticket.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
                Icon(
                    Icons.Default.ConfirmationNumber,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(36.dp)
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            Text(
                text = "MahaTicket",
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(
                text = "महाटिकिट • महाराष्ट्राचे हक्काचे तिकीट व्यासपीठ",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Medium
            )

            Spacer(modifier = Modifier.height(32.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, Color(0xFFE5E7EB)),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = if (showOtpField) "OTP प्रविष्ट करा" else "लॉगिन / नोंदणी करा",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = if (showOtpField) 
                            "${emailOrPhone} वर पाठवलेला ६-अंकी OTP प्रविष्ट करा" 
                        else 
                            "आपली तिकिटे सुरक्षित ठेवण्यासाठी मोबाईल नंबर किंवा ईमेल प्रविष्ट करा",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    if (!showOtpField) {
                        OutlinedTextField(
                            value = emailOrPhone,
                            onValueChange = { 
                                emailOrPhone = it
                                errorMessage = null
                            },
                            label = { Text("मोबाईल नंबर किंवा ईमेल") },
                            placeholder = { Text("उदा. 9876543210") },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.PhoneAndroid,
                                    contentDescription = null,
                                    tint = Color(0xFFEA580C)
                                )
                            },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFFEA580C),
                                unfocusedBorderColor = Color(0xFFE5E7EB)
                            )
                        )

                        Spacer(modifier = Modifier.height(18.dp))

                        Button(
                            onClick = {
                                if (emailOrPhone.isBlank() || emailOrPhone.length < 10) {
                                    errorMessage = "कृपया वैध १०-अंकी मोबाईल नंबर किंवा ईमेल टाका."
                                } else {
                                    isLoading = true
                                    scope.launch {
                                        delay(800)
                                        isLoading = false
                                        showOtpField = true
                                    }
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            enabled = !isLoading,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Text("OTP मिळवा (Send OTP)", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    } else {
                        OutlinedTextField(
                            value = otp,
                            onValueChange = { 
                                if (it.length <= 6) {
                                    otp = it
                                    errorMessage = null
                                }
                            },
                            label = { Text("६-अंकी OTP") },
                            placeholder = { Text("123456") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFFEA580C),
                                unfocusedBorderColor = Color(0xFFE5E7EB)
                            )
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        Button(
                            onClick = {
                                if (otp.length != 6) {
                                    errorMessage = "कृपया ६-अंकी OTP प्रविष्ट करा."
                                } else {
                                    isLoading = true
                                    scope.launch {
                                        delay(800)
                                        isLoading = false
                                        onLoginSuccess()
                                    }
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            enabled = !isLoading,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Text("सत्यापित करा (Verify & Login)", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        TextButton(
                            onClick = {
                                showOtpField = false
                                otp = ""
                            }
                        ) {
                            Text("नंबर बदला (Change Number)", color = Color(0xFFEA580C), fontSize = 12.sp)
                        }
                    }

                    if (errorMessage != null) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = errorMessage ?: "",
                            color = Color(0xFFDC2626),
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            Surface(
                color = Color(0xFFFFF7ED),
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
                        tint = Color(0xFFEA580C),
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "नोंदणी न करताही अतिथी (Guest) म्हणून तिकीट बुक करता येते.",
                        fontSize = 11.sp,
                        color = Color(0xFF9A3412),
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}
