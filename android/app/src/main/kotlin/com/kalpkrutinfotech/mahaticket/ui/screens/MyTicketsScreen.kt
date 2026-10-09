package com.kalpkrutinfotech.mahaticket.ui.screens

import android.content.Intent
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Login
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
import com.kalpkrutinfotech.mahaticket.BuildConfig
import com.kalpkrutinfotech.mahaticket.model.BookingOrder
import com.kalpkrutinfotech.mahaticket.model.toBooking
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.components.TheaterLoaderCard
import com.kalpkrutinfotech.mahaticket.ui.components.TicketPassCard
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.BookingViewModel
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.TicketsUiState

@Composable
fun MyTicketsScreen(
    viewModel: BookingViewModel,
    onNavigateToHome: () -> Unit = {},
    onNavigateToLogin: () -> Unit = {}
) {
    val ticketsState by viewModel.ticketsState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.loadMyTickets()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MahaBg)
            .testTag("my_tickets_screen")
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header Bar
            Surface(
                color = Color.White,
                modifier = Modifier.fillMaxWidth(),
                border = BorderStroke(1.dp, MahaBorder),
                shadowElevation = 1.dp
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
                                text = "माझी डिजिटल तिकिटे",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "आपली सर्व वैध तिकिटे व प्रवेश पास येथे उपलब्ध आहेत",
                                fontSize = 11.5.sp,
                                color = TextSecondary,
                                modifier = Modifier.padding(top = 2.dp)
                            )
                        }

                        Surface(
                            color = MahaWarm,
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = "🎫 ई-पास",
                                color = MahaOrangeDeep,
                                fontSize = 11.5.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }

                }
            }

            // Ticket List Content Area
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
            ) {
                val sessionManager = remember { com.kalpkrutinfotech.mahaticket.util.UserSessionManager.getInstance(context) }
                val isLoggedIn by sessionManager.isLoggedIn.collectAsState()

                if (!isLoggedIn) {
                    // Prompt user to login to view their tickets
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            shape = RoundedCornerShape(16.dp),
                            color = Color.White,
                            border = BorderStroke(1.dp, MahaBorder),
                            shadowElevation = 2.dp
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.padding(24.dp)
                            ) {
                                Text(text = "🎫", fontSize = 48.sp)
                                Spacer(modifier = Modifier.height(14.dp))
                                Text(
                                    text = "माझी तिकिटे पाहण्यासाठी लॉगिन करा",
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "तुमची बुक केलेली सर्व डिजिटल तिकिटे व प्रवेश पास सुरक्षितपणे पाहण्यासाठी कृपया लॉगिन करा.",
                                    fontSize = 12.5.sp,
                                    color = TextSecondary,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(20.dp))
                                Button(
                                    onClick = onNavigateToLogin,
                                    colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(44.dp)
                                ) {
                                    Icon(Icons.AutoMirrored.Filled.Login, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("लॉगिन करा / Sign In", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                                }
                            }
                        }
                    }
                } else {
                    when (val state = ticketsState) {
                        is TicketsUiState.Loading -> {
                            // Modern Ticket Skeleton Shimmer Animation
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                repeat(3) {
                                    Surface(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(140.dp),
                                        shape = RoundedCornerShape(14.dp),
                                        color = MahaWarmLight,
                                        border = BorderStroke(1.dp, MahaBorder)
                                    ) {
                                        Box(
                                            modifier = Modifier.fillMaxSize(),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                                            ) {
                                                CircularProgressIndicator(
                                                    modifier = Modifier.size(20.dp),
                                                    color = MahaOrange,
                                                    strokeWidth = 2.dp
                                                )
                                                Text(
                                                    text = "डिजिटल पास लोड होत आहेत...",
                                                    fontSize = 12.sp,
                                                    color = TextSecondary,
                                                    fontWeight = FontWeight.Medium
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        is TicketsUiState.Error -> {
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    modifier = Modifier.padding(24.dp)
                                ) {
                                    Icon(
                                        Icons.Default.ConfirmationNumber,
                                        contentDescription = null,
                                        tint = MahaOrange,
                                        modifier = Modifier.size(52.dp)
                                    )
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text(
                                        text = "कोणतेही तिकीट सापडले नाही",
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = "तुमच्या खात्यावर सध्या कोणतीही सक्रिय तिकिटे नाहीत.",
                                        fontSize = 12.sp,
                                        color = TextSecondary
                                    )
                                    Spacer(modifier = Modifier.height(16.dp))
                                    Button(
                                        onClick = { viewModel.loadMyTickets() },
                                        colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Text("पुन्हा लोड करा", fontWeight = FontWeight.Bold, color = Color.White)
                                    }
                                }
                            }
                        }
                        is TicketsUiState.Success -> {
                            val orders = state.tickets

                            if (orders.isEmpty()) {
                                Box(
                                    modifier = Modifier.fillMaxSize(),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        modifier = Modifier.padding(24.dp)
                                    ) {
                                        Text(text = "🎭", fontSize = 48.sp)
                                        Spacer(modifier = Modifier.height(14.dp))
                                        Text(
                                            text = "अद्याप कोणतीही तिकिटे बुक केलेली नाहीत",
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = TextPrimary
                                        )
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Text(
                                            text = "आपल्या आवडत्या मराठी नाटकांचे व कार्यक्रमांचे ई-पास येथे दिसतील.",
                                            fontSize = 12.5.sp,
                                            color = TextSecondary,
                                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                        )
                                        Spacer(modifier = Modifier.height(16.dp))
                                        Button(
                                            onClick = onNavigateToHome,
                                            colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                                            shape = RoundedCornerShape(8.dp)
                                        ) {
                                            Text("नवीन कार्यक्रम पहा", fontWeight = FontWeight.Bold, color = Color.White)
                                        }
                                    }
                                }
                            } else {
                                LazyColumn(
                                    modifier = Modifier.fillMaxSize(),
                                    contentPadding = PaddingValues(16.dp, 12.dp, 16.dp, 90.dp),
                                    verticalArrangement = Arrangement.spacedBy(14.dp)
                                ) {
                                    items(orders, key = { it.orderNumber }) { order ->
                                        TicketPassCard(
                                            booking = order.toBooking(),
                                            onShareClick = {
                                                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                                    type = "text/plain"
                                                    putExtra(Intent.EXTRA_SUBJECT, "MahaTicket: ${order.eventTitle}")
                                                    putExtra(Intent.EXTRA_TEXT, "मी महाटिकिटवर ${order.eventTitle} चे तिकीट बुक केले आहे! बुकिंग क्रमांक: ${order.orderNumber}")
                                                }
                                                context.startActivity(Intent.createChooser(shareIntent, "तिकीट शेअर करा"))
                                            }
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
