package com.kalpkrutinfotech.mahaticket.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kalpkrutinfotech.mahaticket.model.Seat
import com.kalpkrutinfotech.mahaticket.model.SeatStatus
import com.kalpkrutinfotech.mahaticket.model.SeatTier
import com.kalpkrutinfotech.mahaticket.theme.*

@Composable
fun SeatSelectionMap(
    language: AppLanguage,
    seats: List<Seat>,
    selectedSeats: List<Seat>,
    remainingSeconds: Int,
    onSeatClick: (String) -> Unit,
    onGroupSelect: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val horizontalScrollState = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxWidth()
            .testTag("seat_selection_map_container")
    ) {
        // Group Booking Quick Selector
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (language == AppLanguage.MARATHI) "👥 गट बुकिंग (जागा निवडा)" else "👥 Quick Group Booking",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = GoldBright
                )

                // 8-min Hold Countdown Timer
                AnimatedVisibility(visible = selectedSeats.isNotEmpty()) {
                    val minutes = remainingSeconds / 60
                    val seconds = remainingSeconds % 60
                    Surface(
                        color = TheatricalCrimson.copy(alpha = 0.25f),
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, TheatricalCrimsonLight)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Timer,
                                contentDescription = "Timer",
                                tint = TheatricalCrimsonLight,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = String.format("%02d:%02d", minutes, seconds),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Group count buttons: 1, 2, 3, 4, 5, 6, 8, 10
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(1, 2, 3, 4, 5, 6, 8, 10).forEach { count ->
                    val isCurrentCount = selectedSeats.size == count
                    Surface(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { onGroupSelect(count) }
                            .testTag("group_select_$count"),
                        color = if (isCurrentCount) GoldAccent else Color(0xFF1E293B),
                        shape = RoundedCornerShape(8.dp),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isCurrentCount) GoldBright else Color(0xFF334155)
                        )
                    ) {
                        Text(
                            text = "$count ${if (language == AppLanguage.MARATHI) "जागा" else "seats"}",
                            fontSize = 11.sp,
                            fontWeight = if (isCurrentCount) FontWeight.Bold else FontWeight.Medium,
                            color = if (isCurrentCount) Color.Black else Color.White,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Screen / Stage Orientation Indicator
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                // Curved Stage Visual
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.9f)
                        .height(10.dp)
                        .background(
                            brush = Brush.horizontalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    TheatricalCrimson,
                                    GoldAccent,
                                    TheatricalCrimson,
                                    Color.Transparent
                                )
                            ),
                            shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)
                        )
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = if (language == AppLanguage.MARATHI) "🎭 रंगमंच / स्टेज (सर्व लक्ष येथे)" else "🎭 AUDITORIUM STAGE / SCREEN",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = GoldAccent,
                    letterSpacing = 1.sp
                )
                Text(
                    text = if (language == AppLanguage.MARATHI) "सर्व प्रेक्षक या दिशेला बसतील" else "All eyes this way",
                    fontSize = 9.sp,
                    color = Color(0xFF94A3B8)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Seat Grid by Row (Scrollable horizontally)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(horizontalScrollState)
                .padding(horizontal = 20.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                val groupedByRow = seats.groupBy { it.row }
                var currentTier: SeatTier? = null

                groupedByRow.forEach { (rowName, rowSeats) ->
                    val rowTier = rowSeats.firstOrNull()?.tier
                    if (rowTier != null && rowTier != currentTier) {
                        currentTier = rowTier
                        // Tier Header Divider
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(1.dp)
                                    .background(Color(0xFF334155))
                            )
                            Text(
                                text = "  ${if (language == AppLanguage.MARATHI) rowTier.labelMr else rowTier.labelEn} - ₹${rowTier.price}  ",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = when (rowTier) {
                                    SeatTier.VIP -> Color(0xFFA78BFA)
                                    SeatTier.BALCONY -> Color(0xFF38BDF8)
                                    SeatTier.EXECUTIVE -> Color(0xFF34D399)
                                    SeatTier.STANDARD -> Color(0xFFFBBF24)
                                }
                            )
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(1.dp)
                                    .background(Color(0xFF334155))
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                    }

                    // Row of seats
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Row Letter Label
                        Text(
                            text = rowName,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF94A3B8),
                            modifier = Modifier.width(20.dp),
                            textAlign = TextAlign.Center
                        )

                        rowSeats.forEach { seat ->
                            // Insert aisle gap
                            if (seat.isAisle) {
                                Spacer(modifier = Modifier.width(14.dp))
                            }

                            SeatItemView(
                                seat = seat,
                                onClick = { onSeatClick(seat.id) }
                            )
                        }

                        // Symmetrical Right Row Letter
                        Text(
                            text = rowName,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF94A3B8),
                            modifier = Modifier.width(20.dp),
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Live Real-Time Availability Badge
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = Color(0xFF064E3B).copy(alpha = 0.7f),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.6f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(Color(0xFF10B981), CircleShape)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (language == AppLanguage.MARATHI)
                            "थेट आसन स्थिती (Real-Time Availability Active)"
                        else
                            "Real-Time Seat Availability Live",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFA7F3D0)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Seat Legend (Green: Available, Red: Booked, Yellow: Selected)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            LegendItem(
                color = Color(0xFF065F46),
                borderColor = Color(0xFF10B981),
                label = if (language == AppLanguage.MARATHI) "उपलब्ध" else "Available"
            )
            LegendItem(
                color = Color(0xFFFACC15),
                borderColor = Color(0xFFFEF08A),
                label = if (language == AppLanguage.MARATHI) "निवडलेली" else "Selected"
            )
            LegendItem(
                color = Color(0xFF991B1B),
                borderColor = Color(0xFFEF4444),
                label = if (language == AppLanguage.MARATHI) "आरक्षित" else "Booked"
            )
            LegendItem(
                color = Color(0xFF4C1D95),
                borderColor = Color(0xFFA78BFA),
                label = "VIP"
            )
        }
    }
}

@Composable
private fun SeatItemView(
    seat: Seat,
    onClick: () -> Unit
) {
    val isSelected = seat.status == SeatStatus.SELECTED
    val isBooked = seat.status == SeatStatus.BOOKED

    val backgroundColor = when {
        isSelected -> Color(0xFFFACC15)
        isBooked -> Color(0xFF7F1D1D)
        seat.tier == SeatTier.VIP -> Color(0xFF4C1D95)
        else -> Color(0xFF064E3B)
    }

    val borderColor = when {
        isSelected -> Color(0xFFFEF08A)
        isBooked -> Color(0xFFDC2626)
        seat.tier == SeatTier.VIP -> Color(0xFFA78BFA)
        else -> Color(0xFF10B981)
    }

    val textColor = when {
        isSelected -> Color.Black
        isBooked -> Color(0xFFFCA5A5)
        else -> Color(0xFFD1FAE5)
    }

    Box(
        modifier = Modifier
            .size(28.dp)
            .clip(RoundedCornerShape(6.dp))
            .background(backgroundColor)
            .border(1.dp, borderColor, RoundedCornerShape(6.dp))
            .clickable(enabled = !isBooked) { onClick() }
            .testTag("seat_${seat.id}"),
        contentAlignment = Alignment.Center
    ) {
        if (isBooked) {
            Text(text = "✕", fontSize = 10.sp, color = textColor, fontWeight = FontWeight.Bold)
        } else if (isSelected) {
            Text(
                text = "${seat.number}",
                fontSize = 11.sp,
                fontWeight = FontWeight.Black,
                color = textColor
            )
        } else {
            Text(
                text = "${seat.number}",
                fontSize = 9.sp,
                fontWeight = FontWeight.SemiBold,
                color = textColor
            )
        }
    }
}

@Composable
private fun LegendItem(
    color: Color,
    borderColor: Color,
    label: String
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(16.dp)
                .background(color, RoundedCornerShape(4.dp))
                .border(1.dp, borderColor, RoundedCornerShape(4.dp))
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(text = label, fontSize = 11.sp, color = Color(0xFF94A3B8))
    }
}
