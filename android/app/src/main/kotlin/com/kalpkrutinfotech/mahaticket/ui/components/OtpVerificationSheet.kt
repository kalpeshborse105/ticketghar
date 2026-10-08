package com.kalpkrutinfotech.mahaticket.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.kalpkrutinfotech.mahaticket.theme.*

@Composable
fun OtpVerificationSheet(
    email: String,
    phone: String,
    lastSentOtp: String,
    language: AppLanguage,
    onEmailChange: (String) -> Unit,
    onPhoneChange: (String) -> Unit,
    onVerifyOtp: (String) -> Unit,
    onDismiss: () -> Unit
) {
    var enteredOtp by remember { mutableStateOf(lastSentOtp.ifBlank { "123456" }) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = CinemaSurface,
            tonalElevation = 8.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp)
                .testTag("otp_verification_modal")
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                // Top Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = "🔐 ", fontSize = 20.sp)
                        Column {
                            Text(
                                text = if (language == AppLanguage.MARATHI) "अतिथी बुकिंग आणि OTP पडताळणी" else "Guest Booking & OTP Auth",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "Kalpkrut Permanent Setup",
                                fontSize = 10.sp,
                                color = GoldAccent
                            )
                        }
                    }
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = Color.LightGray
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text(
                    text = if (language == AppLanguage.MARATHI)
                        "आधी लॉगिन करण्याची गरज नाही! ईमेल दिल्यास त्वरित OTP येईल आणि तुमचे तिकीट खाते कायमस्वरूपी सुरक्षित होईल."
                    else
                        "No login needed beforehand! Enter your email to receive OTP, secure your ticket pass, and create your permanent account.",
                    fontSize = 12.sp,
                    color = Color(0xFFCBD5E1),
                    lineHeight = 17.sp
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Email Input Field
                OutlinedTextField(
                    value = email,
                    onValueChange = onEmailChange,
                    label = { Text(if (language == AppLanguage.MARATHI) "ईमेल पत्ता" else "Email Address") },
                    leadingIcon = {
                        Icon(imageVector = Icons.Default.Email, contentDescription = "Email", tint = GoldAccent)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("otp_email_input"),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = GoldAccent,
                        unfocusedBorderColor = Color(0xFF334155),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    )
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Phone Input Field
                OutlinedTextField(
                    value = phone,
                    onValueChange = onPhoneChange,
                    label = { Text(if (language == AppLanguage.MARATHI) "मोबाईल नंबर (SMS / WhatsApp)" else "Mobile Number") },
                    leadingIcon = {
                        Icon(imageVector = Icons.Default.Phone, contentDescription = "Phone", tint = GoldAccent)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("otp_phone_input"),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = GoldAccent,
                        unfocusedBorderColor = Color(0xFF334155),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    )
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Simulated OTP Banner Helper
                Surface(
                    color = TheatricalCrimson.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(10.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, TheatricalCrimsonLight.copy(alpha = 0.5f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = "📩 ", fontSize = 16.sp)
                        Column {
                            Text(
                                text = if (language == AppLanguage.MARATHI) "सिम्युलेट केलेला OTP (सुरक्षित कोड):" else "Test Simulation OTP Code:",
                                fontSize = 11.sp,
                                color = Color.White
                            )
                            Text(
                                text = if (lastSentOtp.isNotBlank()) lastSentOtp else "123456",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Black,
                                color = GoldBright
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // OTP 6-Digit Field
                OutlinedTextField(
                    value = enteredOtp,
                    onValueChange = { if (it.length <= 6) enteredOtp = it },
                    label = { Text(if (language == AppLanguage.MARATHI) "६-अंकी OTP टाका" else "Enter 6-Digit OTP") },
                    leadingIcon = {
                        Icon(imageVector = Icons.Default.Lock, contentDescription = "OTP", tint = GoldAccent)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("otp_digit_input"),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = GoldAccent,
                        unfocusedBorderColor = Color(0xFF334155),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    )
                )

                Spacer(modifier = Modifier.height(18.dp))

                // Verify Button
                Button(
                    onClick = { onVerifyOtp(enteredOtp) },
                    enabled = enteredOtp.isNotBlank() && email.isNotBlank(),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .testTag("verify_otp_submit_button"),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = GoldAccent)
                ) {
                    Text(
                        text = if (language == AppLanguage.MARATHI) "OTP पडताळा आणि पुढे जा 🎭" else "Verify OTP & Continue 🎭",
                        color = Color.Black,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
