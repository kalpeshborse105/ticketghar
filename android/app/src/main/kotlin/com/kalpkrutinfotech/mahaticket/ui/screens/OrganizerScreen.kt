package com.kalpkrutinfotech.mahaticket.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.QrCodeScanner
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
import com.kalpkrutinfotech.mahaticket.model.Event
import com.kalpkrutinfotech.mahaticket.model.AppTab
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.TicketGharViewModel
import com.kalpkrutinfotech.mahaticket.theme.*

@Composable
fun OrganizerScreen(
    viewModel: TicketGharViewModel,
    onLaunchScannerClick: () -> Unit,
    onViewShowSeatsClick: (Event) -> Unit,
    modifier: Modifier = Modifier
) {
    val language by viewModel.language.collectAsState()
    val events by viewModel.events.collectAsState()
    val bookings by viewModel.bookings.collectAsState()

    val totalBookings = bookings.size
    val totalRevenue = bookings.sumOf { it.totalAmount }
    val totalTickets = bookings.sumOf { it.ticketCount }
    val checkedInCount = bookings.count { it.isCheckedIn }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(CinemaBg)
            .testTag("organizer_dashboard_screen"),
        contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 90.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Organizer Welcome Header
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF131A29)),
                shape = RoundedCornerShape(16.dp),
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
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(text = "🎪 ", fontSize = 22.sp)
                            Text(
                                text = if (language == AppLanguage.MARATHI) "नाट्यगृह व आयोजक पोर्टल" else "Organizer Operations Portal",
                                color = GoldBright,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Black
                            )
                        }
                        Text(
                            text = if (language == AppLanguage.MARATHI)
                                "थेट तिकीट विक्री, आसन भारमान व गेट प्रवेश पडताळणी"
                            else
                                "Live Ticket Sales, Capacity & Gate Access Management",
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp
                        )
                    }

                    // Launch Camera Scanner CTA Button
                    Button(
                        onClick = onLaunchScannerClick,
                        colors = ButtonDefaults.buttonColors(containerColor = TheatricalCrimson),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.testTag("organizer_launch_scanner_btn")
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Outlined.QrCodeScanner,
                                contentDescription = "Scan",
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (language == AppLanguage.MARATHI) "स्कॅनर 📷" else "Scanner 📷",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp
                            )
                        }
                    }
                }
            }
        }

        // Live KPI Metrics Grid
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = if (language == AppLanguage.MARATHI) "📊 थेट व्यवसाय सारांश" else "📊 Live Performance Overview",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OrganizerKpiCard(
                        title = if (language == AppLanguage.MARATHI) "एकूण कमाई (Gross)" else "Gross Ticket Revenue",
                        value = "₹$totalRevenue",
                        subtitle = "Razorpay Settled",
                        color = GoldAccent,
                        modifier = Modifier.weight(1f)
                    )
                    OrganizerKpiCard(
                        title = if (language == AppLanguage.MARATHI) "विक्री झालेली तिकिटे" else "Tickets Sold",
                        value = "$totalTickets",
                        subtitle = "$totalBookings Bookings",
                        color = Color(0xFF38BDF8),
                        modifier = Modifier.weight(1f)
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OrganizerKpiCard(
                        title = if (language == AppLanguage.MARATHI) "गेट प्रवेश पूर्ण (Checked-In)" else "Gate Checked-In",
                        value = "$checkedInCount / $totalBookings",
                        subtitle = if (totalBookings > 0) "${(checkedInCount * 100) / totalBookings}% Admitted" else "0%",
                        color = SuccessEmerald,
                        modifier = Modifier.weight(1f)
                    )
                    OrganizerKpiCard(
                        title = if (language == AppLanguage.MARATHI) "सक्रिय नाट्यप्रयोग" else "Active Shows",
                        value = "${events.size}",
                        subtitle = "3 Venues in Pune & Mumbai",
                        color = TheatricalCrimsonLight,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // Manage Shows & Real-Time Capacity
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (language == AppLanguage.MARATHI) "🎭 तुमचे नाट्यप्रयोग व आसन स्थिती" else "🎭 Managed Shows & Capacity",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "${events.size} Shows Live",
                    fontSize = 11.sp,
                    color = GoldAccent
                )
            }
        }

        items(events) { evt ->
            Card(
                colors = CardDefaults.cardColors(containerColor = CinemaSurface),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = if (language == AppLanguage.MARATHI) evt.titleMr else evt.titleEn,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "📍 ${evt.venue.nameMr} • ${evt.venue.city}",
                                fontSize = 11.sp,
                                color = Color(0xFF94A3B8)
                            )
                        }

                        Surface(
                            color = Color(0xFF064E3B),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = "BOOKINGS OPEN",
                                color = Color(0xFFA7F3D0),
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    val simulatedOccupancy = 78
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = if (language == AppLanguage.MARATHI) "थेट प्रेक्षक उपस्थिती (Occupancy)" else "Seat Occupancy",
                            fontSize = 11.sp,
                            color = Color(0xFFCBD5E1)
                        )
                        Text(
                            text = "$simulatedOccupancy%",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = GoldBright
                        )
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    LinearProgressIndicator(
                        progress = { simulatedOccupancy / 100f },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp)),
                        color = GoldAccent,
                        trackColor = Color(0xFF1E293B)
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "${evt.availableShowtimes.size} ${if (language == AppLanguage.MARATHI) "प्रयोग वेळा" else "Showtimes"}",
                            fontSize = 11.sp,
                            color = Color(0xFF94A3B8)
                        )

                        OutlinedButton(
                            onClick = { onViewShowSeatsClick(evt) },
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, GoldAccent),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = GoldAccent)
                        ) {
                            Text(
                                text = if (language == AppLanguage.MARATHI) "आसन नकाशा तपासा 🪑" else "View Live Map 🪑",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OrganizerKpiCard(
    title: String,
    value: String,
    subtitle: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = CinemaSurface)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(text = title, fontSize = 11.sp, color = Color(0xFF94A3B8))
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = value, fontSize = 18.sp, fontWeight = FontWeight.Black, color = color)
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = subtitle, fontSize = 10.sp, color = SuccessEmerald, fontWeight = FontWeight.Medium)
        }
    }
}

