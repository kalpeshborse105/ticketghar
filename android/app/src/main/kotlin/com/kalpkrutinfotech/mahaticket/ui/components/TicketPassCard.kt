package com.kalpkrutinfotech.mahaticket.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kalpkrutinfotech.mahaticket.model.Booking
import com.kalpkrutinfotech.mahaticket.theme.*

@Composable
fun TicketPassCard(
    booking: Booking,
    language: AppLanguage = AppLanguage.MARATHI,
    onShareClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("ticket_pass_card_${booking.bookingId}"),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = BorderStroke(1.dp, MahaBorder)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Ticket Header Banner (Stitch Saffron Gradient)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(MahaOrange, MahaOrangeDeep)
                        )
                    )
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = "🎭 ", fontSize = 18.sp)
                        Column {
                            Text(
                                text = "महाटिकिट • डिजिटल पास",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.5.sp
                            )
                            Text(
                                text = "अधिकृत प्रवेश पत्रिका (M-Ticket)",
                                color = Color.White.copy(alpha = 0.85f),
                                fontSize = 10.sp
                            )
                        }
                    }

                    // Booking ID Pill
                    Surface(
                        color = Color.White.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = "#${booking.bookingId}",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.5.sp,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            // Event Details Section
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = if (language == AppLanguage.MARATHI) booking.eventTitleMr else booking.eventTitleEn,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                if (language == AppLanguage.MARATHI && booking.eventTitleEn.isNotBlank()) {
                    Text(
                        text = booking.eventTitleEn,
                        fontSize = 11.5.sp,
                        color = TextSecondary,
                        modifier = Modifier.padding(top = 1.dp)
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Venue & Address
                Text(
                    text = "🏛️ ${booking.venueName}",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MahaOrangeDeep
                )
                if (booking.venueAddress.isNotBlank()) {
                    Text(
                        text = booking.venueAddress,
                        fontSize = 11.sp,
                        color = TextSecondary,
                        lineHeight = 15.sp,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Date, Time & Seats Grid
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text(
                            text = if (language == AppLanguage.MARATHI) "तारीख व वेळ" else "Date & Time",
                            fontSize = 10.sp,
                            color = TextSecondary
                        )
                        Text(
                            text = "${booking.showDate}\n${booking.showTime}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = if (language == AppLanguage.MARATHI) "श्रेणी" else "Tier",
                            fontSize = 10.sp,
                            color = TextSecondary
                        )
                        Text(
                            text = if (language == AppLanguage.MARATHI) booking.seatTier.labelMr else booking.seatTier.labelEn,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = if (language == AppLanguage.MARATHI) "जागा क्रमांक" else "Seat Numbers",
                            fontSize = 10.sp,
                            color = TextSecondary
                        )
                        Surface(
                            color = MahaWarm,
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = booking.seatIds.joinToString(", "),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = MahaOrangeDeep,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }

            // Perforation Tear-Off Line with Notches
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(20.dp),
                contentAlignment = Alignment.Center
            ) {
                Canvas(modifier = Modifier.fillMaxWidth()) {
                    val pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f)
                    drawLine(
                        color = Color(0xFFCBD5E1),
                        start = Offset(0f, size.height / 2),
                        end = Offset(size.width, size.height / 2),
                        strokeWidth = 1.5f,
                        pathEffect = pathEffect
                    )
                }
            }

            // QR Code Section & Gate Entry
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 16.dp, end = 16.dp, bottom = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Visual QR Box
                Box(
                    modifier = Modifier
                        .size(130.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0xFFF8FAFC))
                        .padding(8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    SimulatedQrGraphic(seed = booking.bookingId)
                }

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = if (language == AppLanguage.MARATHI) "प्रवेशद्वारावर स्कॅन करण्यासाठी हा QR दाखवा" else "Scan QR Code at Venue Gate",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextSecondary,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Check-in Status Badge
                if (booking.isCheckedIn) {
                    Surface(
                        color = Color(0xFFDCFCE7),
                        shape = RoundedCornerShape(6.dp),
                        border = BorderStroke(1.dp, Color(0xFF86EFAC))
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = "Checked In",
                                tint = Color(0xFF16A34A),
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (language == AppLanguage.MARATHI) "प्रवेश पडताळणी पूर्ण" else "Gate Entry Verified",
                                color = Color(0xFF16A34A),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                } else {
                    Surface(
                        color = MahaWarm,
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = if (language == AppLanguage.MARATHI) "✓ अधिकृत प्रवेश पत्रिका" else "Valid Official Pass",
                            color = MahaOrangeDeep,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Share / Save Button
                OutlinedButton(
                    onClick = onShareClick,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("share_ticket_button"),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MahaOrange),
                    border = BorderStroke(1.dp, MahaBorder)
                ) {
                    Icon(
                        imageVector = Icons.Default.Share,
                        contentDescription = "Share",
                        modifier = Modifier.size(16.dp),
                        tint = MahaOrange
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (language == AppLanguage.MARATHI) "तिकीट शेअर करा" else "Share Pass",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MahaOrange
                    )
                }
            }
        }
    }
}

@Composable
fun SimulatedQrGraphic(seed: String) {
    Canvas(modifier = Modifier.fillMaxSize()) {
        val gridSize = 13
        val cellSize = size.width / gridSize
        val hash = seed.hashCode()

        // Corner locator boxes
        // Top-left
        drawRect(Color(0xFF1E293B), Offset(0f, 0f), Size(cellSize * 3, cellSize * 3))
        drawRect(Color(0xFFF8FAFC), Offset(cellSize * 0.6f, cellSize * 0.6f), Size(cellSize * 1.8f, cellSize * 1.8f))
        drawRect(Color(0xFF1E293B), Offset(cellSize * 1f, cellSize * 1f), Size(cellSize * 1f, cellSize * 1f))

        // Top-right
        drawRect(Color(0xFF1E293B), Offset((gridSize - 3) * cellSize, 0f), Size(cellSize * 3, cellSize * 3))
        drawRect(Color(0xFFF8FAFC), Offset((gridSize - 2.4f) * cellSize, cellSize * 0.6f), Size(cellSize * 1.8f, cellSize * 1.8f))
        drawRect(Color(0xFF1E293B), Offset((gridSize - 2f) * cellSize, cellSize * 1f), Size(cellSize * 1f, cellSize * 1f))

        // Bottom-left
        drawRect(Color(0xFF1E293B), Offset(0f, (gridSize - 3) * cellSize), Size(cellSize * 3, cellSize * 3))
        drawRect(Color(0xFFF8FAFC), Offset(cellSize * 0.6f, (gridSize - 2.4f) * cellSize), Size(cellSize * 1.8f, cellSize * 1.8f))
        drawRect(Color(0xFF1E293B), Offset(cellSize * 1f, (gridSize - 2f) * cellSize), Size(cellSize * 1f, cellSize * 1f))

        // Deterministic pseudo-random pattern based on seed
        for (r in 0 until gridSize) {
            for (c in 0 until gridSize) {
                val isCorner = (r < 3 && c < 3) || (r < 3 && c >= gridSize - 3) || (r >= gridSize - 3 && c < 3)
                if (!isCorner) {
                    val bit = ((hash xor (r * 31 + c * 17)) and 1) == 1
                    if (bit) {
                        drawRect(
                            Color(0xFF1E293B),
                            Offset(c * cellSize, r * cellSize),
                            Size(cellSize * 0.9f, cellSize * 0.9f)
                        )
                    }
                }
            }
        }
    }
}
