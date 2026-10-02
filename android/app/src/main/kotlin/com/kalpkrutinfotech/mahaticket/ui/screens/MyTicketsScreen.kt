package com.kalpkrutinfotech.mahaticket.ui.screens

import android.content.Intent
import android.net.Uri
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kalpkrutinfotech.mahaticket.BuildConfig
import com.kalpkrutinfotech.mahaticket.model.BookingOrder
import com.kalpkrutinfotech.mahaticket.theme.*
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
                            text = "माझी तिकिटे (My Tickets)",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Black,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "आपली सर्व डिजिटल तिकिटे व प्रवेश पास",
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
                            Icons.Default.ConfirmationNumber,
                            contentDescription = null,
                            tint = Color(0xFFEA580C),
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Guest Phone or Booking ID Search Bar
                OutlinedTextField(
                    value = lookupQuery,
                    onValueChange = { lookupQuery = it },
                    placeholder = { Text("मोबाईल नंबर किंवा बुकिंग क्रमांक टाका", fontSize = 13.sp) },
                    leadingIcon = {
                        Icon(
                            Icons.Default.PhoneAndroid,
                            contentDescription = null,
                            tint = Color(0xFFEA580C),
                            modifier = Modifier.size(18.dp)
                        )
                    },
                    trailingIcon = {
                        if (lookupQuery.isNotBlank()) {
                            IconButton(onClick = { viewModel.loadMyTickets(lookupQuery.trim()) }) {
                                Icon(
                                    Icons.Default.Search,
                                    contentDescription = "Search",
                                    tint = Color(0xFFEA580C)
                                )
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Color(0xFFF9FAFB),
                        unfocusedContainerColor = Color(0xFFF9FAFB),
                        focusedBorderColor = Color(0xFFEA580C),
                        unfocusedBorderColor = Color(0xFFE5E7EB)
                    ),
                    singleLine = true
                )
            }
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            when (val state = ticketsState) {
                is TicketsUiState.Loading -> {
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
                            "तिकिटे तपासत आहोत...",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
                is TicketsUiState.Error -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.ConfirmationNumber,
                            contentDescription = null,
                            tint = Color(0xFFEA580C).copy(alpha = 0.5f),
                            modifier = Modifier.size(56.dp)
                        )
                        Spacer(modifier = Modifier.height(14.dp))
                        Text(
                            text = "कोणतेही तिकीट सापडले नाही",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "कृपया बुकिंग करताना दिलेला अचूक मोबाईल नंबर टाका",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { viewModel.loadMyTickets() },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("पुन्हा प्रयत्न करा", fontWeight = FontWeight.Bold)
                        }
                    }
                }
                is TicketsUiState.Success -> {
                    val orders = state.tickets

                    if (orders.isEmpty()) {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(72.dp)
                                    .clip(RoundedCornerShape(20.dp))
                                    .background(Color(0xFFFFF7ED)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.ConfirmationNumber,
                                    contentDescription = null,
                                    modifier = Modifier.size(40.dp),
                                    tint = Color(0xFFEA580C)
                                )
                            }
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "सध्या कोणतेही सक्रिय तिकीट नाही",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "आपण बुक केलेले तिकीट पाहण्यासाठी वर आपला मोबाईल नंबर टाका किंवा नवीन नाटक बुक करा.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                modifier = Modifier.padding(horizontal = 24.dp)
                            )
                            Spacer(modifier = Modifier.height(20.dp))
                            Button(
                                onClick = onNavigateToHome,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("कार्यक्रम एक्सप्लोर करा", fontWeight = FontWeight.Bold)
                            }
                        }
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            items(orders) { order ->
                                ModernTicketOrderCard(
                                    order = order,
                                    onDownloadPdf = { ticketCode ->
                                        val pdfUrl = "${BuildConfig.API_BASE_URL}/api/tickets/$ticketCode/pdf"
                                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(pdfUrl))
                                        context.startActivity(intent)
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

@Composable
fun ModernTicketOrderCard(
    order: BookingOrder,
    onDownloadPdf: (String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, Color(0xFFE5E7EB)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            // Header Strip
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.horizontalGradient(
                            listOf(Color(0xFFEA580C), Color(0xFFC2410C))
                        )
                    )
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "ऑर्डर #${order.orderNumber}",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = Color.White.copy(alpha = 0.25f)
                    ) {
                        Text(
                            text = "CONFIRMED",
                            color = Color.White,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            // Ticket Content
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = order.eventTitle,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.onSurface
                )

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = Color(0xFFEA580C),
                        modifier = Modifier.size(13.dp)
                    )
                    Text(
                        text = order.venueName,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        Icons.Default.Schedule,
                        contentDescription = null,
                        tint = Color(0xFFEA580C),
                        modifier = Modifier.size(13.dp)
                    )
                    Text(
                        text = order.showtime,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                HorizontalDivider(
                    modifier = Modifier.padding(vertical = 10.dp),
                    color = Color(0xFFE5E7EB)
                )

                // Bottom row with Total and Download Button
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "एकूण भरलेली रक्कम",
                            fontSize = 10.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "₹${order.grandTotal / 100}",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFFEA580C)
                        )
                    }

                    val firstTicketCode = order.tickets.firstOrNull()?.ticketCode ?: order.orderNumber
                    Button(
                        onClick = { onDownloadPdf(firstTicketCode) },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                    ) {
                        Icon(
                            Icons.Default.Download,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "PDF ई-पास",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }
            }
        }
    }
}
