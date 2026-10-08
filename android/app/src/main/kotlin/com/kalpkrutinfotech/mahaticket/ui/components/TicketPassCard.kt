package com.kalpkrutinfotech.mahaticket.ui.components

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
    language: AppLanguage,
    onShareClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("ticket_pass_card_${booking.bookingId}"),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF131A29)),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Ticket Header Banner
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(TheatricalCrimson)
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
                                text = "MahaTicket • महाटिकिट",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                            Text(
                                text = "Kalpkrut Digital Pass",
                                color = Color(0xFFFFD9E2),
                                fontSize = 10.sp
                            )
                        }
                    }

                    // Booking ID Pill
                    Surface(
                        color = Color.Black.copy(alpha = 0.35f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = "#${booking.bookingId}",
                            color = GoldBright,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            // Event Details Section
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = if (language == AppLanguage.MARATHI) booking.eventTitleMr else booking.eventTitleEn,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )

                if (language == AppLanguage.MARATHI) {
                    Text(
                        text = booking.eventTitleEn,
                        fontSize = 12.sp,
                        color = Color(0xFF94A3B8)
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Venue & Address
                Text(
                    text = "📍 ${booking.venueName}",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = GoldAccent
                )
                Text(
                    text = booking.venueAddress,
                    fontSize = 11.sp,
                    color = Color(0xFF94A3B8),
                    lineHeight = 15.sp
                )

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
                            color = Color(0xFF94A3B8)
                        )
                        Text(
                            text = "${booking.showDate}\n${booking.showTime}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = if (language == AppLanguage.MARATHI) "श्रेणी" else "Tier",
                            fontSize = 10.sp,
                            color = Color(0xFF94A3B8)
                        )
                        Text(
                            text = if (language == AppLanguage.MARATHI) booking.seatTier.labelMr else booking.seatTier.labelEn,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = GoldBright
                        )
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = if (language == AppLanguage.MARATHI) "जागा क्रमांक" else "Seat Numbers",
                            fontSize = 10.sp,
                            color = Color(0xFF94A3B8)
                        )
                        Text(
                            text = booking.seatIds.joinToString(", "),
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Black,
                            color = GoldAccent
                        )
                    }
                }
            }

            // Perforation Tear-Off Line with Notches
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Canvas(modifier = Modifier.fillMaxWidth()) {
                    val pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 12f), 0f)
                    drawLine(
                        color = Color(0xFF334155),
                        start = Offset(0f, size.height / 2),
                        end = Offset(size.width, size.height / 2),
                        strokeWidth = 2f,
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
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color.White)
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
                    color = Color(0xFF94A3B8),
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Check-in Status Badge
                if (booking.isCheckedIn) {
                    Surface(
                        color = SuccessEmerald.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(8.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, SuccessEmerald)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = "Checked In",
                                tint = SuccessEmerald,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (language == AppLanguage.MARATHI) "प्रवेश पडताळणी पूर्ण (Checked-In)" else "Gate Entry Verified",
                                color = SuccessEmerald,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                } else {
                    Surface(
                        color = Color(0xFF1E293B),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = if (language == AppLanguage.MARATHI) "प्रवेश शिल्लक (Valid for Entry)" else "Valid for Entry",
                            color = Color(0xFF38BDF8),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
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
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = GoldAccent),
                    border = androidx.compose.foundation.BorderStroke(1.dp, GoldAccent.copy(alpha = 0.5f))
                ) {
                    Icon(
                        imageVector = Icons.Default.Share,
                        contentDescription = "Share",
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (language == AppLanguage.MARATHI) "तिकीट शेअर करा / सेव्ह करा" else "Share / Download Pass",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
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
        drawRect(Color.Black, Offset(0f, 0f), Size(cellSize * 3, cellSize * 3))
        drawRect(Color.White, Offset(cellSize * 0.6f, cellSize * 0.6f), Size(cellSize * 1.8f, cellSize * 1.8f))
        drawRect(Color.Black, Offset(cellSize * 1f, cellSize * 1f), Size(cellSize * 1f, cellSize * 1f))

        // Top-right
        drawRect(Color.Black, Offset((gridSize - 3) * cellSize, 0f), Size(cellSize * 3, cellSize * 3))
        drawRect(Color.White, Offset((gridSize - 2.4f) * cellSize, cellSize * 0.6f), Size(cellSize * 1.8f, cellSize * 1.8f))
        drawRect(Color.Black, Offset((gridSize - 2f) * cellSize, cellSize * 1f), Size(cellSize * 1f, cellSize * 1f))

        // Bottom-left
        drawRect(Color.Black, Offset(0f, (gridSize - 3) * cellSize), Size(cellSize * 3, cellSize * 3))
        drawRect(Color.White, Offset(cellSize * 0.6f, (gridSize - 2.4f) * cellSize), Size(cellSize * 1.8f, cellSize * 1.8f))
        drawRect(Color.Black, Offset(cellSize * 1f, (gridSize - 2f) * cellSize), Size(cellSize * 1f, cellSize * 1f))

        // Deterministic pseudo-random pattern based on seed
        for (r in 0 until gridSize) {
            for (c in 0 until gridSize) {
                val isCorner = (r < 3 && c < 3) || (r < 3 && c >= gridSize - 3) || (r >= gridSize - 3 && c < 3)
                if (!isCorner) {
                    val bit = ((hash xor (r * 31 + c * 17)) and 1) == 1
                    if (bit) {
                        drawRect(
                            Color.Black,
                            Offset(c * cellSize, r * cellSize),
                            Size(cellSize * 0.9f, cellSize * 0.9f)
                        )
                    }
                }
            }
        }
    }
}
