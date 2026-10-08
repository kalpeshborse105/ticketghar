package com.kalpkrutinfotech.mahaticket.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.components.TheaterLoaderCard
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.BookingViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutScreen(
    holdToken: String,
    bookingViewModel: BookingViewModel,
    onNavigateBack: () -> Unit,
    onBookingSuccess: (String) -> Unit
) {
    val selectedSeats by bookingViewModel.selectedSeats.collectAsState()
    var customerName by remember { mutableStateOf("") }
    var customerEmail by remember { mutableStateOf("") }
    var customerPhone by remember { mutableStateOf("") }
    var couponInput by remember { mutableStateOf("") }
    var appliedCoupon by remember { mutableStateOf<String?>(null) }
    var discountAmount by remember { mutableIntStateOf(0) }
    var isProcessing by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val basePrice = selectedSeats.sumOf { it.price }
    val convenienceFee = if (basePrice > 0) (selectedSeats.size * 3500) else 0 // ₹35 per seat
    val gstAmount = if (convenienceFee > 0) (convenienceFee * 18) / 100 else 0 // 18% GST on convenience fee
    val grandTotal = (basePrice + convenienceFee + gstAmount - discountAmount).coerceAtLeast(0)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(CinemaBg)
            .testTag("checkout_screen")
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header Bar
            Surface(
                color = CinemaSurface,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onNavigateBack,
                        modifier = Modifier.testTag("checkout_back_btn")
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            "सुरक्षित चेकआउट (Secure Checkout)",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            "२५६-बिट एन्क्रिप्टेड पेमेंट गेटवे",
                            fontSize = 11.sp,
                            color = GoldAccent
                        )
                    }

                    Surface(
                        color = Color(0xFF065F46),
                        shape = RoundedCornerShape(6.dp),
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Text(
                            text = "🔒 SSL 100%",
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            // Main Checkout Content
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f),
                contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 110.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Error Banner
                if (errorMessage != null) {
                    item {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = TheatricalCrimson.copy(alpha = 0.2f),
                            border = BorderStroke(1.dp, TheatricalCrimson)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(Icons.Default.Error, contentDescription = null, tint = TheatricalCrimsonLight)
                                Text(
                                    text = errorMessage ?: "",
                                    fontSize = 12.sp,
                                    color = Color.White
                                )
                            }
                        }
                    }
                }

                // 1. Order Summary Card
                item {
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = CinemaSurface),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(text = "🎭 ", fontSize = 18.sp)
                                Text(
                                    text = "बुकिंग तपशील (Booking Summary)",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(text = "निवडलेली आसने:", fontSize = 13.sp, color = Color(0xFF94A3B8))
                                Text(
                                    text = selectedSeats.joinToString(", ") { it.seatCode }.ifBlank { "जागा निश्चित नाही" },
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = GoldAccent
                                )
                            }

                            Spacer(modifier = Modifier.height(6.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(text = "एकूण जागा संख्या:", fontSize = 13.sp, color = Color(0xFF94A3B8))
                                Text(
                                    text = "${selectedSeats.size} तिकीट",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    }
                }

                // 2. Contact Information Form
                item {
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = CinemaSurface),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(text = "👤 ", fontSize = 18.sp)
                                Text(
                                    text = "संपर्क माहिती (Contact Details)",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }

                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "ई-तिकीट आणि SMS या तपशिलांवर पाठवले जातील.",
                                fontSize = 11.sp,
                                color = Color(0xFF94A3B8)
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            // Name Field
                            OutlinedTextField(
                                value = customerName,
                                onValueChange = { customerName = it },
                                label = { Text("पूर्ण नाव (Full Name)", color = Color(0xFF94A3B8)) },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White,
                                    focusedBorderColor = GoldAccent,
                                    unfocusedBorderColor = Color(0xFF334155),
                                    focusedContainerColor = Color(0xFF1E293B),
                                    unfocusedContainerColor = Color(0xFF1E293B)
                                ),
                                singleLine = true
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            // Phone Field
                            OutlinedTextField(
                                value = customerPhone,
                                onValueChange = { if (it.length <= 10) customerPhone = it },
                                label = { Text("मोबाईल नंबर (10-digit Phone)", color = Color(0xFF94A3B8)) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                prefix = { Text("+91 ", color = GoldAccent, fontWeight = FontWeight.Bold) },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White,
                                    focusedBorderColor = GoldAccent,
                                    unfocusedBorderColor = Color(0xFF334155),
                                    focusedContainerColor = Color(0xFF1E293B),
                                    unfocusedContainerColor = Color(0xFF1E293B)
                                ),
                                singleLine = true
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            // Email Field
                            OutlinedTextField(
                                value = customerEmail,
                                onValueChange = { customerEmail = it },
                                label = { Text("ईमेल पत्ता (Email - Optional)", color = Color(0xFF94A3B8)) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White,
                                    focusedBorderColor = GoldAccent,
                                    unfocusedBorderColor = Color(0xFF334155),
                                    focusedContainerColor = Color(0xFF1E293B),
                                    unfocusedContainerColor = Color(0xFF1E293B)
                                ),
                                singleLine = true
                            )
                        }
                    }
                }

                // 3. Coupon Code Card
                item {
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = CinemaSurface),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(text = "🏷️ ", fontSize = 18.sp)
                                Text(
                                    text = "सूट कूपन कोड (Promo Code)",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                OutlinedTextField(
                                    value = couponInput,
                                    onValueChange = { couponInput = it.uppercase() },
                                    placeholder = { Text("उदा. NATAK50", color = Color(0xFF64748B)) },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(10.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        focusedBorderColor = GoldAccent,
                                        unfocusedBorderColor = Color(0xFF334155),
                                        focusedContainerColor = Color(0xFF1E293B),
                                        unfocusedContainerColor = Color(0xFF1E293B)
                                    ),
                                    singleLine = true
                                )

                                Button(
                                    onClick = {
                                        if (couponInput.trim() == "NATAK50" || couponInput.trim() == "MAHA10") {
                                            appliedCoupon = couponInput.trim()
                                            discountAmount = 5000 // ₹50
                                        } else {
                                            errorMessage = "अवैध कूपन कोड. कृपया योग्य कूपन वापरा."
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = GoldAccent),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.height(52.dp)
                                ) {
                                    Text("लागू करा", fontWeight = FontWeight.Bold, color = Color.Black)
                                }
                            }

                            if (appliedCoupon != null) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "✓ कूपन '$appliedCoupon' लागू केले! ₹50 सवलत मिळाली.",
                                    color = Color(0xFF10B981),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }

                // 4. Detailed Fare Breakdown
                item {
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = CinemaSurface),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(text = "🧾 ", fontSize = 18.sp)
                                Text(
                                    text = "रक्कम तपशील (Fare Breakdown)",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            FareRow(label = "मूळ तिकीट दर (Base Ticket Amount)", amount = "₹${basePrice / 100}")
                            FareRow(label = "सुविधा शुल्क (Convenience Fee ₹35/seat)", amount = "₹${convenienceFee / 100}")
                            FareRow(label = "वस्तू आणि सेवा कर (GST 18%)", amount = "₹${gstAmount / 100}")

                            if (discountAmount > 0) {
                                FareRow(
                                    label = "कूपन सूट (Discount Applied)",
                                    amount = "-₹${discountAmount / 100}",
                                    amountColor = Color(0xFF10B981)
                                )
                            }

                            HorizontalDivider(
                                color = Color(0xFF334155),
                                thickness = 1.dp,
                                modifier = Modifier.padding(vertical = 10.dp)
                            )

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "एकूण देय रक्कम (Grand Total):",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    text = "₹${grandTotal / 100}",
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Black,
                                    color = GoldBright
                                )
                            }
                        }
                    }
                }

                // 5. Payment Partners & Razorpay Badge
                item {
                    Surface(
                        color = Color(0xFF131A29),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(text = "💳 ", fontSize = 18.sp)
                                Column {
                                    Text(
                                        text = "Razorpay द्वारे सुरक्षित व्यवहार",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                    Text(
                                        text = "UPI, GPay, PhonePe, Cards, NetBanking",
                                        fontSize = 10.sp,
                                        color = Color(0xFF94A3B8)
                                    )
                                }
                            }

                            Surface(
                                color = Color(0xFF1E293B),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "PCI-DSS",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = GoldAccent,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Sticky Bottom Pay Bar
        Surface(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth(),
            color = Color(0xFF131A29),
            tonalElevation = 10.dp,
            shadowElevation = 16.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "एकूण देय",
                        fontSize = 11.sp,
                        color = Color(0xFF94A3B8)
                    )
                    Text(
                        text = "₹${grandTotal / 100}",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Black,
                        color = GoldBright
                    )
                }

                Button(
                    onClick = {
                        if (selectedSeats.isEmpty()) {
                            errorMessage = "कोणतेही आसन निवडलेले नाही. कृपया मागे जाऊन आसन निवडा."
                            return@Button
                        }

                        val cleanPhone = customerPhone.filter { it.isDigit() }.takeLast(10)
                        if (customerName.isBlank() || cleanPhone.length != 10) {
                            errorMessage = "कृपया आपले पूर्ण नाव आणि १०-अंकी मोबाईल नंबर प्रविष्ट करा."
                            return@Button
                        }

                        isProcessing = true
                        errorMessage = null

                        val mockPaymentId = "pay_rzp_${System.currentTimeMillis()}"
                        val mockSignature = "sig_rzp_${System.currentTimeMillis()}"
                        val attendeeNames = selectedSeats.associate { it.seatId.toString() to customerName }

                        bookingViewModel.confirmBooking(
                            holdToken = holdToken,
                            phoneNumber = cleanPhone,
                            email = customerEmail.ifBlank { null },
                            attendeeNames = attendeeNames,
                            razorpayPaymentId = mockPaymentId,
                            razorpaySignature = mockSignature,
                            onSuccess = { orderNumber ->
                                isProcessing = false
                                onBookingSuccess(orderNumber)
                            },
                            onError = { error ->
                                isProcessing = false
                                errorMessage = error
                            }
                        )
                    },
                    enabled = !isProcessing,
                    colors = ButtonDefaults.buttonColors(containerColor = TheatricalCrimson),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .height(48.dp)
                        .testTag("pay_securely_btn")
                ) {
                    if (isProcessing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Default.Lock, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Text(
                                text = "सुरक्षित पे करा (Razorpay) 🔒",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FareRow(
    label: String,
    amount: String,
    amountColor: Color = Color.White
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, fontSize = 12.sp, color = Color(0xFF94A3B8))
        Text(text = amount, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = amountColor)
    }
}
