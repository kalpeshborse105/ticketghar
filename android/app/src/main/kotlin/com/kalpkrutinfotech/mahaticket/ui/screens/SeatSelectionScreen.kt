package com.kalpkrutinfotech.mahaticket.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.kalpkrutinfotech.mahaticket.MahaTicketApp
import com.kalpkrutinfotech.mahaticket.model.SeatItem
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.BookingViewModel
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.BookingViewModelFactory
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.SeatsUiState
import kotlinx.coroutines.delay
import kotlin.time.Duration.Companion.seconds

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SeatSelectionScreen(
    sessionId: Int,
    onNavigateBack: () -> Unit,
    onContinueToCheckout: (String) -> Unit
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as MahaTicketApp
    val bookingViewModel: BookingViewModel = viewModel(
        factory = BookingViewModelFactory(app.bookingRepository, app.networkMonitor)
    )

    LaunchedEffect(sessionId) {
        bookingViewModel.loadSeats(sessionId)
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

    Scaffold(
        topBar = {
            Column(modifier = Modifier.background(MaterialTheme.colorScheme.surface)) {
                TopAppBar(
                    title = {
                        Column {
                            Text(
                                "जागा निवडा (Select Seats)",
                                fontSize = 17.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            if (timeRemaining != null) {
                                val minutes = timeRemaining!! / 60
                                val seconds = timeRemaining!! % 60
                                Text(
                                    text = "जागा आरक्षित वेळ: %02d:%02d".format(minutes, seconds),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (timeRemaining!! < 120) MahaError else Color(0xFFEA580C)
                                )
                            } else {
                                Text(
                                    text = "कमाल ५ जागा एका वेळी निवडता येतील",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = {
                            bookingViewModel.releaseHold()
                            onNavigateBack()
                        }) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                tint = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    )
                )

                // Hold timer progress bar
                if (timeRemaining != null) {
                    val progress = (timeRemaining!!.toFloat() / 480f).coerceIn(0f, 1f)
                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(3.dp),
                        color = if (timeRemaining!! < 120) MahaError else Color(0xFFEA580C),
                        trackColor = Color(0xFFFFF7ED)
                    )
                }
            }
        },
        bottomBar = {
            AnimatedVisibility(
                visible = selectedSeats.isNotEmpty(),
                enter = slideInVertically(initialOffsetY = { it }, animationSpec = tween(220)) + fadeIn(tween(220)),
                exit = slideOutVertically(targetOffsetY = { it }, animationSpec = tween(180)) + fadeOut(tween(180))
            ) {
                ModernSeatSelectionBottomBar(
                    selectedSeats = selectedSeats,
                    onContinue = {
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
                    },
                    isHolding = holdResponse != null,
                    onProceedToCheckout = {
                        val token = (holdResponse?.holdToken ?: holdResponse?.hold?.holdToken)?.takeIf { it.isNotBlank() }
                            ?: "hold_${sessionId}_${System.currentTimeMillis()}"
                        onContinueToCheckout(token)
                    }
                )
            }
        }
    ) { paddingValues ->
        when (val state = seatsState) {
            is SeatsUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = Color(0xFFEA580C))
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            "सभागृह आसन व्यवस्था लोड होत आहे...",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
            is SeatsUiState.Success -> {
                ModernSeatSelectionContent(
                    seats = state.seats,
                    selectedSeats = selectedSeats,
                    onSeatClick = { seat ->
                        if (holdResponse == null) {
                            bookingViewModel.toggleSeatSelection(seat)
                        }
                    },
                    modifier = Modifier.padding(paddingValues)
                )
            }
            is SeatsUiState.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.EventBusy,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(state.message, color = MaterialTheme.colorScheme.onSurface)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { bookingViewModel.loadSeats(sessionId) },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C))
                        ) {
                            Text("पुन्हा लोड करा", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ModernSeatSelectionContent(
    seats: List<SeatItem>,
    selectedSeats: List<SeatItem>,
    onSeatClick: (SeatItem) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Curved Screen / Stage Indicator
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.8f)
                        .height(6.dp)
                        .clip(RoundedCornerShape(topStart = 100.dp, topEnd = 100.dp))
                        .background(
                            Brush.horizontalGradient(
                                listOf(
                                    Color(0xFFEA580C).copy(alpha = 0.2f),
                                    Color(0xFFEA580C),
                                    Color(0xFFEA580C).copy(alpha = 0.2f)
                                )
                            )
                        )
                )
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        Icons.Default.TheaterComedy,
                        contentDescription = null,
                        tint = Color(0xFFEA580C),
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = "रंगमंच / पडदा (STAGE / SCREEN)",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFEA580C),
                        letterSpacing = 1.sp
                    )
                }
            }
        }

        // Color-Coded Seat Status Legend
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, Color(0xFFE5E7EB))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    ModernLegendItem(label = "उपलब्ध", bgColor = Color.White, borderColor = Color(0xFFD1D5DB))
                    ModernLegendItem(label = "निवडलेले", bgColor = Color(0xFFEA580C), borderColor = Color(0xFFEA580C))
                    ModernLegendItem(label = "बुक झाले", bgColor = Color(0xFFE5E7EB), borderColor = Color(0xFFE5E7EB))
                }
            }
        }

        // Group seats by section and row
        val groupedSeats = seats.groupBy { it.sectionId to it.rowLabel }

        items(groupedSeats.keys.toList()) { (sectionId, rowLabel) ->
            val rowSeats = groupedSeats[sectionId to rowLabel] ?: emptyList()
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Row Label
                Box(
                    modifier = Modifier
                        .width(28.dp)
                        .height(34.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = rowLabel,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Spacer(modifier = Modifier.width(6.dp))

                // Seats in this row
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    items(rowSeats) { seat ->
                        ModernSeatBox(
                            seat = seat,
                            isSelected = selectedSeats.any { it.seatId == seat.seatId },
                            onSeatClick = { onSeatClick(seat) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ModernLegendItem(label: String, bgColor: Color, borderColor: Color) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Box(
            modifier = Modifier
                .size(18.dp)
                .background(bgColor, RoundedCornerShape(4.dp))
                .border(1.dp, borderColor, RoundedCornerShape(4.dp))
        )
        Text(
            text = label,
            fontSize = 11.sp,
            color = MaterialTheme.colorScheme.onSurface,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
fun ModernSeatBox(
    seat: SeatItem,
    isSelected: Boolean,
    onSeatClick: () -> Unit
) {
    val isBooked = seat.status == "booked" || seat.status == "held" || seat.status == "blocked"

    val backgroundColor = when {
        isSelected -> Color(0xFFEA580C)
        isBooked -> Color(0xFFE5E7EB)
        else -> Color.White
    }

    val borderColor = when {
        isSelected -> Color(0xFFEA580C)
        isBooked -> Color(0xFFE5E7EB)
        else -> Color(0xFFD1D5DB)
    }

    val textColor = when {
        isSelected -> Color.White
        isBooked -> Color(0xFF9CA3AF)
        else -> Color(0xFF111827)
    }

    val scale by animateFloatAsState(
        targetValue = if (isSelected) 1.12f else 1.0f,
        animationSpec = tween(durationMillis = 150),
        label = "seatScale"
    )

    Box(
        modifier = Modifier
            .size(36.dp)
            .scale(scale)
            .background(backgroundColor, RoundedCornerShape(6.dp))
            .border(1.dp, borderColor, RoundedCornerShape(6.dp))
            .clickable(enabled = !isBooked) { onSeatClick() },
        contentAlignment = Alignment.Center
    ) {
        if (seat.isAccessible) {
            Icon(
                Icons.Default.Accessible,
                contentDescription = "Accessible",
                modifier = Modifier.size(14.dp),
                tint = textColor
            )
        } else {
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
fun ModernSeatSelectionBottomBar(
    selectedSeats: List<SeatItem>,
    onContinue: () -> Unit,
    isHolding: Boolean,
    onProceedToCheckout: () -> Unit
) {
    val totalPrice = selectedSeats.sumOf { it.price }
    val seatCodes = selectedSeats.joinToString(", ") { it.seatCode }

    Surface(
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 8.dp,
        border = BorderStroke(1.dp, Color(0xFFE5E7EB))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "${selectedSeats.size} जागा निवडल्या ($seatCodes)",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1
                )
                Text(
                    text = "₹${totalPrice / 100}",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Black,
                    color = Color(0xFFEA580C)
                )
            }

            Button(
                onClick = if (isHolding) onProceedToCheckout else onContinue,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)),
                shape = RoundedCornerShape(10.dp),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp)
            ) {
                Text(
                    text = if (isHolding) "चेकआउट करा" else "सुरू ठेवा",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Spacer(modifier = Modifier.width(4.dp))
                Icon(
                    Icons.Default.ArrowForward,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = Color.White
                )
            }
        }
    }
}
