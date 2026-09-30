package com.kalpkrutinfotech.mahaticket.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.alpha
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.animateFloatAsState
import coil.compose.AsyncImage
import com.kalpkrutinfotech.mahaticket.BuildConfig
import com.kalpkrutinfotech.mahaticket.theme.*
import java.net.URLEncoder

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TicketDetailScreen(
    ticketCode: String,
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current

    // Mock ticket data - in real app, fetch from ViewModel
    val mockTicket = remember {
        TicketDisplayData(
            ticketCode = ticketCode,
            orderNumber = "ORD${ticketCode.take(8)}",
            eventTitle = "नाटक शीर्षक",
            eventTitleEn = "Play Title",
            venueName = "सुमित रंगायतन",
            venueAddress = "शिवाजीनगर, पुणे",
            showtime = "30 सप्टेंबर 2026, 7:00 PM",
            seatCode = "A-15",
            attendeeName = "ग्राहक नाव",
            qrPayload = "TICKET:$ticketCode",
            status = "confirmed"
        )
    }

    var isCardVisible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        isCardVisible = true
    }
    val cardScale by animateFloatAsState(
        targetValue = if (isCardVisible) 1f else 0.94f,
        animationSpec = tween(durationMillis = 280),
        label = "ticketCardScale"
    )
    val cardAlpha by animateFloatAsState(
        targetValue = if (isCardVisible) 1f else 0f,
        animationSpec = tween(durationMillis = 280),
        label = "ticketCardAlpha"
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("माझे तिकीट") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = {
                        // Download PDF
                        val pdfUrl = "${BuildConfig.API_BASE_URL}/api/tickets/${ticketCode}/pdf"
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(pdfUrl))
                        context.startActivity(intent)
                    }) {
                        Icon(Icons.Default.Download, contentDescription = "Download PDF")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
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
            // Ticket Card with QR and entrance animation
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .scale(cardScale)
                        .alpha(cardAlpha),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(4.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Status Badge
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = MahaSuccess.copy(alpha = 0.15f)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = MahaSuccess,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "पुष्टी झालेले",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MahaSuccess
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(20.dp))

                        // QR Code using qrserver.com
                        val qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?" +
                                "size=250x250&data=${URLEncoder.encode(mockTicket.qrPayload, "UTF-8")}"
                        
                        Surface(
                            modifier = Modifier.size(250.dp),
                            shape = RoundedCornerShape(12.dp),
                            color = Color.White
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(12.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                AsyncImage(
                                    model = qrCodeUrl,
                                    contentDescription = "QR Code",
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Fit
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Text(
                            text = mockTicket.ticketCode,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                            letterSpacing = 2.sp
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = "प्रवेशाच्या वेळी हा QR कोड स्कॅन करा",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }

            // Event Details
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Text(
                            text = mockTicket.eventTitle,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = mockTicket.eventTitleEn,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        TicketInfoRow(
                            icon = Icons.Default.LocationOn,
                            label = "सभागृह",
                            value = "${mockTicket.venueName}\n${mockTicket.venueAddress}"
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        TicketInfoRow(
                            icon = Icons.Default.CalendarToday,
                            label = "तारीख आणि वेळ",
                            value = mockTicket.showtime
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        TicketInfoRow(
                            icon = Icons.Default.EventSeat,
                            label = "आसन",
                            value = mockTicket.seatCode
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        TicketInfoRow(
                            icon = Icons.Default.Person,
                            label = "प्रेक्षक",
                            value = mockTicket.attendeeName
                        )
                    }
                }
            }

            // Action Buttons
            item {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Share via WhatsApp
                    Button(
                        onClick = {
                            val message = """
                                *${mockTicket.eventTitle}*
                                
                                📍 ${mockTicket.venueName}
                                📅 ${mockTicket.showtime}
                                💺 Seat: ${mockTicket.seatCode}
                                🎟️ Ticket: ${mockTicket.ticketCode}
                                
                                View: ${BuildConfig.API_BASE_URL}/api/tickets/${ticketCode}/pdf
                            """.trimIndent()
                            
                            val encodedMessage = URLEncoder.encode(message, "UTF-8")
                            val intent = Intent(Intent.ACTION_VIEW).apply {
                                data = Uri.parse("https://wa.me/?text=$encodedMessage")
                            }
                            context.startActivity(intent)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF25D366) // WhatsApp green
                        ),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Share, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("WhatsApp वर शेअर करा", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                    }

                    // Download PDF
                    OutlinedButton(
                        onClick = {
                            val pdfUrl = "${BuildConfig.API_BASE_URL}/api/tickets/${ticketCode}/pdf"
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(pdfUrl))
                            context.startActivity(intent)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = MaterialTheme.colorScheme.primary
                        ),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.PictureAsPdf, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("PDF डाउनलोड करा", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            // Important Note
            item {
                Surface(
                    color = MahaWarning.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Icon(
                            Icons.Default.Info,
                            contentDescription = null,
                            tint = MahaWarning,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "कृपया कार्यक्रमाच्या वेळी हे तिकीट (QR कोड) सोबत आणा. प्रवेशासाठी वैध ओळखपत्र आवश्यक आहे.",
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

@Composable
fun TicketInfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = value,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
                lineHeight = 18.sp
            )
        }
    }
}

data class TicketDisplayData(
    val ticketCode: String,
    val orderNumber: String,
    val eventTitle: String,
    val eventTitleEn: String,
    val venueName: String,
    val venueAddress: String,
    val showtime: String,
    val seatCode: String,
    val attendeeName: String,
    val qrPayload: String,
    val status: String
)
