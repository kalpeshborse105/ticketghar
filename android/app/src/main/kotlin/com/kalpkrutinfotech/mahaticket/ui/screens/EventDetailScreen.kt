package com.kalpkrutinfotech.mahaticket.ui.screens

import android.content.Intent
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.kalpkrutinfotech.mahaticket.BuildConfig
import com.kalpkrutinfotech.mahaticket.MahaTicketApp
import com.kalpkrutinfotech.mahaticket.model.EventItem
import com.kalpkrutinfotech.mahaticket.model.toEvent
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.components.TheaterLoaderCard
import com.kalpkrutinfotech.mahaticket.ui.components.TrailerPreviewDialog
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventDetailUiState
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventViewModel
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventViewModelFactory
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventDetailScreen(
    eventId: Int,
    onNavigateBack: () -> Unit,
    onBookSession: (Int, Int) -> Unit
) {
    val app = LocalContext.current.applicationContext as MahaTicketApp
    val eventViewModel: EventViewModel = viewModel(
        factory = EventViewModelFactory(app.eventRepository, app.networkMonitor)
    )
    val context = LocalContext.current

    LaunchedEffect(eventId) {
        eventViewModel.loadEventDetails(eventId)
    }

    val eventState by eventViewModel.eventDetailState.collectAsState()
    var showTrailerModal by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(CinemaBg)
            .testTag("event_detail_screen")
    ) {
        when (val state = eventState) {
            is EventDetailUiState.Loading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    TheaterLoaderCard(message = "नाट्य माहिती लोड होत आहे...")
                }
            }
            is EventDetailUiState.Success -> {
                val event = state.event
                EventDetailTheatricalContent(
                    event = event,
                    onNavigateBack = onNavigateBack,
                    onBookSession = onBookSession,
                    onWatchTrailer = { showTrailerModal = true },
                    onShareEvent = {
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(
                                Intent.EXTRA_TEXT,
                                "MahaTicket वर हा लोकप्रिय कार्यक्रम पहा: ${BuildConfig.API_BASE_URL}/events/$eventId\n${event.title}"
                            )
                        }
                        context.startActivity(Intent.createChooser(shareIntent, "कार्यक्रम शेअर करा"))
                    }
                )

                if (showTrailerModal) {
                    val trailerEvent = event.toEvent()
                    TrailerPreviewDialog(
                        event = trailerEvent,
                        language = AppLanguage.MARATHI,
                        onDismiss = { showTrailerModal = false },
                        onBookNow = {
                            showTrailerModal = false
                            val firstSessionId = event.sessions?.firstOrNull()?.id ?: 0
                            if (firstSessionId != 0) {
                                onBookSession(firstSessionId, event.id)
                            }
                        }
                    )
                }
            }
            is EventDetailUiState.Error -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(24.dp)
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = TheatricalCrimson.copy(alpha = 0.15f),
                            border = BorderStroke(1.dp, TheatricalCrimson),
                            modifier = Modifier.size(72.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.WifiOff,
                                    contentDescription = null,
                                    tint = TheatricalCrimson,
                                    modifier = Modifier.size(36.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "माहिती लोड करण्यात अडचण आली",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = state.message.ifBlank { "थेट आसन उपलब्धता व शो पाहण्यासाठी इंटरनेट कनेक्शन तपासा." },
                            fontSize = 13.sp,
                            color = Color(0xFF94A3B8),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(20.dp))
                        Button(
                            onClick = { eventViewModel.loadEventDetails(eventId) },
                            colors = ButtonDefaults.buttonColors(containerColor = TheatricalCrimson),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("पुन्हा प्रयत्न करा (Retry)", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EventDetailTheatricalContent(
    event: EventItem,
    onNavigateBack: () -> Unit,
    onBookSession: (Int, Int) -> Unit,
    onWatchTrailer: () -> Unit,
    onShareEvent: () -> Unit
) {
    val allSessions = event.sessions ?: emptyList()
    var selectedSessionId by remember(allSessions) {
        mutableStateOf(allSessions.firstOrNull()?.id ?: 0)
    }

    val selectedSession = remember(selectedSessionId, allSessions) {
        allSessions.find { it.id == selectedSessionId } ?: allSessions.firstOrNull()
    }

    val minPrice = remember(event) {
        val price = event.minPrice ?: 0
        if (price > 0) price / 100 else 0
    }

    Box(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 100.dp)
        ) {
            // 1. Hero Banner with Back Button & Trailer CTA
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(250.dp)
                ) {
                    if (event.posterUrl.isNotBlank()) {
                        AsyncImage(
                            model = event.posterUrl,
                            contentDescription = event.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(MahaWarm),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.ConfirmationNumber,
                                contentDescription = null,
                                tint = MahaOrange,
                                modifier = Modifier.size(48.dp)
                            )
                        }
                    }

                    // Cinematic Gradient Scrim
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color.Black.copy(alpha = 0.6f),
                                        Color.Transparent,
                                        CinemaBg
                                    )
                                )
                            )
                    )

                    // Back Button
                    IconButton(
                        onClick = onNavigateBack,
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(16.dp)
                            .background(Color.Black.copy(alpha = 0.65f), CircleShape)
                            .testTag("detail_back_button")
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }

                    // Share Button
                    IconButton(
                        onClick = onShareEvent,
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(16.dp)
                            .background(Color.Black.copy(alpha = 0.65f), CircleShape)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Share,
                            contentDescription = "Share",
                            tint = GoldAccent
                        )
                    }

                    // Trailer Action Button on Banner (Only if event has real trailer URL)
                    if (!event.trailerUrl.isNullOrBlank()) {
                        Surface(
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .padding(16.dp)
                                .clip(RoundedCornerShape(20.dp))
                                .clickable { onWatchTrailer() }
                                .testTag("detail_trailer_button"),
                            color = TheatricalCrimson,
                            shape = RoundedCornerShape(20.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.PlayArrow,
                                    contentDescription = "Play",
                                    tint = Color.White,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "ट्रेलर पहा (Watch Trailer)",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    }
                }
            }

            // 2. Title, Language & Rating Section
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = if (event.titleMr.isNotBlank()) event.titleMr else event.title,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black,
                        color = TextPrimary
                    )

                    if (event.titleMr.isNotBlank() && event.titleMr != event.title) {
                        Text(
                            text = event.title,
                            fontSize = 13.sp,
                            color = TextSecondary
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (event.language.isNotBlank()) {
                            Surface(
                                color = MahaWarm,
                                shape = RoundedCornerShape(6.dp),
                                border = BorderStroke(1.dp, MahaOrange.copy(alpha = 0.3f))
                            ) {
                                Text(
                                    text = event.language,
                                    color = MahaOrangeDeep,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                        if (event.durationMinutes > 0) {
                            Surface(
                                color = Color.White,
                                shape = RoundedCornerShape(6.dp),
                                border = BorderStroke(1.dp, MahaBorder)
                            ) {
                                Text(
                                    text = "${event.durationMinutes} मिनिटे",
                                    color = TextSecondary,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }
            }

            // Showtimes first
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "शो निवडा",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    if (allSessions.isEmpty()) {
                        Surface(
                            color = Color.White,
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, MahaBorder),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "सध्या कोणतेही शो उपलब्ध नाहीत.",
                                color = TextSecondary,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(14.dp)
                            )
                        }
                    } else {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            allSessions.forEach { session ->
                                val isSelected = session.id == selectedSessionId
                                val formattedDate = try {
                                    val dt = ZonedDateTime.parse(session.sessionStartTime)
                                    dt.format(DateTimeFormatter.ofPattern("EEE, d MMM"))
                                } catch (_: Exception) {
                                    session.sessionStartTime.take(10)
                                }
                                val formattedTime = try {
                                    val dt = ZonedDateTime.parse(session.sessionStartTime)
                                    dt.format(DateTimeFormatter.ofPattern("hh:mm a"))
                                } catch (_: Exception) {
                                    ""
                                }

                                Surface(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(12.dp))
                                        .clickable { selectedSessionId = session.id }
                                        .testTag("session_${session.id}"),
                                    color = if (isSelected) MahaOrange else Color.White,
                                    shape = RoundedCornerShape(12.dp),
                                    border = BorderStroke(
                                        1.dp,
                                        if (isSelected) MahaOrange else MahaBorder
                                    )
                                ) {
                                    Column(
                                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Text(
                                            text = formattedTime,
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isSelected) Color.White else TextPrimary
                                        )
                                        Text(
                                            text = formattedDate,
                                            fontSize = 11.sp,
                                            color = if (isSelected) Color.White.copy(alpha = 0.9f) else TextSecondary
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // About — only when real description exists
            if (event.description.isNotBlank()) {
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = "कार्यक्रमाविषयी",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = event.description,
                            fontSize = 13.sp,
                            color = TextSecondary,
                            lineHeight = 20.sp
                        )
                    }
                }
            }

            // Venue — real data only
            if (event.venue != null) {
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = BorderStroke(1.dp, MahaBorder)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = "स्थळ",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = event.venue.nameMr.ifBlank { event.venue.name },
                                fontSize = 13.sp,
                                color = MahaOrangeDeep,
                                fontWeight = FontWeight.SemiBold
                            )
                            val cityLine = listOf(
                                event.venue.address,
                                event.venue.city
                            ).filter { it.isNotBlank() }.joinToString(", ")
                            if (cityLine.isNotBlank()) {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = cityLine,
                                    fontSize = 11.sp,
                                    color = TextSecondary
                                )
                            }
                        }
                    }
                }
            }
        }

        // Compact sticky CTA
        Surface(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth(),
            color = Color.White,
            shadowElevation = 8.dp,
            border = BorderStroke(1.dp, MahaBorder)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    if (minPrice > 0) {
                        Text(
                            text = "₹$minPrice पासून",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary
                        )
                    } else {
                        Text(
                            text = "आसने निवडा",
                            fontSize = 13.sp,
                            color = TextSecondary
                        )
                    }
                }

                Button(
                    onClick = {
                        val sessionToBook = selectedSession?.id ?: allSessions.firstOrNull()?.id ?: 0
                        if (sessionToBook != 0) {
                            onBookSession(sessionToBook, event.id)
                        }
                    },
                    enabled = allSessions.isNotEmpty(),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MahaOrange,
                        disabledContainerColor = Color(0xFFCBD5E1)
                    ),
                    modifier = Modifier
                        .height(44.dp)
                        .testTag("select_seats_cta_button")
                ) {
                    Text(
                        text = "जागा निवडा",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
    }
}
