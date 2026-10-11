package com.kalpkrutinfotech.mahaticket.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.HelpOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import androidx.compose.ui.platform.LocalContext
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventDetailUiState
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventsUiState
import com.kalpkrutinfotech.mahaticket.model.SeatItem
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.BookingViewModel
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventViewModel
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.SeatsUiState
import com.kalpkrutinfotech.mahaticket.util.CurrencyUtils
import com.kalpkrutinfotech.mahaticket.util.DateTimeUtils
import kotlinx.coroutines.delay
import kotlin.time.Duration.Companion.seconds

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SeatSelectionScreen(
    sessionId: Int,
    eventId: Int = 1,
    bookingViewModel: BookingViewModel,
    eventViewModel: EventViewModel? = null,
    language: AppLanguage = AppLanguage.MARATHI,
    onNavigateBack: () -> Unit,
    onContinueToCheckout: (String, Int, Int) -> Unit
) {
    val isMarathi = language == AppLanguage.MARATHI
    val context = LocalContext.current

    LaunchedEffect(sessionId, eventId) {
        bookingViewModel.loadSeats(sessionId, eventId)
    }

    val seatsState by bookingViewModel.seatsState.collectAsState()
    val selectedSeats by bookingViewModel.selectedSeats.collectAsState()
    val holdResponse by bookingViewModel.holdResponse.collectAsState()
    var holdErrorMessage by remember { mutableStateOf<String?>(null) }
    var isHoldingLoading by remember { mutableStateOf(false) }

    val eventDetailState = eventViewModel?.eventDetailState?.collectAsState()?.value
    val currentEvent = remember(eventDetailState, eventId) {
        if (eventDetailState is EventDetailUiState.Success && eventDetailState.event.id == eventId) {
            eventDetailState.event
        } else {
            val listState = eventViewModel?.eventsState?.value
            if (listState is EventsUiState.Success) {
                listState.events.firstOrNull { it.id == eventId }
            } else null
        }
    }

    val currentSession = remember(currentEvent, sessionId) {
        currentEvent?.sessions?.firstOrNull { it.id == sessionId }
    }

    val playTitle = remember(currentEvent, isMarathi) {
        if (isMarathi) {
            currentEvent?.titleMr?.ifBlank { null } ?: currentEvent?.title ?: "नियम व अटी लागू"
        } else {
            currentEvent?.title?.ifBlank { null } ?: currentEvent?.titleMr ?: "Terms & Conditions Apply"
        }
    }
    val venueName = remember(currentEvent, isMarathi) {
        if (isMarathi) {
            currentEvent?.venue?.nameMr?.ifBlank { null } ?: currentEvent?.venue?.name ?: "बाळ गंधर्व रंगमंदिर, JM Road, पुणे"
        } else {
            currentEvent?.venue?.name?.ifBlank { null } ?: currentEvent?.venue?.nameMr ?: "Bal Gandharva Rang Mandir, JM Road, Pune"
        }
    }
    val sessionTimeFormatted = remember(currentSession, isMarathi) {
        if (currentSession != null) {
            DateTimeUtils.formatEventCardDateTime(currentSession.sessionStartTime, isMarathi = isMarathi)
        } else {
            if (isMarathi) "शनि १२ ऑक्टो • सं. ०५:०० वा." else "Sat 12 Oct • 05:00 PM"
        }
    }
    val posterUrl = currentEvent?.posterUrl?.ifBlank { null } ?: "https://lh3.googleusercontent.com/aida-public/AB6AXuC_TP1g6NzMub9BsPMiIYRGYew4HUCw64AcpDdQl4x2P1uO3blr9nVguLRycyJYIfm4f7b3WQEFkzQ3mAs9FcMmChwXC_IcB7DYXEBcv8x8n3vyv-NsIBHMHsFFkq7wWKSEcuf_U3tXW6Modxno3R18KWHAMzwBt2x_Wem6p4azDxl0ko_7U1MBxAOs0gE7afz3m9MVYtiwyEk9t6JJgiSB4QNK8NXdnz9xs2OzHwk"

    LaunchedEffect(playTitle, venueName, sessionTimeFormatted, posterUrl) {
        bookingViewModel.setActiveBookingContext(
            title = playTitle,
            poster = posterUrl,
            venue = venueName,
            time = sessionTimeFormatted
        )
    }

    val handleSeatClick: (SeatItem) -> Unit = { seat ->
        val isAlreadySelected = selectedSeats.any { 
            it.seatId == seat.seatId || it.seatCode.equals(seat.seatCode, ignoreCase = true) 
        }
        if (!isAlreadySelected && selectedSeats.size >= 6) {
            android.widget.Toast.makeText(context, "एका वेळी जास्तीत जास्त ६ जागा निवडता येतील.", android.widget.Toast.LENGTH_SHORT).show()
        } else {
            bookingViewModel.toggleSeatSelection(seat)
        }
    }

    // Live Countdown Timer (5:00 minutes as per BookMyShow standard)
    var countdownSeconds by remember { mutableIntStateOf(300) }
    var showCancelDialog by remember { mutableStateOf(false) }

    // Intercept hardware and system back gestures when seats are selected
    androidx.activity.compose.BackHandler(enabled = selectedSeats.isNotEmpty()) {
        showCancelDialog = true
    }

    if (showCancelDialog) {
        AlertDialog(
            onDismissRequest = { showCancelDialog = false },
            title = {
                Text(
                    text = "बुकिंग रद्द करायची आहे का?",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = TextPrimary
                )
            },
            text = {
                Text(
                    text = "तुम्ही मागे गेल्यास तुमची निवडलेली आसने मुक्त केली जातील आणि इतरांसाठी त्वरित उपलब्ध होतील.",
                    fontSize = 13.sp,
                    color = TextSecondary
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showCancelDialog = false
                        bookingViewModel.releaseHold()
                        onNavigateBack()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("होय, रद्द करा", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = { showCancelDialog = false },
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("बुकिंग सुरू ठेवा", color = TextPrimary)
                }
            },
            containerColor = Color.White,
            shape = RoundedCornerShape(16.dp)
        )
    }

    val holdExpiresAt by bookingViewModel.holdExpiresAtEpochMs.collectAsState()
    var isHoldExpired by remember { mutableStateOf(false) }

    // Recalculate remaining seconds immediately whenever screen unlocks or app resumes
    androidx.lifecycle.compose.LifecycleEventEffect(androidx.lifecycle.Lifecycle.Event.ON_RESUME) {
        if (selectedSeats.isNotEmpty()) {
            val remaining = bookingViewModel.getRemainingHoldSeconds()
            countdownSeconds = remaining
            if (remaining <= 0 && holdExpiresAt > 0L) {
                isHoldExpired = true
                bookingViewModel.releaseHold(sessionId)
                android.widget.Toast.makeText(context, "जागा आरक्षणाची मुदत संपली आहे. कृपया पुन्हा आसने निवडा.", android.widget.Toast.LENGTH_LONG).show()
            }
        }
    }

    LaunchedEffect(selectedSeats.isNotEmpty(), holdExpiresAt) {
        if (selectedSeats.isNotEmpty()) {
            isHoldExpired = false
            while (true) {
                val remaining = bookingViewModel.getRemainingHoldSeconds()
                countdownSeconds = remaining
                if (remaining <= 0 && holdExpiresAt > 0L) {
                    isHoldExpired = true
                    bookingViewModel.releaseHold(sessionId)
                    android.widget.Toast.makeText(context, "सत्र समाप्त झाले. कृपया पुन्हा आसने निवडा.", android.widget.Toast.LENGTH_LONG).show()
                    break
                }
                delay(1000L)
            }
        } else {
            countdownSeconds = 300
            isHoldExpired = false
        }
    }

    // Synthesize Stitch Bal Gandharva seating map if API returns empty or offline
    val displaySeats = remember(seatsState) {
        when (seatsState) {
            is SeatsUiState.Success -> {
                val s = (seatsState as SeatsUiState.Success).seats
                if (s.isNotEmpty()) s else buildStitchBalGandharvaSeats()
            }
            else -> buildStitchBalGandharvaSeats()
        }
    }

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .testTag("seat_selection_screen"),
        topBar = {
            // Clean Stitch Top Bar
            Surface(
                color = Color.White,
                shadowElevation = 1.dp,
                border = BorderStroke(0.5.dp, MahaBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        IconButton(
                            onClick = {
                                if (selectedSeats.isNotEmpty()) {
                                    showCancelDialog = true
                                } else {
                                    bookingViewModel.releaseHold()
                                    onNavigateBack()
                                }
                            },
                            modifier = Modifier.testTag("seat_selection_back_btn")
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                tint = TextPrimary
                            )
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(text = "🎭", fontSize = 18.sp)
                            Text(
                                text = "महाटिकिट",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Black,
                                color = MahaOrangeDeep
                            )
                        }
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        IconButton(onClick = { /* Help */ }) {
                            Icon(
                                Icons.Outlined.HelpOutline,
                                contentDescription = "Help",
                                tint = TextSecondary,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                        Surface(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape),
                            color = MahaWarm,
                            border = BorderStroke(1.dp, MahaBorder)
                        ) {
                            AsyncImage(
                                model = "https://lh3.googleusercontent.com/aida-public/AB6AXuAMSaE5fX9f8SYwcIhl78gY8h1AvUlLEYlulNTFntLQxzUV6T1k2te8LjRqQAmIjkdw0ruuSSlxvNwhHtVm2hYkZmzmHGZik9kP5_xeHfSk_CUELu6wsF2-LuI39O66cbeC4c2rnYNAYKxfDP6IlLbaRFu5Z85140MfawUoYtzcDe94RvdCycP_s8b6GfVmGwf81LvlqCfrlH2ihQyvDnw19K_hZwXTICqjB-gw8kc",
                                contentDescription = "Profile",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        }
                    }
                }
            }
        },
        bottomBar = {
            // Sticky Bottom Booking Bar (Stitch Exact)
            TheatricalStitchSeatBottomBar(
                selectedSeats = selectedSeats,
                isHoldingLoading = isHoldingLoading,
                holdErrorMessage = holdErrorMessage,
                isHoldExpired = isHoldExpired,
                isMarathi = isMarathi,
                holdPricing = holdResponse?.pricing,
                onDismissError = { holdErrorMessage = null },
                onProceed = {
                    holdErrorMessage = null
                    if (isHoldExpired) {
                        holdErrorMessage = if (isMarathi) "आरक्षणाची मुदत संपली आहे. कृपया पुन्हा आसने निवडा." else "Reservation expired. Please select seats again."
                        return@TheatricalStitchSeatBottomBar
                    }
                    val existingToken = (holdResponse?.holdToken ?: holdResponse?.hold?.holdToken)?.takeIf { it.isNotBlank() }
                    if (existingToken != null && !bookingViewModel.isHoldExpired()) {
                        onContinueToCheckout(existingToken, sessionId, eventId)
                    } else {
                        val sessionPhone = com.kalpkrutinfotech.mahaticket.util.UserSessionManager.getInstance(context).getPhone()
                        val validPhone = sessionPhone?.filter { it.isDigit() }?.takeLast(10)?.takeIf { it.length == 10 } ?: "9822012345"

                        isHoldingLoading = true
                        bookingViewModel.holdSeats(
                            sessionId = sessionId,
                            phoneNumber = validPhone,
                            onSuccess = { genToken ->
                                isHoldingLoading = false
                                val safeToken = genToken.ifBlank { "hold_${sessionId}_${System.currentTimeMillis()}" }
                                onContinueToCheckout(safeToken, sessionId, eventId)
                            },
                            onError = { err ->
                                isHoldingLoading = false
                                holdErrorMessage = err.ifBlank { "जागा आरक्षित (Hold) करण्यात अडचण आली. कृपया पुन्हा प्रयत्न करा." }
                            }
                        )
                    }
                }
            )
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Color.White),
            contentPadding = PaddingValues(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Context Card (Mini Natak Poster Thumbnail + Play details)
            item {
                Surface(
                    color = Color(0xFFF1F5F9),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 4.dp)
                ) {
                    Column(modifier = Modifier.padding(10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Mini Natak Poster Thumbnail
                            Box(
                                modifier = Modifier
                                    .width(58.dp)
                                    .height(74.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color(0xFFE2E8F0))
                            ) {
                                AsyncImage(
                                    model = posterUrl,
                                    contentDescription = playTitle,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                )
                                Surface(
                                    color = MahaOrange,
                                    shape = RoundedCornerShape(4.dp),
                                    modifier = Modifier
                                        .align(Alignment.TopStart)
                                        .padding(4.dp)
                                ) {
                                    Text(
                                        text = currentEvent?.category?.ifBlank { "नाटक" } ?: "नाटक",
                                        color = Color.White,
                                        fontSize = 8.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                    )
                                }
                            }

                            // Play & Booking Details
                            Column(modifier = Modifier.weight(1f)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(7.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFF16A34A))
                                    )
                                    Text(
                                        text = "थेट उपलब्ध (LIVE BOOKING)",
                                        fontSize = 9.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF16A34A)
                                    )
                                }

                                Text(
                                    text = playTitle,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary,
                                    modifier = Modifier.padding(top = 1.dp)
                                )

                                Text(
                                    text = currentEvent?.title?.takeIf { it != playTitle } ?: "मराठी नाट्य महोत्सव",
                                    fontSize = 11.sp,
                                    color = TextSecondary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    modifier = Modifier.padding(top = 2.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.CalendarToday,
                                        contentDescription = null,
                                        tint = MahaOrange,
                                        modifier = Modifier.size(11.dp)
                                    )
                                    Text(
                                        text = sessionTimeFormatted,
                                        fontSize = 10.5.sp,
                                        color = TextPrimary,
                                        fontWeight = FontWeight.Medium
                                    )
                                }

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    modifier = Modifier.padding(top = 1.dp)
                                ) {
                                    Text(text = "🏛️", fontSize = 10.sp)
                                    Text(
                                        text = venueName,
                                        fontSize = 10.sp,
                                        color = TextSecondary,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Countdown Timer Pill
                        Surface(
                            color = Color(0xFFFFF7ED),
                            shape = RoundedCornerShape(20.dp),
                            border = BorderStroke(1.dp, Color(0xFFFFEDD5)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 12.dp, vertical = 6.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Timer,
                                        contentDescription = "Timer",
                                        tint = MahaOrange,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Text(
                                        text = "तिकिटे राखीव राहतील:",
                                        fontSize = 11.sp,
                                        color = TextPrimary,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                                val m = countdownSeconds / 60
                                val s = countdownSeconds % 60
                                Text(
                                    text = String.format("%02d:%02d मि.", m, s),
                                    fontSize = 11.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MahaOrangeDeep
                                )
                            }
                        }
                    }
                }
            }

            // Legend Indicator Bar
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 2.dp),
                    horizontalArrangement = Arrangement.SpaceAround,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Available
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                        Surface(
                            modifier = Modifier.size(15.dp),
                            shape = RoundedCornerShape(3.dp),
                            color = Color.White,
                            border = BorderStroke(1.dp, Color(0xFF94A3B8))
                        ) {}
                        Text(text = "उपलब्ध (₹३००/५००)", fontSize = 10.5.sp, color = TextSecondary)
                    }

                    // Selected
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                        Surface(
                            modifier = Modifier.size(15.dp),
                            shape = RoundedCornerShape(3.dp),
                            color = MahaOrange
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(10.dp)
                                )
                            }
                        }
                        Text(text = "निवडलेले", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    }

                    // Occupied
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                        Surface(
                            modifier = Modifier.size(15.dp),
                            shape = RoundedCornerShape(3.dp),
                            color = Color(0xFFE2E8F0)
                        ) {}
                        Text(text = "आरक्षित", fontSize = 10.5.sp, color = TextSecondary)
                    }
                }
            }

            // Curved Theatre Stage Indicator (Stitch Exact Golden Arc)
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Canvas(
                        modifier = Modifier
                            .width(260.dp)
                            .height(26.dp)
                    ) {
                        val path = Path().apply {
                            moveTo(10f, 24f)
                            quadraticTo(size.width / 2f, 2f, size.width - 10f, 24f)
                        }
                        drawPath(
                            path = path,
                            color = Color(0xFFEA580C),
                            style = Stroke(width = 3.5f)
                        )
                    }
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        modifier = Modifier.padding(top = 1.dp)
                    ) {
                        Text(text = "🎭", fontSize = 13.sp)
                        Text(
                            text = "रंगमंच / STAGE (समोर)",
                            color = MahaOrangeDeep,
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp
                        )
                    }
                    Text(
                        text = "पडदा क्रमांक १ • प्रेक्षक समोर",
                        color = TextSecondary,
                        fontSize = 9.5.sp
                    )
                }
            }

            // SECTION 1: बालकनी (Balcony) - ₹५००
            item {
                StitchSeatingSectionCard(
                    title = "बालकनी (Balcony)",
                    priceTag = "₹५०० प्रति आसन",
                    sectionId = 1,
                    defaultPricePaise = 50000,
                    rows = listOf("A", "B", "C"),
                    seatsPerBlock = Pair(4, 4),
                    allSeats = displaySeats,
                    selectedSeats = selectedSeats,
                    onSeatClick = { handleSeatClick(it) },
                    cardBg = Color(0xFFFFF7ED)
                )
            }

            // SECTION 2: प्रथम वर्ग (Stall A) - ₹४००
            item {
                StitchSeatingSectionCard(
                    title = "प्रथम वर्ग (Stall A)",
                    priceTag = "₹४०० प्रति आसन",
                    sectionId = 2,
                    defaultPricePaise = 40000,
                    rows = listOf("D", "E", "F", "G"),
                    seatsPerBlock = Pair(5, 5),
                    allSeats = displaySeats,
                    selectedSeats = selectedSeats,
                    onSeatClick = { handleSeatClick(it) },
                    cardBg = Color(0xFFF1F5F9)
                )
            }

            // SECTION 3: द्वितीय वर्ग (Stall B) - ₹३००
            item {
                StitchSeatingSectionCard(
                    title = "द्वितीय वर्ग (Stall B)",
                    priceTag = "₹३०० प्रति आसन",
                    sectionId = 3,
                    defaultPricePaise = 30000,
                    rows = listOf("H", "J", "K"),
                    seatsPerBlock = Pair(4, 4),
                    allSeats = displaySeats,
                    selectedSeats = selectedSeats,
                    onSeatClick = { handleSeatClick(it) },
                    cardBg = Color(0xFFFFF7ED)
                )
            }

            // Trust Badge (Stitch Exact: १००% सुरक्षित पेमेंट)
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = "Verified",
                        tint = Color(0xFF16A34A),
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "महाराष्ट्राचे अधिकृत थेट तिकीट आरक्षण • १००% सुरक्षित पेमेंट",
                        fontSize = 10.5.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFF15803D)
                    )
                }
            }
        }
    }
}

@Composable
private fun StitchSeatingSectionCard(
    title: String,
    priceTag: String,
    sectionId: Int = 1,
    defaultPricePaise: Int = 40000,
    rows: List<String>,
    seatsPerBlock: Pair<Int, Int>,
    allSeats: List<SeatItem>,
    selectedSeats: List<SeatItem>,
    onSeatClick: (SeatItem) -> Unit,
    cardBg: Color
) {
    Surface(
        color = cardBg,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, MahaBorder),
        shadowElevation = 0.5.dp,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 2.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            // Header Row: Section name + Price badge
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(text = "🪑", fontSize = 12.sp)
                    Text(
                        text = title,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                }
                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, MahaBorder)
                ) {
                    Text(
                        text = priceTag,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = MahaOrangeDeep,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }

            // Seating Grid Rows
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                rows.forEach { rowLetter ->
                    val rowPrice = when (rowLetter.uppercase()) {
                        "A", "B", "C" -> 50000
                        "D", "E", "F", "G" -> 40000
                        "H", "J", "K" -> 30000
                        else -> defaultPricePaise
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        // Left Row Label
                        Text(
                            text = rowLetter,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextSecondary,
                            modifier = Modifier.width(16.dp)
                        )

                        // Left Wing Seats
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            for (num in 1..seatsPerBlock.first) {
                                val code = "$rowLetter$num"
                                val formattedCode = String.format("%s%02d", rowLetter, num)
                                val rawItem = allSeats.firstOrNull { 
                                    it.seatCode.equals(code, ignoreCase = true) ||
                                    it.seatCode.endsWith(code, ignoreCase = true) ||
                                    it.seatCode.endsWith(formattedCode, ignoreCase = true) ||
                                    (it.rowLabel.equals(rowLetter, ignoreCase = true) && it.seatNumber == num)
                                }
                                val item = if (rawItem != null) {
                                    if (rawItem.price > 0) rawItem else rawItem.copy(price = rowPrice, sectionId = sectionId, sectionName = title)
                                } else {
                                    SeatItem(
                                        seatId = Math.abs(code.hashCode()) % 1000 + 1,
                                        sectionId = sectionId,
                                        rowLabel = rowLetter,
                                        seatNumber = num,
                                        seatCode = code,
                                        price = rowPrice,
                                        status = if (code in listOf("A3", "A6", "A7", "B1", "B7", "B8", "C3", "C4", "D1", "D2", "D8", "D9", "E3", "E4", "E6", "F4", "F5", "F6", "F7", "G1", "G2", "G3", "H4", "H5", "J1", "J8", "K3", "K4", "K7")) "booked" else "available",
                                        isAccessible = false,
                                        sectionName = title
                                    )
                                }
                                val isSelected = selectedSeats.any { it.seatCode == item.seatCode || it.seatId == item.seatId }
                                StitchSeatButton(seat = item, isSelected = isSelected, onClick = { onSeatClick(item) })
                            }
                        }

                        // Center Aisle
                        Text(
                            text = "।",
                            fontSize = 11.sp,
                            color = Color(0xFFCBD5E1),
                            modifier = Modifier.padding(horizontal = 2.dp)
                        )

                        // Right Wing Seats
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            val startNum = seatsPerBlock.first + 1
                            val endNum = seatsPerBlock.first + seatsPerBlock.second
                            for (num in startNum..endNum) {
                                val code = "$rowLetter$num"
                                val formattedCode = String.format("%s%02d", rowLetter, num)
                                val rawItem = allSeats.firstOrNull { 
                                    it.seatCode.equals(code, ignoreCase = true) ||
                                    it.seatCode.endsWith(code, ignoreCase = true) ||
                                    it.seatCode.endsWith(formattedCode, ignoreCase = true) ||
                                    (it.rowLabel.equals(rowLetter, ignoreCase = true) && it.seatNumber == num)
                                }
                                val item = if (rawItem != null) {
                                    if (rawItem.price > 0) rawItem else rawItem.copy(price = rowPrice, sectionId = sectionId, sectionName = title)
                                } else {
                                    SeatItem(
                                        seatId = Math.abs(code.hashCode()) % 1000 + 1,
                                        sectionId = sectionId,
                                        rowLabel = rowLetter,
                                        seatNumber = num,
                                        seatCode = code,
                                        price = rowPrice,
                                        status = if (code in listOf("A3", "A6", "A7", "B1", "B7", "B8", "C3", "C4", "D1", "D2", "D8", "D9", "E3", "E4", "E6", "F4", "F5", "F6", "F7", "G1", "G2", "G3", "H4", "H5", "J1", "J8", "K3", "K4", "K7")) "booked" else "available",
                                        isAccessible = false,
                                        sectionName = title
                                    )
                                }
                                val isSelected = selectedSeats.any { it.seatCode == item.seatCode || it.seatId == item.seatId }
                                StitchSeatButton(seat = item, isSelected = isSelected, onClick = { onSeatClick(item) })
                            }
                        }

                        // Right Row Label
                        Text(
                            text = rowLetter,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextSecondary,
                            modifier = Modifier.width(16.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun StitchSeatButton(
    seat: SeatItem,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val isAvailable = seat.status == "available" || isSelected

    val bgColor = when {
        isSelected -> MahaOrange
        !isAvailable -> Color(0xFFE2E8F0)
        else -> Color.White
    }

    val textColor = when {
        isSelected -> Color.White
        !isAvailable -> Color(0xFF94A3B8)
        else -> TextPrimary
    }

    val borderColor = when {
        isSelected -> MahaOrangeDeep
        !isAvailable -> Color(0xFFCBD5E1)
        else -> Color(0xFFD1D5DB)
    }

    Surface(
        modifier = Modifier
            .size(26.dp)
            .clip(RoundedCornerShape(4.dp))
            .clickable(enabled = isAvailable) { onClick() }
            .testTag("seat_${seat.seatCode}"),
        color = bgColor,
        shape = RoundedCornerShape(4.dp),
        border = BorderStroke(1.dp, borderColor),
        shadowElevation = if (isSelected) 1.dp else 0.dp
    ) {
        Box(contentAlignment = Alignment.Center) {
            if (isSelected) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(13.dp)
                )
            } else {
                Text(
                    text = seat.seatNumber.toString(),
                    fontSize = 9.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = textColor
                )
            }
        }
    }
}

@Composable
private fun TheatricalStitchSeatBottomBar(
    selectedSeats: List<SeatItem>,
    isHoldingLoading: Boolean,
    holdErrorMessage: String?,
    isHoldExpired: Boolean = false,
    isMarathi: Boolean = true,
    holdPricing: com.kalpkrutinfotech.mahaticket.data.api.PricingData? = null,
    onDismissError: () -> Unit,
    onProceed: () -> Unit
) {
    Surface(
        color = Color.White,
        shadowElevation = 12.dp,
        border = BorderStroke(1.dp, MahaBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp)
        ) {
            if (holdErrorMessage != null) {
                Surface(
                    color = Color(0xFFFEF2F2),
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(1.dp, Color(0xFFFECACA)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 6.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = holdErrorMessage,
                            color = Color(0xFFDC2626),
                            fontSize = 11.sp,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(onClick = onDismissError, modifier = Modifier.size(20.dp)) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = Color(0xFFDC2626), modifier = Modifier.size(14.dp))
                        }
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                val seatCount = selectedSeats.size
                val seatCodes = selectedSeats.joinToString(", ") { it.seatCode }
                val basePricePaise = selectedSeats.sumOf { it.price }
                val displayBase = if (basePricePaise > 0) CurrencyUtils.formatPaiseToRupees(basePricePaise) else "₹०"

                Column {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(MahaOrange)
                        )
                        Text(
                            text = if (seatCount > 0) {
                                if (isMarathi) "$seatCount आसने निवडली ($seatCodes)" else "$seatCount Seats Selected ($seatCodes)"
                            } else {
                                if (isMarathi) "कृपया आसने निवडा" else "Please select seats"
                            },
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }
                    Text(
                        text = if (holdPricing != null && holdPricing.grandTotal > 0) {
                            if (isMarathi) "एकूण: ${CurrencyUtils.formatPaiseToRupees(holdPricing.grandTotal)} (करांसह)" else "Total: ${CurrencyUtils.formatPaiseToRupees(holdPricing.grandTotal)} (incl. tax)"
                        } else if (seatCount > 0) {
                            if (isMarathi) "$displayBase + सुविधा शुल्क व GST" else "$displayBase + Fees & GST"
                        } else {
                            if (isMarathi) "किंमत आसन निवडीवर आधारित" else "Price based on seat tier"
                        },
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = MahaOrangeDeep
                    )
                }

                Button(
                    onClick = onProceed,
                    enabled = seatCount > 0 && !isHoldingLoading && !isHoldExpired,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MahaOrange,
                        disabledContainerColor = Color(0xFFE2E8F0)
                    ),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 18.dp, vertical = 10.dp),
                    modifier = Modifier.testTag("seat_proceed_btn")
                ) {
                    if (isHoldingLoading) {
                        CircularProgressIndicator(
                            color = Color.White,
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = if (isMarathi) "पुढे जा" else "Continue",
                                fontSize = 13.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Icon(
                                imageVector = Icons.Default.ArrowForward,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(15.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun buildStitchBalGandharvaSeats(): List<SeatItem> {
    val list = mutableListOf<SeatItem>()
    val bookedCodes = setOf("A3", "A6", "A7", "B1", "B7", "B8", "C3", "C4", "D1", "D2", "D8", "D9", "E3", "E4", "E6", "F4", "F5", "F6", "F7", "G1", "G2", "G3", "H4", "H5", "J1", "J8", "K3", "K4", "K7")

    // Balcony Rows A, B, C (Seats 1..8, ₹500)
    listOf("A", "B", "C").forEach { r ->
        for (n in 1..8) {
            val code = "$r$n"
            list.add(
                SeatItem(
                    seatId = code.hashCode(),
                    sectionId = 1,
                    rowLabel = r,
                    seatNumber = n,
                    seatCode = code,
                    price = 50000,
                    status = if (code in bookedCodes) "booked" else "available",
                    isAccessible = false,
                    sectionName = "बालकनी (Balcony)"
                )
            )
        }
    }

    // Stall A Rows D, E, F, G (Seats 1..10, ₹400)
    listOf("D", "E", "F", "G").forEach { r ->
        for (n in 1..10) {
            val code = "$r$n"
            list.add(
                SeatItem(
                    seatId = code.hashCode(),
                    sectionId = 2,
                    rowLabel = r,
                    seatNumber = n,
                    seatCode = code,
                    price = 40000,
                    status = if (code in bookedCodes) "booked" else "available",
                    isAccessible = false,
                    sectionName = "प्रथम वर्ग (Stall A)"
                )
            )
        }
    }

    // Stall B Rows H, J, K (Seats 1..8, ₹300)
    listOf("H", "J", "K").forEach { r ->
        for (n in 1..8) {
            val code = "$r$n"
            list.add(
                SeatItem(
                    seatId = code.hashCode(),
                    sectionId = 3,
                    rowLabel = r,
                    seatNumber = n,
                    seatCode = code,
                    price = 30000,
                    status = if (code in bookedCodes) "booked" else "available",
                    isAccessible = false,
                    sectionName = "द्वितीय वर्ग (Stall B)"
                )
            )
        }
    }

    return list
}
