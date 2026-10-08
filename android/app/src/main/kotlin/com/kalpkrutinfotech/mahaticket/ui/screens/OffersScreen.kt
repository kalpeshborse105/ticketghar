package com.kalpkrutinfotech.mahaticket.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kalpkrutinfotech.mahaticket.data.api.CouponResponse
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.components.TheaterLoaderCard
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventViewModel
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.OffersUiState

@Composable
fun OffersScreen(viewModel: EventViewModel) {
    val offersState by viewModel.offersState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.loadOffers()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(CinemaBg)
            .testTag("offers_screen")
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
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "विशेष सवलती व ऑफर्स",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White
                        )
                        Text(
                            text = "Special Offers & Promo Codes for MahaTicket",
                            fontSize = 11.sp,
                            color = GoldAccent
                        )
                    }

                    Surface(
                        color = TheatricalCrimson.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(
                            text = "🏷️ ऑफर्स",
                            color = TheatricalCrimsonLight,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            // Offers Content Area
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
            ) {
                when (val state = offersState) {
                    is OffersUiState.Loading -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            TheaterLoaderCard(message = "सध्याच्या ऑफर्स तपासत आहोत...")
                        }
                    }
                    is OffersUiState.Error -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.padding(24.dp)
                            ) {
                                Icon(
                                    Icons.Default.ErrorOutline,
                                    contentDescription = null,
                                    tint = TheatricalCrimson,
                                    modifier = Modifier.size(48.dp)
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(state.message, color = Color.White, fontSize = 14.sp)
                                Spacer(modifier = Modifier.height(16.dp))
                                Button(
                                    onClick = { viewModel.loadOffers() },
                                    colors = ButtonDefaults.buttonColors(containerColor = TheatricalCrimson)
                                ) {
                                    Text("पुन्हा प्रयत्न करा", fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }
                        }
                    }
                    is OffersUiState.Success -> {
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

                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 90.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            item {
                                Text(
                                    text = "सक्रिय कूपन कोड (${displayCoupons.size})",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.White
                                )
                            }

                            items(displayCoupons, key = { it.code }) { coupon ->
                                Card(
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = CinemaSurface),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(16.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Surface(
                                                color = Color(0xFF1E293B),
                                                shape = RoundedCornerShape(8.dp),
                                                border = BorderStroke(1.dp, GoldAccent)
                                            ) {
                                                Text(
                                                    text = coupon.code,
                                                    fontSize = 14.sp,
                                                    fontWeight = FontWeight.Black,
                                                    color = GoldBright,
                                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                                )
                                            }

                                            Spacer(modifier = Modifier.height(8.dp))

                                            val discountText = if (coupon.discountType == "flat") {
                                                "₹${coupon.discountValue / 100} थेट सवलत"
                                            } else {
                                                "${coupon.discountValue / 100}% सवलत"
                                            }
                                            Text(
                                                text = discountText,
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White
                                            )

                                            if (coupon.minOrderValue > 0) {
                                                Text(
                                                    text = "किमान ऑर्डर मूल्य: ₹${coupon.minOrderValue / 100}",
                                                    fontSize = 11.sp,
                                                    color = Color(0xFF94A3B8)
                                                )
                                            }
                                        }

                                        Button(
                                            onClick = {
                                                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                                clipboard.setPrimaryClip(ClipData.newPlainText("Coupon", coupon.code))
                                                Toast.makeText(context, "कूपन '${coupon.code}' कॉपी केले!", Toast.LENGTH_SHORT).show()
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = GoldAccent),
                                            shape = RoundedCornerShape(10.dp)
                                        ) {
                                            Text("कॉपी करा", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 12.sp)
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
