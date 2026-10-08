package com.kalpkrutinfotech.mahaticket.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.kalpkrutinfotech.mahaticket.model.Event
import com.kalpkrutinfotech.mahaticket.model.Seat
import com.kalpkrutinfotech.mahaticket.model.Showtime
import com.kalpkrutinfotech.mahaticket.theme.*

@Composable
fun RazorpayPaymentSheet(
    event: Event,
    showtime: Showtime,
    selectedSeats: List<Seat>,
    language: AppLanguage,
    onConfirmPayment: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val count = selectedSeats.size
    val baseAmount = selectedSeats.sumOf { it.price }
    val convFee = count * 35
    val gst = (convFee * 18) / 100
    val total = baseAmount + convFee + gst

    var selectedMethod by remember { mutableStateOf("UPI (GPay / PhonePe)") }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = CinemaSurface,
            tonalElevation = 8.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp)
                .testTag("razorpay_checkout_modal")
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                // Header with Razorpay badge
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            color = Color(0xFF0C2340),
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF0284C7))
                        ) {
                            Text(
                                text = "Razorpay",
                                color = Color(0xFF38BDF8),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Black,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Surface(
                            color = TheatricalCrimson.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = "SECURED",
                                color = TheatricalCrimsonLight,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
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
                    text = if (language == AppLanguage.MARATHI) "पेमेंट सारांश" else "Order Summary",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                Text(
                    text = if (language == AppLanguage.MARATHI) event.titleMr else event.titleEn,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = GoldAccent
                )

                Text(
                    text = "${showtime.dateText} | ${showtime.venueName}",
                    fontSize = 11.sp,
                    color = Color(0xFF94A3B8)
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Breakdown Box
                Surface(
                    color = Color(0xFF1E293B),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "${if (language == AppLanguage.MARATHI) "तिकीट दर" else "Ticket Price"} (${selectedSeats.joinToString(",") { it.id }})",
                                fontSize = 12.sp,
                                color = Color(0xFFCBD5E1)
                            )
                            Text(text = "₹$baseAmount", fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.SemiBold)
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = if (language == AppLanguage.MARATHI) "सुविधा शुल्क" else "Convenience Fee",
                                fontSize = 12.sp,
                                color = Color(0xFFCBD5E1)
                            )
                            Text(text = "₹$convFee", fontSize = 12.sp, color = Color.White)
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = if (language == AppLanguage.MARATHI) "जीएसटी (१८%)" else "GST (18%)",
                                fontSize = 12.sp,
                                color = Color(0xFFCBD5E1)
                            )
                            Text(text = "₹$gst", fontSize = 12.sp, color = Color.White)
                        }

                        HorizontalDivider(
                            modifier = Modifier.padding(vertical = 8.dp),
                            color = Color(0xFF334155)
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = if (language == AppLanguage.MARATHI) "एकूण रक्कम" else "Total Amount",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = GoldBright
                            )
                            Text(
                                text = "₹$total",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Black,
                                color = GoldAccent
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Payment Methods
                Text(
                    text = if (language == AppLanguage.MARATHI) "पेमेंट पर्याय निवडा" else "Select Payment Mode",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                Spacer(modifier = Modifier.height(8.dp))

                val methods = listOf(
                    "UPI (GPay / PhonePe / Paytm)" to "⚡ Fastest",
                    "Credit / Debit Card" to "Visa, RuPay",
                    "NetBanking" to "All Major Banks"
                )

                methods.forEach { (method, subtitle) ->
                    val isSelected = selectedMethod == method
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .clickable { selectedMethod = method },
                        color = if (isSelected) TheatricalCrimson.copy(alpha = 0.25f) else Color(0xFF1E293B),
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isSelected) TheatricalCrimsonLight else Color(0xFF334155)
                        )
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                RadioButton(
                                    selected = isSelected,
                                    onClick = { selectedMethod = method },
                                    colors = RadioButtonDefaults.colors(selectedColor = GoldAccent)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Column {
                                    Text(
                                        text = method,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color.White
                                    )
                                    Text(
                                        text = subtitle,
                                        fontSize = 10.sp,
                                        color = Color(0xFF94A3B8)
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Instant Pay CTA
                Button(
                    onClick = { onConfirmPayment(selectedMethod) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .testTag("pay_now_instant_button"),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = GoldAccent)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = "Secure",
                            tint = Color.Black,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "${if (language == AppLanguage.MARATHI) "₹$total पेमेंट करा" else "Pay ₹$total Securely"} 🎭",
                            color = Color.Black,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "🔒 256-Bit SSL Secured • Razorpay Gateway Integration",
                        fontSize = 9.sp,
                        color = Color(0xFF64748B)
                    )
                }
            }
        }
    }
}
