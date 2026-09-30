package `in`.ticketghar.mahaticket.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccessibleForward
import androidx.compose.material.icons.filled.ChairAlt
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import `in`.ticketghar.mahaticket.MahaTicketApp
import `in`.ticketghar.mahaticket.model.SeatItem
import `in`.ticketghar.mahaticket.theme.*
import `in`.ticketghar.mahaticket.ui.viewmodel.BookingViewModel
import `in`.ticketghar.mahaticket.ui.viewmodel.BookingViewModelFactory
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

    // Countdown timer
    var timeRemaining by remember { mutableStateOf<Int?>(null) }

    LaunchedEffect(holdResponse) {
        holdResponse?.let { hold ->
            // Calculate time remaining from expiresAt
            timeRemaining = 600 // 10 minutes default
            while (timeRemaining != null && timeRemaining!! > 0) {
                delay(1.seconds)
                timeRemaining = timeRemaining!! - 1
            }
            if (timeRemaining == 0) {
                // Release hold, reload seats
                bookingViewModel.releaseHold()
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("आसन निवड", fontSize = 18.sp)
                        if (timeRemaining != null) {
                            Text(
                                text = "वेळ उरली: ${timeRemaining!! / 60}:${String.format("%02d", timeRemaining!! % 60)}",
                                fontSize = 12.sp,
                                color = if (timeRemaining!! < 120) MahaError else MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = {
                        bookingViewModel.releaseHold()
                        onNavigateBack()
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            if (selectedSeats.isNotEmpty()) {
                SeatSelectionBottomBar(
                    selectedSeats = selectedSeats,
                    onContinue = {
                        bookingViewModel.holdSeats(sessionId, "9876543210") // Placeholder phone
                    },
                    isHolding = holdResponse != null,
                    onProceedToCheckout = {
                        holdResponse?.holdToken?.let { token ->
                            onContinueToCheckout(token)
                        }
                    }
                )
            }
        }
    ) { paddingValues ->
        when (val state = seatsState) {
            is `in`.ticketghar.mahaticket.ui.viewmodel.SeatsUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = MahaPrimaryLight)
                }
            }
            is `in`.ticketghar.mahaticket.ui.viewmodel.SeatsUiState.Success -> {
                SeatSelectionContent(
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
            is `in`.ticketghar.mahaticket.ui.viewmodel.SeatsUiState.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(state.message, color = MahaError)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { bookingViewModel.loadSeats(sessionId) }) {
                            Text("पुन्हा प्रयत्न करा")
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SeatSelectionContent(
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
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Screen indicator
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth(0.7f)
                        .height(4.dp),
                    shape = RoundedCornerShape(topStart = 50.dp, topEnd = 50.dp),
                    color = MaterialTheme.colorScheme.primary
                ) {}
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "रंगमंच / पडदा",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // Legend
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                SeatLegendItem("उपलब्ध", SeatAvailable, MahaTextPrimary)
                SeatLegendItem("निवडलेले", SeatSelected, Color.White)
                SeatLegendItem("बुक झाले", SeatBooked, MahaTextSecondary)
            }
        }

        // Group seats by section and row
        val groupedSeats = seats.groupBy { it.sectionId to it.rowLabel }

        items(groupedSeats.keys.toList()) { (sectionId, rowLabel) ->
            val rowSeats = groupedSeats[sectionId to rowLabel] ?: emptyList()
            SeatRow(
                rowLabel = rowLabel,
                seats = rowSeats,
                selectedSeats = selectedSeats,
                onSeatClick = onSeatClick
            )
        }
    }
}

@Composable
fun SeatLegendItem(label: String, color: Color, textColor: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(20.dp)
                .background(color, RoundedCornerShape(4.dp))
                .border(1.dp, MahaBorder, RoundedCornerShape(4.dp))
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(text = label, fontSize = 11.sp, color = MahaTextSecondary)
    }
}

@Composable
fun SeatRow(
    rowLabel: String,
    seats: List<SeatItem>,
    selectedSeats: List<SeatItem>,
    onSeatClick: (SeatItem) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Row label
        Text(
            text = rowLabel,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.width(30.dp),
            textAlign = TextAlign.Center
        )

        // Seats in this row
        seats.forEach { seat ->
            SeatBox(
                seat = seat,
                isSelected = selectedSeats.any { it.seatId == seat.seatId },
                onSeatClick = { onSeatClick(seat) }
            )
        }
    }
}

@Composable
fun SeatBox(
    seat: SeatItem,
    isSelected: Boolean,
    onSeatClick: () -> Unit
) {
    val backgroundColor = when {
        seat.status == "booked" || seat.status == "held" || seat.status == "blocked" -> SeatBooked
        isSelected -> SeatSelected
        else -> SeatAvailable
    }

    val textColor = if (isSelected) Color.White else MahaTextPrimary
    val enabled = seat.status == "available"

    Box(
        modifier = Modifier
            .size(38.dp)
            .background(backgroundColor, RoundedCornerShape(6.dp))
            .border(1.dp, if (isSelected) SeatSelected else MahaBorder, RoundedCornerShape(6.dp))
            .clickable(enabled = enabled) { onSeatClick() },
        contentAlignment = Alignment.Center
    ) {
        if (seat.isAccessible) {
            Icon(
                Icons.Default.AccessibleForward,
                contentDescription = "Accessible",
                modifier = Modifier.size(16.dp),
                tint = textColor
            )
        } else {
            Text(
                text = seat.seatNumber.toString(),
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = textColor
            )
        }
    }
}

@Composable
fun SeatSelectionBottomBar(
    selectedSeats: List<SeatItem>,
    onContinue: () -> Unit,
    isHolding: Boolean,
    onProceedToCheckout: () -> Unit
) {
    val totalPrice = selectedSeats.sumOf { it.price }

    Surface(
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 8.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "${selectedSeats.size} आसने निवडली",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "₹${totalPrice / 100}",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                Button(
                    onClick = if (isHolding) onProceedToCheckout else onContinue,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary
                    ),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp)
                ) {
                    Text(
                        text = if (isHolding) "पुढे जा" else "सुरू ठेवा",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}
