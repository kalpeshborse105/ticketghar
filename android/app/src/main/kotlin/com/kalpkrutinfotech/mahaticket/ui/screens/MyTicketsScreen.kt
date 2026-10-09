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
    onNavigateToHome: () -> Unit = {}
) {
    val ticketsState by viewModel.ticketsState.collectAsState()
    var lookupQuery by remember { mutableStateOf("") }
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

                    Spacer(modifier = Modifier.height(12.dp))

                    // Phone or Booking ID Search Bar
                    OutlinedTextField(
                        value = lookupQuery,
                        onValueChange = { lookupQuery = it },
                        placeholder = {
                            Text("मोबाईल नंबर किंवा बुकिंग क्रमांक टाका", fontSize = 13.sp, color = TextSecondary)
                        },
                        leadingIcon = {
                            Icon(
                                Icons.Default.PhoneAndroid,
                                contentDescription = null,
                                tint = MahaOrange,
                                modifier = Modifier.size(18.dp)
                            )
                        },
                        trailingIcon = {
                            if (lookupQuery.isNotBlank()) {
                                IconButton(onClick = { viewModel.loadMyTickets(lookupQuery.trim()) }) {
                                    Icon(
                                        Icons.Default.Search,
                                        contentDescription = "Search",
                                        tint = MahaOrange
                                    )
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedContainerColor = MahaWarmLight,
                            unfocusedContainerColor = MahaWarmLight,
                            focusedBorderColor = MahaOrange,
                            unfocusedBorderColor = MahaBorder
                        ),
                        singleLine = true
                    )
                }
            }

            // Ticket List Content Area
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
            ) {
                when (val state = ticketsState) {
                    is TicketsUiState.Loading -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            TheaterLoaderCard(message = "डिजिटल पास तपासत आहोत...")
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
                                    text = "कृपया बुकिंग करताना दिलेला अचूक मोबाईल नंबर टाका.",
                                    fontSize = 12.sp,
                                    color = TextSecondary
                                )
                                Spacer(modifier = Modifier.height(16.dp))
                                Button(
                                    onClick = { viewModel.loadMyTickets() },
                                    colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text("पुन्हा प्रयत्न करा", fontWeight = FontWeight.Bold, color = Color.White)
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
                                        text = "अद्याप कोणतेही तिकीट बुक केलेले नाही",
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = "आजच लोकप्रिय नाटक किंवा संगीत कार्यक्रमाचे तिकीट बुक करा.",
                                        fontSize = 12.sp,
                                        color = TextSecondary,
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                    )
                                    Spacer(modifier = Modifier.height(18.dp))
                                    Button(
                                        onClick = onNavigateToHome,
                                        colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Text("कार्यक्रम शोधा", fontWeight = FontWeight.Bold, color = Color.White)
                                    }
                                }
                            }
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 90.dp),
                                verticalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                items(orders, key = { it.orderNumber }) { order ->
                                    val booking = order.toBooking()
                                    TicketPassCard(
                                        booking = booking,
                                        language = AppLanguage.MARATHI,
                                        onShareClick = {
                                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                                type = "text/plain"
                                                putExtra(
                                                    Intent.EXTRA_TEXT,
                                                    "माझे महाटिकिट डिजिटल तिकीट: ${BuildConfig.API_BASE_URL}/tickets/${order.orderNumber}\n${order.eventTitle}"
                                                )
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
