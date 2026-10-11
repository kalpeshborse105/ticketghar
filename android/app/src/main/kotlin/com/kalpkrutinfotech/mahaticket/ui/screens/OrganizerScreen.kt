package com.kalpkrutinfotech.mahaticket.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.TicketGharViewModel

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

    var showToast by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(showToast) {
        if (showToast != null) {
            kotlinx.coroutines.delay(3000)
            showToast = null
        }
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF9F9FF))
            .testTag("organizer_dashboard_screen"),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 100.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Organizer Welcome & Status Banner
        item {
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(20.dp),
                border = BorderStroke(1.dp, MahaBorder),
                shadowElevation = 2.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Surface(
                                shape = RoundedCornerShape(14.dp),
                                color = Color(0xFFFFDBCE),
                                modifier = Modifier.size(44.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text("🎭", fontSize = 22.sp)
                                }
                            }

                            val context = androidx.compose.ui.platform.LocalContext.current
                            val organizerName = remember(context) {
                                val n = com.kalpkrutinfotech.mahaticket.util.UserSessionManager.getInstance(context).getName()
                                if (!n.isNullOrBlank()) n else "महालक्ष्मी थिएटर्स"
                            }
                            Column {
                                Text(
                                    text = "नमस्कार, $organizerName",
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.Black,
                                    color = TextPrimary
                                )
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    modifier = Modifier.padding(top = 2.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .background(Color(0xFF16A34A), CircleShape)
                                    )
                                    Text(
                                        text = "थेट बुकिंग सुरू आहे • Active",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF16A34A)
                                    )
                                }
                            }
                        }

                        IconButton(
                            onClick = { showToast = "नाट्य संस्था स्विच केली" },
                            modifier = Modifier
                                .size(36.dp)
                                .background(Color(0xFFE1E8FD), CircleShape)
                        ) {
                            Icon(
                                Icons.Default.SwapHoriz,
                                contentDescription = null,
                                tint = TextPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Surface(
                        color = Color(0xFFFFF7ED),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, Color(0xFFFFEDD5)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text("📢", fontSize = 14.sp)
                                Text(
                                    text = "पुणे नाट्य महोत्सव विशेष विंडो सुरू आहे",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MahaOrangeDeep
                                )
                            }
                            Text(
                                text = "थेट आकडेवारी",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = MahaOrange
                            )
                        }
                    }
                }
            }
        }

        // 2. Key Business KPI Metrics (2x2 Grid)
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "आजचे मुख्य निर्देशक",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "ताजे अपडेट: आत्ताच",
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // KPI 1: Gross Sales
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, MahaBorder),
                        shadowElevation = 1.dp,
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "आजचे एकूण उत्पन्न",
                                    fontSize = 11.sp,
                                    color = TextSecondary
                                )
                                Surface(
                                    color = Color(0xFFFFF7ED),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text("₹", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MahaOrange)
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            val localTotal = bookings.sumOf { it.totalAmount }
                            Text(
                                text = if (localTotal > 0) "₹$localTotal" else "₹० (नोंदणी बाकी)",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Black,
                                color = TextPrimary
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = if (bookings.isNotEmpty()) "स्थानिक उपकरण नोंदी" else "नवीन बुकिंग सुरू आहे",
                                fontSize = 10.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF16A34A)
                            )
                        }
                    }

                    // KPI 2: Tickets Sold
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, MahaBorder),
                        shadowElevation = 1.dp,
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "विकलेली तिकिटे",
                                    fontSize = 11.sp,
                                    color = TextSecondary
                                )
                                Surface(
                                    color = Color(0xFFE1E8FD),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text("🎫", fontSize = 12.sp)
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            val totalTickets = bookings.sumOf { it.ticketCount }
                            Text(
                                text = "$totalTickets",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Black,
                                color = TextPrimary
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "स्थानिक यशस्वी नोंदी",
                                fontSize = 10.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextSecondary
                            )
                        }
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // KPI 3: Active Shows
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, MahaBorder),
                        shadowElevation = 1.dp,
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "सक्रिय शोज आज",
                                    fontSize = 11.sp,
                                    color = TextSecondary
                                )
                                Surface(
                                    color = Color(0xFFE1E8FD),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text("🎭", fontSize = 12.sp)
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "${events.size} शोज",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Black,
                                color = TextPrimary
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "थेट उपलब्ध कार्यक्रम",
                                fontSize = 10.5.sp,
                                color = TextSecondary
                            )
                        }
                    }

                    // KPI 4: Pending Settlement
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, MahaBorder),
                        shadowElevation = 1.dp,
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "प्रलंबित सेटलमेंट",
                                    fontSize = 11.sp,
                                    color = TextSecondary
                                )
                                Surface(
                                    color = Color(0xFFFFF7ED),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text("💼", fontSize = 12.sp)
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "वेब पोर्टल",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Black,
                                color = TextPrimary
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "तपशील वेब पोर्टल द्वारे उपलब्ध",
                                fontSize = 10.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = MahaOrange
                            )
                        }
                    }
                }
            }
        }

        // 3. Quick Actions (आयोजक जलद कृती)
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "आयोजक जलद कृती",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Action 1: Add Event Wizard
                    Surface(
                        color = MahaOrange,
                        shape = RoundedCornerShape(16.dp),
                        shadowElevation = 2.dp,
                        modifier = Modifier
                            .weight(1f)
                            .height(115.dp)
                            .clickable { showToast = "कार्यक्रम निर्मिती विझार्ड उघडला" }
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = Color.White.copy(alpha = 0.25f),
                                modifier = Modifier.size(34.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                                }
                            }
                            Column {
                                Text("नवीन कार्यक्रम", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                Text("+ Add Event Wizard", fontSize = 10.sp, color = Color.White.copy(alpha = 0.85f))
                            }
                        }
                    }

                    // Action 2: Gate Scanner Fast Access
                    Surface(
                        color = Color(0xFFFD6B36),
                        shape = RoundedCornerShape(16.dp),
                        shadowElevation = 2.dp,
                        modifier = Modifier
                            .weight(1f)
                            .height(115.dp)
                            .clickable { onLaunchScannerClick() }
                            .testTag("organizer_launch_scanner_btn")
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = Color.White.copy(alpha = 0.7f),
                                    modifier = Modifier.size(34.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(Icons.Outlined.QrCodeScanner, contentDescription = null, tint = MahaOrangeDeep, modifier = Modifier.size(20.dp))
                                    }
                                }

                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = Color(0xFF16A34A)
                                ) {
                                    Text(
                                        text = "LIVE",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                            Column {
                                Text("गेट स्कॅनर सुरू करा", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                Text("Fast Gate Check-in", fontSize = 10.sp, color = Color.White.copy(alpha = 0.9f))
                            }
                        }
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Action 3: Manage Shows
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, MahaBorder),
                        modifier = Modifier
                            .weight(1f)
                            .height(115.dp)
                            .clickable { showToast = "शोज व्यवस्थापन उघडले" }
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = Color(0xFFE1E8FD),
                                modifier = Modifier.size(34.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.CalendarToday, contentDescription = null, tint = TextPrimary, modifier = Modifier.size(18.dp))
                                }
                            }
                            Column {
                                Text("शोज व्यवस्थापन", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text("Manage Shows (${events.size})", fontSize = 10.sp, color = TextSecondary)
                            }
                        }
                    }

                    // Action 4: Seat Rates
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, MahaBorder),
                        modifier = Modifier
                            .weight(1f)
                            .height(115.dp)
                            .clickable {
                                val firstEvent = events.firstOrNull()
                                if (firstEvent != null) onViewShowSeatsClick(firstEvent)
                            }
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = Color(0xFFFFF7ED),
                                modifier = Modifier.size(34.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.Chair, contentDescription = null, tint = MahaOrange, modifier = Modifier.size(18.dp))
                                }
                            }
                            Column {
                                Text("आसन दर व जागा", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text("Seat Rates & Pricing", fontSize = 10.sp, color = TextSecondary)
                            }
                        }
                    }
                }
            }
        }

        // 4. Gate Scanner & Attendance Tracker Module
        item {
            val totalBookedTickets = bookings.sumOf { it.ticketCount }
            val checkedInCount = bookings.filter { it.isCheckedIn }.sumOf { it.ticketCount }
            val attendancePct = if (totalBookedTickets > 0) (checkedInCount * 100 / totalBookedTickets) else 0
            val pendingCount = (totalBookedTickets - checkedInCount).coerceAtLeast(0)
            val activeEventTitle = events.firstOrNull()?.titleMr ?: "सक्रिय शो"

            Surface(
                color = Color.White,
                shape = RoundedCornerShape(20.dp),
                border = BorderStroke(1.dp, MahaBorder),
                shadowElevation = 1.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "गेट स्कॅनर व हजेरी ट्रॅकर",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "थेट शो: '$activeEventTitle'",
                                fontSize = 11.5.sp,
                                color = TextSecondary
                            )
                        }
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .background(Color(0xFF16A34A), CircleShape)
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Circular progress indicator box
                        Surface(
                            shape = CircleShape,
                            color = Color(0xFFFFF7ED),
                            border = BorderStroke(3.dp, MahaOrange),
                            modifier = Modifier.size(80.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("$attendancePct%", fontSize = 18.sp, fontWeight = FontWeight.Black, color = TextPrimary)
                                    Text("दाखल", fontSize = 9.sp, color = TextSecondary)
                                }
                            }
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "$checkedInCount / $totalBookedTickets प्रेक्षक",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = if (totalBookedTickets > 0) "सभागृहात दाखल झाले आहेत" else "नोंदणीकृत प्रेक्षक",
                                fontSize = 11.5.sp,
                                color = TextSecondary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Surface(
                                color = Color(0xFFFFF7ED),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(
                                    text = "$pendingCount अजून येणे बाकी",
                                    fontSize = 10.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MahaOrange,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Breakdown by Gates
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFFF1F3FF), RoundedCornerShape(12.dp))
                            .padding(10.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("गेट १ (मुख्य प्रवेश)", fontSize = 10.sp, color = TextSecondary)
                            Text("$checkedInCount", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text("दाखल", fontSize = 9.5.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A))
                        }
                        Box(modifier = Modifier.width(1.dp).height(30.dp).background(MahaBorder))
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("एकूण जागा", fontSize = 10.sp, color = TextSecondary)
                            Text("$totalBookedTickets", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text("बुकिंग", fontSize = 9.5.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A))
                        }
                        Box(modifier = Modifier.width(1.dp).height(30.dp).background(MahaBorder))
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("बाकी प्रेक्षक", fontSize = 10.sp, color = TextSecondary)
                            Text("$pendingCount", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MahaOrangeDeep)
                            Text("प्रतिक्षित", fontSize = 9.5.sp, fontWeight = FontWeight.Bold, color = MahaOrange)
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Button(
                        onClick = onLaunchScannerClick,
                        colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().height(44.dp)
                    ) {
                        Icon(Icons.Outlined.QrCodeScanner, contentDescription = null, modifier = Modifier.size(18.dp), tint = Color.White)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("कॅमेरा स्कॅनर त्वरित सुरू करा", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color.White)
                    }
                }
            }
        }
    }
}
