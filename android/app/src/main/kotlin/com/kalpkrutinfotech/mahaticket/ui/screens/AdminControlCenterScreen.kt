package com.kalpkrutinfotech.mahaticket.ui.screens

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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kalpkrutinfotech.mahaticket.model.AuditLog
import com.kalpkrutinfotech.mahaticket.model.SeatLayoutConfig
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.TicketGharViewModel
import com.kalpkrutinfotech.mahaticket.theme.*
import java.text.SimpleDateFormat
import java.util.*

enum class AdminSubSection {
    ANALYTICS,
    SEATING_DESIGNER,
    BROADCAST_ALERTS,
    AUDIT_LOGS
}

@Composable
fun AdminControlCenterScreen(
    viewModel: TicketGharViewModel,
    modifier: Modifier = Modifier
) {
    val language by viewModel.language.collectAsState()
    val events by viewModel.events.collectAsState()
    val bookings by viewModel.bookings.collectAsState()
    val auditLogs by viewModel.auditLogs.collectAsState()
    val layoutConfig by viewModel.currentLayoutConfig.collectAsState()

    var activeSubSection by remember { mutableStateOf(AdminSubSection.ANALYTICS) }

    // Alert broadcast form states
    var alertTitle by remember { mutableStateOf("") }
    var alertMessage by remember { mutableStateOf("") }
    var alertIsUrgent by remember { mutableStateOf(true) }
    var broadcastSuccess by remember { mutableStateOf(false) }

    // Seating Designer states
    var designerRowsCount by remember { mutableStateOf(layoutConfig.rows.size) }
    var designerSeatsPerRow by remember { mutableStateOf(layoutConfig.seatsPerRow) }
    var designerAisleOffset by remember { mutableStateOf(layoutConfig.aisleAfterSeat) }
    var layoutSavedFeedback by remember { mutableStateOf(false) }

    val totalRevenue = bookings.sumOf { it.totalAmount }
    val totalTicketsSold = bookings.sumOf { it.ticketCount }
    val checkedInCount = bookings.count { it.isCheckedIn }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(CinemaBg)
            .testTag("admin_control_center_screen"),
        contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 90.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Top Header
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
                            Text(text = "👑 ", fontSize = 20.sp)
                            Text(
                                text = "Kalpkrut Control Center",
                                color = GoldBright,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Black
                            )
                        }
                        Text(
                            text = if (language == AppLanguage.MARATHI)
                                "तिकीटघर कंपनी ॲडमिन व ऑपरेशन्स सिस्टीम"
                            else
                                "TicketGhar Enterprise Operations & Security",
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp
                        )
                    }

                    Surface(
                        color = TheatricalCrimson,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = "ADMIN ACTIVE",
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }
        }

        // Sub-navigation Tab Row
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                AdminSubSection.values().forEach { section ->
                    val isSelected = activeSubSection == section
                    val label = when (section) {
                        AdminSubSection.ANALYTICS -> if (language == AppLanguage.MARATHI) "अ‍ॅनालिटिक्स" else "Analytics"
                        AdminSubSection.SEATING_DESIGNER -> if (language == AppLanguage.MARATHI) "आसन लेआउट" else "Seating Designer"
                        AdminSubSection.BROADCAST_ALERTS -> if (language == AppLanguage.MARATHI) "पुश सूचना" else "Push Alerts"
                        AdminSubSection.AUDIT_LOGS -> if (language == AppLanguage.MARATHI) "ऑडिट लॉग्स" else "Audit Logs"
                    }

                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .clickable { activeSubSection = section }
                            .testTag("admin_tab_${section.name}"),
                        color = if (isSelected) TheatricalCrimson else Color(0xFF1E293B),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(
                            text = label,
                            fontSize = 10.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = Color.White,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            modifier = Modifier.padding(vertical = 10.dp, horizontal = 2.dp)
                        )
                    }
                }
            }
        }

        // SUBSECTION 1: ANALYTICS
        if (activeSubSection == AdminSubSection.ANALYTICS) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = if (language == AppLanguage.MARATHI) "📊 कंपनी व्यवसाय मेट्रिक्स" else "📊 Platform Performance Analytics",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )

                    // 4 Metric KPI Cards Grid
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        MetricKpiCard(
                            title = if (language == AppLanguage.MARATHI) "एकूण कमाई" else "Gross Revenue",
                            value = "₹$totalRevenue",
                            trend = "+18.4% vs last week",
                            color = GoldAccent,
                            modifier = Modifier.weight(1f)
                        )
                        MetricKpiCard(
                            title = if (language == AppLanguage.MARATHI) "तिकिटे विक्री" else "Tickets Sold",
                            value = "$totalTicketsSold",
                            trend = "+12% attendance",
                            color = Color(0xFF38BDF8),
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        MetricKpiCard(
                            title = if (language == AppLanguage.MARATHI) "गेट प्रवेश झालेले" else "Gate Checked-In",
                            value = "$checkedInCount",
                            trend = "QR Validated",
                            color = SuccessEmerald,
                            modifier = Modifier.weight(1f)
                        )
                        MetricKpiCard(
                            title = if (language == AppLanguage.MARATHI) "सक्रिय नाट्यप्रयोग" else "Live Events",
                            value = "${events.size}",
                            trend = "3 Venues Active",
                            color = TheatricalCrimsonLight,
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Event Attendance Breakdown Table
                    Card(
                        colors = CardDefaults.cardColors(containerColor = CinemaSurface),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = if (language == AppLanguage.MARATHI) "नाट्यप्रयोग व आसन भारमान (Occupancy %)" else "Event Occupancy & Show Tracking",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            events.forEach { evt ->
                                val occupancy = (65..95).random()
                                Column(modifier = Modifier.padding(vertical = 6.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(text = evt.titleMr, fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.SemiBold)
                                        Text(text = "$occupancy% Occupancy", fontSize = 11.sp, color = GoldBright, fontWeight = FontWeight.Bold)
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    LinearProgressIndicator(
                                        progress = { occupancy / 100f },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(6.dp)
                                            .clip(RoundedCornerShape(3.dp)),
                                        color = if (occupancy > 80) TheatricalCrimson else GoldAccent,
                                        trackColor = Color(0xFF1E293B)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // SUBSECTION 2: SEATING CHART LAYOUT DESIGNER
        if (activeSubSection == AdminSubSection.SEATING_DESIGNER) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = CinemaSurface),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(text = "📐 ", fontSize = 18.sp)
                            Column {
                                Text(
                                    text = if (language == AppLanguage.MARATHI) "नाट्यगृह आसन लेआउट डिझायनर" else "Auditorium Seating Chart Designer",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    text = if (language == AppLanguage.MARATHI) "ओळी, जागा व पॅसेजचे लवचिक कॉन्फिगरेशन" else "Configure rows, seat density & aisle gaps",
                                    fontSize = 11.sp,
                                    color = Color(0xFF94A3B8)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Controls: Rows
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "${if (language == AppLanguage.MARATHI) "ओळींची संख्या (Rows)" else "Number of Rows"}: $designerRowsCount",
                                fontSize = 12.sp,
                                color = Color.White
                            )
                            Row {
                                IconButton(
                                    onClick = { if (designerRowsCount > 4) designerRowsCount-- },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(imageVector = Icons.Default.RemoveCircle, contentDescription = "-", tint = Color.LightGray)
                                }
                                IconButton(
                                    onClick = { if (designerRowsCount < 12) designerRowsCount++ },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(imageVector = Icons.Default.AddCircle, contentDescription = "+", tint = GoldAccent)
                                }
                            }
                        }

                        // Controls: Seats Per Row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "${if (language == AppLanguage.MARATHI) "प्रति ओळ जागा (Seats / Row)" else "Seats Per Row"}: $designerSeatsPerRow",
                                fontSize = 12.sp,
                                color = Color.White
                            )
                            Row {
                                IconButton(
                                    onClick = { if (designerSeatsPerRow > 6) designerSeatsPerRow -= 2 },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(imageVector = Icons.Default.RemoveCircle, contentDescription = "-", tint = Color.LightGray)
                                }
                                IconButton(
                                    onClick = { if (designerSeatsPerRow < 16) designerSeatsPerRow += 2 },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(imageVector = Icons.Default.AddCircle, contentDescription = "+", tint = GoldAccent)
                                }
                            }
                        }

                        // Controls: Aisle position
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "${if (language == AppLanguage.MARATHI) "पॅसेज / मार्ग स्थान (Aisle Gap)" else "Aisle Offset"}: After Seat $designerAisleOffset",
                                fontSize = 12.sp,
                                color = Color.White
                            )
                            Row {
                                IconButton(
                                    onClick = { if (designerAisleOffset > 2) designerAisleOffset-- },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(imageVector = Icons.Default.RemoveCircle, contentDescription = "-", tint = Color.LightGray)
                                }
                                IconButton(
                                    onClick = { if (designerAisleOffset < designerSeatsPerRow - 2) designerAisleOffset++ },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(imageVector = Icons.Default.AddCircle, contentDescription = "+", tint = GoldAccent)
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Live Mini-Preview of Layout
                        Surface(
                            color = Color(0xFF0F1420),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(10.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = "🎭 STAGE / SCREEN PREVIEW",
                                    fontSize = 9.sp,
                                    color = GoldAccent,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                val rowNames = ('A' until ('A' + designerRowsCount)).map { it.toString() }
                                rowNames.take(4).forEach { r ->
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(3.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(text = r, fontSize = 8.sp, color = Color.Gray)
                                        for (s in 1..designerSeatsPerRow) {
                                            if (s == designerAisleOffset + 1) {
                                                Spacer(modifier = Modifier.width(6.dp))
                                            }
                                            Box(
                                                modifier = Modifier
                                                    .size(10.dp)
                                                    .background(GoldAccent.copy(alpha = 0.6f), RoundedCornerShape(2.dp))
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Save Configuration Button
                        Button(
                            onClick = {
                                val generatedRows = ('A' until ('A' + designerRowsCount)).map { it.toString() }
                                viewModel.updateSeatingLayout(
                                    SeatLayoutConfig(
                                        rows = generatedRows,
                                        seatsPerRow = designerSeatsPerRow,
                                        aisleAfterSeat = designerAisleOffset
                                    )
                                )
                                layoutSavedFeedback = true
                            },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = GoldAccent),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("save_layout_config_btn")
                        ) {
                            Text(
                                text = if (language == AppLanguage.MARATHI) "नवीन आसन लेआउट सेव्ह करा 🎭" else "Save & Apply Auditorium Layout 🎭",
                                color = Color.Black,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }

                        if (layoutSavedFeedback) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "✅ Seating Layout Updated & Audit Logged!",
                                color = SuccessEmerald,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }

        // SUBSECTION 3: BROADCAST ALERTS
        if (activeSubSection == AdminSubSection.BROADCAST_ALERTS) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = CinemaSurface),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(text = "📢 ", fontSize = 18.sp)
                            Column {
                                Text(
                                    text = if (language == AppLanguage.MARATHI) "तातडीची पुश सूचना पाठवा" else "Broadcast Real-Time Push Alert",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    text = if (language == AppLanguage.MARATHI) "सर्व प्रेक्षक व नाट्यगृह कर्मचाऱ्यांना त्वरित संदेश" else "Urgent event updates & gate announcements",
                                    fontSize = 11.sp,
                                    color = Color(0xFF94A3B8)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        OutlinedTextField(
                            value = alertTitle,
                            onValueChange = { alertTitle = it },
                            label = { Text(if (language == AppLanguage.MARATHI) "सूचनेचे शीर्षक" else "Alert Title") },
                            placeholder = { Text("उदा. नाट्यप्रयोग १५ मिनिटे उशिराने सुरू होईल") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("alert_title_input"),
                            shape = RoundedCornerShape(10.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = GoldAccent,
                                unfocusedBorderColor = Color(0xFF334155),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            )
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        OutlinedTextField(
                            value = alertMessage,
                            onValueChange = { alertMessage = it },
                            label = { Text(if (language == AppLanguage.MARATHI) "सविस्तर संदेश" else "Message Body") },
                            placeholder = { Text("Enter detailed broadcast information...") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(90.dp)
                                .testTag("alert_message_input"),
                            shape = RoundedCornerShape(10.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = GoldAccent,
                                unfocusedBorderColor = Color(0xFF334155),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            )
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Checkbox(
                                checked = alertIsUrgent,
                                onCheckedChange = { alertIsUrgent = it },
                                colors = CheckboxDefaults.colors(checkedColor = TheatricalCrimson)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (language == AppLanguage.MARATHI) "तातडीची सूचना (Urgent Notification Banner)" else "Mark as Urgent (Triggers Device Sound)",
                                fontSize = 12.sp,
                                color = Color.White
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        Button(
                            onClick = {
                                if (alertTitle.isNotBlank() && alertMessage.isNotBlank()) {
                                    viewModel.broadcastUrgentAlert(alertTitle, alertMessage, alertIsUrgent)
                                    broadcastSuccess = true
                                    alertTitle = ""
                                    alertMessage = ""
                                }
                            },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = TheatricalCrimson),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("send_broadcast_btn")
                        ) {
                            Text(
                                text = if (language == AppLanguage.MARATHI) "सर्व उपकरणांवर सूचना पाठवा 📢" else "Broadcast Real-Time Alert 📢",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }

                        if (broadcastSuccess) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "✅ Broadcast Alert Dispatched Successfully!",
                                color = SuccessEmerald,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }

        // SUBSECTION 4: IMMUTABLE AUDIT LOGS
        if (activeSubSection == AdminSubSection.AUDIT_LOGS) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = if (language == AppLanguage.MARATHI) "🔒 कंपनी सुरक्षा आणि ऑडिट लॉग्स" else "🔒 Company Security & Audit Ledger",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = if (language == AppLanguage.MARATHI) "आर्थिक व तिकीट बदलांची अपरिवर्तनीय नोंद" else "Immutable tamper-evident record of actions",
                            fontSize = 11.sp,
                            color = Color(0xFF94A3B8)
                        )
                    }

                    Surface(
                        color = Color(0xFF1E293B),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = "${auditLogs.size} logs",
                            fontSize = 10.sp,
                            color = GoldAccent,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            items(auditLogs) { log ->
                AuditLogItemCard(log = log)
            }
        }
    }
}

@Composable
private fun MetricKpiCard(
    title: String,
    value: String,
    trend: String,
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
            Text(text = value, fontSize = 20.sp, fontWeight = FontWeight.Black, color = color)
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = trend, fontSize = 10.sp, color = SuccessEmerald, fontWeight = FontWeight.Medium)
        }
    }
}

@Composable
private fun AuditLogItemCard(log: AuditLog) {
    val dateStr = remember(log.timestamp) {
        SimpleDateFormat("dd MMM yyyy, hh:mm:ss a", Locale.getDefault()).format(Date(log.timestamp))
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF131A29))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = TheatricalCrimson.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = log.actionType,
                        color = TheatricalCrimsonLight,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }

                Text(
                    text = dateStr,
                    fontSize = 9.sp,
                    color = Color(0xFF64748B)
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = log.details,
                fontSize = 12.sp,
                color = Color.White
            )

            Spacer(modifier = Modifier.height(4.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Actor: ${log.actorEmail} (${log.actorRole.name})",
                    fontSize = 10.sp,
                    color = Color(0xFF94A3B8)
                )
                Text(
                    text = "Target: ${log.resourceTarget}",
                    fontSize = 10.sp,
                    color = GoldAccent
                )
            }
        }
    }
}

