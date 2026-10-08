package com.kalpkrutinfotech.mahaticket.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import com.kalpkrutinfotech.mahaticket.model.SeatItem
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.components.TheaterLoaderCard
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.BookingViewModel
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.SeatsUiState
import kotlinx.coroutines.delay
import kotlin.time.Duration.Companion.seconds

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SeatSelectionScreen(
    sessionId: Int,
    eventId: Int = 1,
    bookingViewModel: BookingViewModel,
    onNavigateBack: () -> Unit,
    onContinueToCheckout: (String) -> Unit
) {
    LaunchedEffect(sessionId, eventId) {
        bookingViewModel.loadSeats(sessionId, eventId)
    }

    val seatsState by bookingViewModel.seatsState.collectAsState()
    val selectedSeats by bookingViewModel.selectedSeats.collectAsState()
    val holdResponse by bookingViewModel.holdResponse.collectAsState()

    // Countdown timer for 8-10 minutes hold
    var timeRemaining by remember { mutableStateOf<Int?>(null) }

    LaunchedEffect(holdResponse) {
        holdResponse?.let {
            timeRemaining = 480 // 8 minutes
            while (timeRemaining != null && timeRemaining!! > 0) {
                delay(1.seconds)
                timeRemaining = timeRemaining!! - 1
            }
            if (timeRemaining == 0) {
                bookingViewModel.releaseHold()
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(CinemaBg)
            .testTag("seat_selection_screen")
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header Bar
            Surface(
                color = CinemaSurface,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = {
                                bookingViewModel.releaseHold()
                                onNavigateBack()
                            },
                            modifier = Modifier.testTag("seat_selection_back_btn")
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                tint = Color.White
                            )
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "जागा निवडा (Select Seats)",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            if (timeRemaining != null) {
                                val minutes = timeRemaining!! / 60
                                val seconds = timeRemaining!! % 60
                                Text(
                                    text = "जागा आरक्षित वेळ: %02d:%02d".format(minutes, seconds),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (timeRemaining!! < 120) TheatricalCrimsonLight else GoldAccent
                                )
                            } else {
                                Text(
                                    text = "कमाल ५ जागा एका वेळी निवडता येतील",
                                    fontSize = 11.sp,
                                    color = Color(0xFF94A3B8)
                                )
                            }
                        }

                        Surface(
                            color = TheatricalCrimson.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.padding(end = 8.dp)
                        ) {
                            Text(
                                text = "🎭 सभागृह",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = GoldAccent,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }

                    // Hold timer progress bar
                    if (timeRemaining != null) {
                        val progress = (timeRemaining!!.toFloat() / 480f).coerceIn(0f, 1f)
                        LinearProgressIndicator(
                            progress = { progress },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(3.dp),
                            color = if (timeRemaining!! < 120) TheatricalCrimson else GoldAccent,
                            trackColor = Color(0xFF1E293B)
                        )
                    }
                }
            }

            // Main Content Area
            when (val state = seatsState) {
                is SeatsUiState.Loading -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        TheaterLoaderCard(message = "सभागृह आसन व्यवस्था लोड होत आहे...")
                    }
                }
                is SeatsUiState.Success -> {
                    TheatricalSeatGridContent(
                        seats = state.seats,
                        selectedSeats = selectedSeats,
                        onSeatClick = { seat ->
                            if (holdResponse == null) {
                                bookingViewModel.toggleSeatSelection(seat)
                            }
                        },
                        onGroupSelect = { count ->
                            if (holdResponse == null) {
                                val available = state.seats.filter { it.status == "available" }.take(count)
                                available.forEach { bookingViewModel.toggleSeatSelection(it) }
                            }
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
                is SeatsUiState.Error -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(24.dp)
                        ) {
                            Icon(
                                Icons.Default.EventSeat,
                                contentDescription = null,
                                tint = TheatricalCrimson,
                                modifier = Modifier.size(52.dp)
                            )
                            Spacer(modifier = Modifier.height(14.dp))
                            Text(
                                text = "आसन व्यवस्था लोड करण्यात अडचण आली",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = state.message,
                                fontSize = 12.sp,
                                color = Color(0xFF94A3B8),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = { bookingViewModel.loadSeats(sessionId, eventId) },
                                colors = ButtonDefaults.buttonColors(containerColor = TheatricalCrimson),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("पुन्हा लोड करा", fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }
                }
            }
        }

        // Sticky Bottom Checkout Bar
        AnimatedVisibility(
            visible = selectedSeats.isNotEmpty(),
            enter = slideInVertically(initialOffsetY = { it }, animationSpec = tween(220)) + fadeIn(tween(220)),
            exit = slideOutVertically(targetOffsetY = { it }, animationSpec = tween(180)) + fadeOut(tween(180)),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            TheatricalSeatBottomBar(
                selectedSeats = selectedSeats,
                isHolding = holdResponse != null,
                onProceed = {
                    val existingToken = (holdResponse?.holdToken ?: holdResponse?.hold?.holdToken)?.takeIf { it.isNotBlank() }
                    if (existingToken != null) {
                        onContinueToCheckout(existingToken)
                    } else {
                        bookingViewModel.holdSeats(
                            sessionId = sessionId,
                            phoneNumber = "9876543210",
                            onSuccess = { genToken ->
                                val safeToken = genToken.ifBlank { "hold_${sessionId}_${System.currentTimeMillis()}" }
                                onContinueToCheckout(safeToken)
                            },
                            onError = {
                                val fallbackToken = "hold_${sessionId}_${System.currentTimeMillis()}"
                                onContinueToCheckout(fallbackToken)
                            }
                        )
                    }
                }
            )
        }
    }
}

@Composable
private fun TheatricalSeatGridContent(
    seats: List<SeatItem>,
    selectedSeats: List<SeatItem>,
    onSeatClick: (SeatItem) -> Unit,
    onGroupSelect: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val tierGroups = remember(seats) {
        seats.groupBy { it.sectionName ?: "मुख्य सभागृह" }
    }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 110.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Quick Group Select Chips (1..6)
        item {
            Column {
                Text(
                    text = "जलद जागा निवड (Quick Group Booking):",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = GoldAccent
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    (1..6).forEach { count ->
                        Surface(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .clickable { onGroupSelect(count) },
                            color = if (selectedSeats.size == count) TheatricalCrimson else Color(0xFF1E293B),
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, if (selectedSeats.size == count) GoldAccent else Color(0xFF334155))
                        ) {
                            Text(
                                text = "$count जागा",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
            }
        }

        // Auditorium Stage Canvas
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth(0.85f)
                        .height(34.dp),
                    shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
                    color = TheatricalCrimson.copy(alpha = 0.35f),
                    border = BorderStroke(1.5.dp, GoldAccent.copy(alpha = 0.8f))
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "🎭 रंगमंच / स्टेज (STAGE THIS WAY)",
                            color = GoldBright,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.sp
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "सर्व प्रेक्षक या दिशेने पाहतील",
                    color = Color(0xFF94A3B8),
                    fontSize = 10.sp
                )
            }
        }

        // Seat Status Legend
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                LegendIndicator(color = Color(0xFF1E293B), label = "उपलब्ध (Available)", border = Color(0xFF475569))
                LegendIndicator(color = GoldAccent, label = "निवडलेले (Selected)")
                LegendIndicator(color = TheatricalCrimsonDark, label = "बुक (Booked)")
            }
        }

        // Rows by Tier
        tierGroups.forEach { (tierName, tierSeats) ->
            item(key = tierName) {
                TierSectionView(
                    tierName = tierName,
                    tierSeats = tierSeats,
                    selectedSeats = selectedSeats,
                    onSeatClick = onSeatClick
                )
            }
        }
    }
}

@Composable
private fun TierSectionView(
    tierName: String,
    tierSeats: List<SeatItem>,
    selectedSeats: List<SeatItem>,
    onSeatClick: (SeatItem) -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        // Tier Banner
        Surface(
            color = Color(0xFF131A29),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 6.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "वर्ग: ${tierName.uppercase()}",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black,
                    color = GoldAccent
                )
                val firstPrice = tierSeats.firstOrNull()?.price ?: 0
                Text(
                    text = "₹${firstPrice / 100}",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }

        // Group seats by row
        val rowMap = remember(tierSeats) { tierSeats.groupBy { it.rowLabel } }
        rowMap.forEach { (rowLabel, rowSeats) ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                // Row Label
                Text(
                    text = rowLabel,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = GoldAccent,
                    modifier = Modifier.width(24.dp)
                )

                // Seat Chips
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    rowSeats.forEach { seat ->
                        val isSelected = selectedSeats.any { it.seatId == seat.seatId }
                        val isAvailable = seat.status == "available"

                        TheatricalSeatChip(
                            seat = seat,
                            isSelected = isSelected,
                            isAvailable = isAvailable,
                            onClick = { if (isAvailable) onSeatClick(seat) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TheatricalSeatChip(
    seat: SeatItem,
    isSelected: Boolean,
    isAvailable: Boolean,
    onClick: () -> Unit
) {
    val bgColor = when {
        isSelected -> GoldAccent
        !isAvailable -> TheatricalCrimsonDark.copy(alpha = 0.5f)
        else -> Color(0xFF1E293B)
    }

    val textColor = when {
        isSelected -> Color.Black
        !isAvailable -> Color(0xFF64748B)
        else -> Color.White
    }

    val borderColor = when {
        isSelected -> GoldBright
        !isAvailable -> Color.Transparent
        else -> Color(0xFF334155)
    }

    Surface(
        modifier = Modifier
            .size(34.dp)
            .clip(RoundedCornerShape(6.dp))
            .clickable(enabled = isAvailable) { onClick() }
            .testTag("seat_${seat.seatCode}"),
        color = bgColor,
        shape = RoundedCornerShape(6.dp),
        border = BorderStroke(1.dp, borderColor)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                text = seat.seatNumber.toString(),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = textColor
            )
        }
    }
}

@Composable
private fun LegendIndicator(color: Color, label: String, border: Color? = null) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Surface(
            modifier = Modifier.size(14.dp),
            shape = RoundedCornerShape(3.dp),
            color = color,
            border = border?.let { BorderStroke(1.dp, it) }
        ) {}
        Spacer(modifier = Modifier.width(6.dp))
        Text(text = label, fontSize = 10.sp, color = Color(0xFFCBD5E1))
    }
}

@Composable
private fun TheatricalSeatBottomBar(
    selectedSeats: List<SeatItem>,
    isHolding: Boolean,
    onProceed: () -> Unit
) {
    val totalAmount = selectedSeats.sumOf { it.price } / 100
    val seatCodes = selectedSeats.joinToString(", ") { it.seatCode }

    Surface(
        color = Color(0xFF131A29),
        tonalElevation = 10.dp,
        shadowElevation = 16.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "निवडलेली आसने: $seatCodes",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = GoldAccent
                    )
                    Text(
                        text = "एकूण: ₹$totalAmount (${selectedSeats.size} जागा)",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                }

                Button(
                    onClick = onProceed,
                    colors = ButtonDefaults.buttonColors(containerColor = TheatricalCrimson),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.testTag("seat_proceed_btn")
                ) {
                    Text(
                        text = if (isHolding) "चेकआउटकडे जा →" else "पुढे जा (Hold & Pay) 🎭",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
    }
}
