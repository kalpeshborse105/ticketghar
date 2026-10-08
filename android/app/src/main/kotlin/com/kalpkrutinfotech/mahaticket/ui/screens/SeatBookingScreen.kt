package com.kalpkrutinfotech.mahaticket.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kalpkrutinfotech.mahaticket.model.Event
import com.kalpkrutinfotech.mahaticket.model.Showtime
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.TicketGharViewModel
import com.kalpkrutinfotech.mahaticket.ui.components.SeatSelectionMap
import com.kalpkrutinfotech.mahaticket.theme.*

@Composable
fun SeatBookingScreen(
    event: Event,
    showtime: Showtime,
    viewModel: TicketGharViewModel,
    onBackClick: () -> Unit,
    onProceedToCheckout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val language by viewModel.language.collectAsState()
    val seats by viewModel.currentSeats.collectAsState()
    val selectedSeats by viewModel.selectedSeats.collectAsState()
    val remainingSeconds by viewModel.seatHoldSeconds.collectAsState()

    val totalBasePrice = selectedSeats.sumOf { it.price }
    val convFee = selectedSeats.size * 35
    val gst = (convFee * 18) / 100
    val totalWithTaxes = totalBasePrice + convFee + gst

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(CinemaBg)
            .testTag("seat_booking_screen")
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 110.dp)
        ) {
            // Header Bar
            item {
                Surface(
                    color = CinemaSurface,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = onBackClick,
                            modifier = Modifier.testTag("seat_booking_back_button")
                        ) {
                            Icon(
                                imageVector = Icons.Default.ArrowBack,
                                contentDescription = "Back",
                                tint = Color.White
                            )
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = if (language == AppLanguage.MARATHI) event.titleMr else event.titleEn,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "${showtime.venueName} • ${showtime.dateText}",
                                fontSize = 11.sp,
                                color = GoldAccent
                            )
                        }
                    }
                }
            }

            // Interactive Seat Map & Orientation Canvas
            item {
                SeatSelectionMap(
                    language = language,
                    seats = seats,
                    selectedSeats = selectedSeats,
                    remainingSeconds = remainingSeconds,
                    onSeatClick = { seatId -> viewModel.toggleSeat(seatId) },
                    onGroupSelect = { count -> viewModel.autoSelectGroup(count) },
                    modifier = Modifier.padding(top = 10.dp)
                )
            }
        }

        // Sticky Bottom Price & Checkout Bar
        Surface(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth(),
            color = Color(0xFF131A29),
            tonalElevation = 10.dp,
            shadowElevation = 16.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp)
            ) {
                if (selectedSeats.isNotEmpty()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "${selectedSeats.size} ${if (language == AppLanguage.MARATHI) "जागा निवडल्या:" else "Seats Selected:"} ${selectedSeats.map { it.id }.joinToString(", ")}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = GoldAccent
                            )
                            Text(
                                text = if (language == AppLanguage.MARATHI)
                                    "एकूण: ₹$totalWithTaxes (शुल्क व GST सह)"
                                else
                                    "Total: ₹$totalWithTaxes (incl. conv. fee + GST)",
                                fontSize = 11.sp,
                                color = Color(0xFF94A3B8)
                            )
                        }

                        Button(
                            onClick = onProceedToCheckout,
                            enabled = selectedSeats.isNotEmpty(),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = GoldAccent),
                            modifier = Modifier
                                .height(46.dp)
                                .testTag("proceed_to_checkout_button")
                        ) {
                            Text(
                                text = if (language == AppLanguage.MARATHI) "तिकीट बुक करा 🎭" else "Book ₹$totalWithTaxes 🎭",
                                color = Color.Black,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                } else {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (language == AppLanguage.MARATHI)
                                "कृपया पुढे जाण्यासाठी वरील नकाशातून जागा निवडा"
                            else
                                "Please select seat(s) on the map to proceed",
                            fontSize = 12.sp,
                            color = Color(0xFF94A3B8)
                        )

                        Surface(
                            color = Color(0xFF1E293B),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = "₹${event.basePrice}+",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = GoldBright,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

