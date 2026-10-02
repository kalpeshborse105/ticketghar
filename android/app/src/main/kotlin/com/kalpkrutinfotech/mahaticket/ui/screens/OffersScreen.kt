package com.kalpkrutinfotech.mahaticket.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kalpkrutinfotech.mahaticket.data.api.CouponResponse
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventViewModel
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.OffersUiState

@Composable
fun OffersScreen(viewModel: EventViewModel) {
    val offersState by viewModel.offersState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.loadOffers()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Header
        Surface(
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 2.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "विशेष सवलती व ऑफर्स",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Black,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Special Offers & Promo Codes for MahaTicket",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFFFFF7ED)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.LocalOffer,
                            contentDescription = null,
                            tint = Color(0xFFEA580C),
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            when (val state = offersState) {
                is OffersUiState.Loading -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        CircularProgressIndicator(
                            color = Color(0xFFEA580C),
                            strokeWidth = 3.dp,
                            modifier = Modifier.size(36.dp)
                        )
                        Spacer(modifier = Modifier.height(14.dp))
                        Text(
                            "सध्याच्या ऑफर्स तपासत आहोत...",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
                is OffersUiState.Error -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.ErrorOutline,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(state.message, color = MaterialTheme.colorScheme.onSurface, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { viewModel.loadOffers() },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C))
                        ) {
                            Text("पुन्हा प्रयत्न करा", fontWeight = FontWeight.Bold)
                        }
                    }
                }
                is OffersUiState.Success -> {
                    // Combine default coupons with server coupons if empty
                    val serverCoupons = state.coupons
                    val defaultCoupons = listOf(
                        CouponResponse(
                            id = 1,
                            code = "MAHA50",
                            discountType = "flat",
                            discountValue = 5000,
                            minOrderValue = 30000,
                            maxDiscount = 5000,
                            active = 1
                        ),
                        CouponResponse(
                            id = 2,
                            code = "NATAK10",
                            discountType = "percentage",
                            discountValue = 1000,
                            minOrderValue = 0,
                            maxDiscount = 10000,
                            active = 1
                        )
                    )
                    val displayCoupons = if (serverCoupons.isNotEmpty()) serverCoupons else defaultCoupons
                    val announcements = state.announcements

                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Section 1: Coupons Header
                        item {
                            Text(
                                text = "सक्रिय कूपन कोड (${displayCoupons.size})",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Black,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }

                        // Coupons
                        items(displayCoupons) { coupon ->
                            ModernCouponVoucherCard(
                                coupon = coupon,
                                onCopyCode = { code ->
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    val clip = ClipData.newPlainText("Coupon Code", code)
                                    clipboard.setPrimaryClip(clip)
                                    Toast.makeText(context, "कूपन कोड $code कॉपी झाला!", Toast.LENGTH_SHORT).show()
                                }
                            )
                        }

                        // Section 2: Announcements if any
                        if (announcements.isNotEmpty()) {
                            item {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "विशेष सूचना व आगामी उत्सव",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Black,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }

                            items(announcements) { ann ->
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                    border = BorderStroke(1.dp, Color(0xFFE5E7EB))
                                ) {
                                    Column(modifier = Modifier.padding(16.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                Icons.Default.Campaign,
                                                contentDescription = null,
                                                tint = Color(0xFFEA580C),
                                                modifier = Modifier.size(20.dp)
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                ann.title,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 14.sp,
                                                color = MaterialTheme.colorScheme.onSurface
                                            )
                                        }
                                        if (ann.message.isNotBlank()) {
                                            Spacer(modifier = Modifier.height(6.dp))
                                            Text(
                                                ann.message,
                                                fontSize = 12.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                lineHeight = 16.sp
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ModernCouponVoucherCard(
    coupon: CouponResponse,
    onCopyCode: (String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, Color(0xFFE5E7EB)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Code box with copy icon
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFFFF7ED),
                    border = BorderStroke(1.dp, Color(0xFFFED7AA))
                ) {
                    Text(
                        text = coupon.code,
                        fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                        fontWeight = FontWeight.Black,
                        fontSize = 15.sp,
                        color = Color(0xFFEA580C),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                    )
                }

                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = Color(0xFFECFDF5)
                ) {
                    Text(
                        text = "सक्रिय (ACTIVE)",
                        color = Color(0xFF059669),
                        fontWeight = FontWeight.Bold,
                        fontSize = 10.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            val discountText = if (coupon.discountType == "percentage") {
                "${coupon.discountValue / 100}% थेट सवलत"
            } else {
                "₹${coupon.discountValue / 100} थेट सवलत"
            }
            Text(
                text = discountText,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )

            Spacer(modifier = Modifier.height(4.dp))

            val minOrder = if (coupon.minOrderValue > 0) "किमान ₹${coupon.minOrderValue / 100} च्या बुकिंगवर लागू" else "सर्व बुकिंगवर उपलब्ध"
            val maxDiscount = if (coupon.maxDiscount > 0 && coupon.discountType == "percentage") " (कमाल ₹${coupon.maxDiscount / 100})" else ""
            Text(
                text = "$minOrder$maxDiscount. चेकआउट दरम्यान कूपन कोड लागू करा.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 16.sp
            )

            Spacer(modifier = Modifier.height(12.dp))

            Button(
                onClick = { onCopyCode(coupon.code) },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)),
                shape = RoundedCornerShape(10.dp),
                contentPadding = PaddingValues(vertical = 8.dp)
            ) {
                Icon(
                    Icons.Default.ContentCopy,
                    contentDescription = null,
                    modifier = Modifier.size(15.dp),
                    tint = Color.White
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "कूपन कोड कॉपी करा",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }
    }
}
