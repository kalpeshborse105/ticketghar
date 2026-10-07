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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.kalpkrutinfotech.mahaticket.MahaTicketApp
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.BookingViewModel
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.BookingViewModelFactory

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
    val convenienceFee = if (basePrice > 0) (selectedSeats.size * 2500) else 0 // ₹25 per seat
    val grandTotal = (basePrice + convenienceFee - discountAmount).coerceAtLeast(0)

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "सुरक्षित चेकआउट",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            Surface(
                color = MaterialTheme.colorScheme.surface,
                shadowElevation = 8.dp,
                border = BorderStroke(1.dp, Color(0xFFE5E7EB))
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
                            text = "देय एकूण रक्कम",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "₹${grandTotal / 100}",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFFEA580C)
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

                            val mockPaymentId = "pay_mt_${System.currentTimeMillis()}"
                            val mockSignature = "sig_mt_${System.currentTimeMillis()}"
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
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp)
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
                                Icon(
                                    Icons.Default.Lock,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(
                                    text = "सुरक्षित पे करा",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    }
                }
            }
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Error Message Banner
            if (errorMessage != null) {
                item {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = Color(0xFFFEF2F2),
                        border = BorderStroke(1.dp, Color(0xFFFECACA))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Default.Error,
                                contentDescription = null,
                                tint = Color(0xFFEF4444),
                                modifier = Modifier.size(18.dp)
                            )
                            Text(
                                text = errorMessage ?: "",
                                fontSize = 12.sp,
                                color = Color(0xFFB91C1C),
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }

            // 1. Order Summary Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, Color(0xFFE5E7EB))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Default.ConfirmationNumber,
                                contentDescription = null,
                                tint = Color(0xFFEA580C),
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "निवडलेली आसने (${selectedSeats.size})",
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        if (selectedSeats.isEmpty()) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 12.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = "कोणतेही आसन निवडलेले नाही. कृपया मागे जाऊन आसन निवडा.",
                                    fontSize = 13.sp,
                                    color = Color(0xFFDC2626),
                                    fontWeight = FontWeight.Medium,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                OutlinedButton(
                                    onClick = onNavigateBack,
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEA580C)),
                                    border = BorderStroke(1.dp, Color(0xFFEA580C)),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("मागे जाऊन आसन निवडा", fontWeight = FontWeight.Bold)
                                }
                            }
                        } else {
                            selectedSeats.forEach { seat ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "आसन क्रमांक: ${seat.seatCode}",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        text = "₹${seat.price / 100}",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFFEA580C)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // 2. Customer Contact Details Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, Color(0xFFE5E7EB))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Default.Person,
                                contentDescription = null,
                                tint = Color(0xFFEA580C),
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "तिकीट धारकाची माहिती",
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Name Input
                        OutlinedTextField(
                            value = customerName,
                            onValueChange = {
                                customerName = it
                                errorMessage = null
                            },
                            label = { Text("पूर्ण नाव (Full Name)") },
                            placeholder = { Text("उदा. सचिन तेंडुलकर") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFFEA580C),
                                unfocusedBorderColor = Color(0xFFE5E7EB)
                            )
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        // Phone Input
                        OutlinedTextField(
                            value = customerPhone,
                            onValueChange = {
                                if (it.length <= 10) {
                                    customerPhone = it
                                    errorMessage = null
                                }
                            },
                            label = { Text("मोबाईल नंबर (WhatsApp ई-तिकीटसाठी)") },
                            placeholder = { Text("१०-अंकी मोबाईल नंबर") },
                            prefix = { Text("+91 ") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFFEA580C),
                                unfocusedBorderColor = Color(0xFFE5E7EB)
                            )
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        // Email Input
                        OutlinedTextField(
                            value = customerEmail,
                            onValueChange = { customerEmail = it },
                            label = { Text("ईमेल आयडी (PDF पावतीसाठी)") },
                            placeholder = { Text("उदा. user@example.com") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFFEA580C),
                                unfocusedBorderColor = Color(0xFFE5E7EB)
                            )
                        )
                    }
                }
            }

            // 3. Promo Code Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, Color(0xFFE5E7EB))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Default.LocalOffer,
                                contentDescription = null,
                                tint = Color(0xFFEA580C),
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "कूपन किंवा प्रोमो कोड",
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            OutlinedTextField(
                                value = couponInput,
                                onValueChange = { couponInput = it.uppercase() },
                                placeholder = { Text("कूपन कोड टाका") },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFFEA580C),
                                    unfocusedBorderColor = Color(0xFFE5E7EB)
                                )
                            )

                            Button(
                                onClick = {
                                    val code = couponInput.trim()
                                    if (code == "MAHA50" || code == "NATAK10") {
                                        appliedCoupon = code
                                        discountAmount = if (code == "MAHA50") 5000 else ((basePrice * 10) / 100).coerceAtMost(10000)
                                    } else {
                                        errorMessage = "अवैध कूपन कोड. कृपया MAHA50 किंवा NATAK10 वापरून पहा."
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("लागू करा", fontWeight = FontWeight.Bold)
                            }
                        }

                        if (appliedCoupon != null) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "✓ $appliedCoupon लागू झाला (-₹${discountAmount / 100})",
                                    color = Color(0xFF059669),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp
                                )
                                TextButton(onClick = {
                                    appliedCoupon = null
                                    discountAmount = 0
                                    couponInput = ""
                                }) {
                                    Text("काढून टाका", color = Color(0xFFDC2626), fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }
            }

            // 4. Detailed Bill Breakdown Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, Color(0xFFE5E7EB))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "रक्कम तपशील (Fare Breakdown)",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        BillRow("तिकिटांची मूळ किंमत (${selectedSeats.size} जागा)", "₹${basePrice / 100}")
                        BillRow("सुविधा शुल्क व बुकिंग चार्जेस", "₹${convenienceFee / 100}")

                        if (discountAmount > 0) {
                            BillRow("कूपन सूट ($appliedCoupon)", "-₹${discountAmount / 100}", isDiscount = true)
                        }

                        HorizontalDivider(
                            modifier = Modifier.padding(vertical = 10.dp),
                            color = Color(0xFFE5E7EB)
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "एकूण देय रक्कम",
                                fontWeight = FontWeight.Black,
                                fontSize = 16.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = "₹${grandTotal / 100}",
                                fontWeight = FontWeight.Black,
                                fontSize = 20.sp,
                                color = Color(0xFFEA580C)
                            )
                        }
                    }
                }
            }

            // 5. Payment Security Trust Badges
            item {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFFFFF7ED),
                    border = BorderStroke(1.dp, Color(0xFFFED7AA))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.VerifiedUser,
                            contentDescription = null,
                            tint = Color(0xFFEA580C),
                            modifier = Modifier.size(20.dp)
                        )
                        Column {
                            Text(
                                text = "१००% सुरक्षित व्यवहार • UPI / NetBanking / Cards",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF9A3412)
                            )
                            Text(
                                text = "बुकिंग होताच व्हॉट्सॲप आणि ईमेलवर अधिकृत डिजिटल ई-पास मिळेल.",
                                fontSize = 11.sp,
                                color = Color(0xFF9A3412).copy(alpha = 0.85f)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun BillRow(label: String, amount: String, isDiscount: Boolean = false) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            fontSize = 13.sp,
            color = if (isDiscount) Color(0xFF059669) else MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = if (isDiscount) FontWeight.Bold else FontWeight.Normal
        )
        Text(
            text = amount,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (isDiscount) Color(0xFF059669) else MaterialTheme.colorScheme.onSurface
        )
    }
}
