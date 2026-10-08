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
                            color = Color.White
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
        val price = event.minPrice ?: 25000
        if (price > 0) price / 100 else 250
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
                    AsyncImage(
                        model = event.posterUrl.ifBlank {
                            "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800"
                        },
                        contentDescription = event.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )

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
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )

                    if (event.titleMr.isNotBlank() && event.titleMr != event.title) {
                        Text(
                            text = event.title,
                            fontSize = 13.sp,
                            color = Color(0xFF94A3B8)
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Rating & Certification Card
                    Surface(
                        color = Color(0xFF131A29),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Filled.Star,
                                    contentDescription = "Star",
                                    tint = GoldAccent,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "4.8 / 5",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.White
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "(1,250+ मते)",
                                    fontSize = 12.sp,
                                    color = Color(0xFF94A3B8)
                                )
                            }

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Surface(
                                    color = TheatricalCrimson.copy(alpha = 0.2f),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = event.language.ifBlank { "मराठी" },
                                        color = TheatricalCrimsonLight,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }

                                Surface(
                                    color = GoldAccent.copy(alpha = 0.15f),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = "${event.durationMinutes} मिनिटे",
                                        color = GoldAccent,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // 3. Synopsis
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "नाट्य सारांश (About the Show)",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = GoldBright
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = event.description.ifBlank {
                            "महाराष्ट्रातील नामांकित रंगकर्मींचे सुप्रसिद्ध नाटक. कौटुंबिक मनोरंजनाचा परिपूर्ण अनुभव."
                        },
                        fontSize = 13.sp,
                        color = Color(0xFFCBD5E1),
                        lineHeight = 20.sp
                    )
                }
            }

            // 4. Cast & Crew Chips
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp)
                ) {
                    Text(
                        text = "प्रमुख कलाकार आणि दिग्दर्शक",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                    )

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Surface(
                            color = Color(0xFF1E293B),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(text = "🎭", fontSize = 14.sp)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(text = "सुशांत शेलार", fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.Medium)
                            }
                        }

                        Surface(
                            color = Color(0xFF1E293B),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(text = "🎭", fontSize = 14.sp)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(text = "मुक्ता बर्वे", fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.Medium)
                            }
                        }

                        Surface(
                            color = TheatricalCrimson.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(text = "🎬", fontSize = 14.sp)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "दिग्दर्शक: विजय केंकरे",
                                    fontSize = 12.sp,
                                    color = TheatricalCrimsonLight,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }

            // 5. Venue Details & Amenities
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = CinemaSurface)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(text = "🏛️ ", fontSize = 18.sp)
                            Column {
                                Text(
                                    text = "नाट्यगृह आणि सुविधा",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    text = event.venue?.nameMr ?: event.venue?.name ?: "यशवंतराव चव्हाण नाट्यगृह",
                                    fontSize = 12.sp,
                                    color = GoldAccent
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        Text(
                            text = "📍 ${event.venue?.city ?: event.venue?.address ?: "पुणे, महाराष्ट्र"}",
                            fontSize = 11.sp,
                            color = Color(0xFF94A3B8)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        // Amenities Badges Grid
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            AmenityBadge(icon = "🅿️", text = "पार्किंग सोय")
                            AmenityBadge(icon = "🍿", text = "उपाहारगृह / कॅन्टीन")
                            AmenityBadge(icon = "❄️", text = "वातानुकूलित (AC)")
                            AmenityBadge(icon = "🔊", text = "डॉल्बी साऊंड")
                            AmenityBadge(icon = "♿", text = "व्हीलचेअर प्रवेश")
                        }
                    }
                }
            }

            // 6. Showtime / Session Selector
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "प्रयोग वेळ निवडा (Select Showtime)",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    if (allSessions.isEmpty()) {
                        Surface(
                            color = Color(0xFF1E293B),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "या कार्यक्रमासाठी सध्या कोणतेही थेट सत्र उपलब्ध नाही.",
                                color = Color(0xFF94A3B8),
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
                                } catch (e: Exception) {
                                    "आज"
                                }
                                val formattedTime = try {
                                    val dt = ZonedDateTime.parse(session.sessionStartTime)
                                    dt.format(DateTimeFormatter.ofPattern("hh:mm a"))
                                } catch (e: Exception) {
                                    "07:00 PM"
                                }

                                Surface(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(12.dp))
                                        .clickable { selectedSessionId = session.id }
                                        .testTag("session_${session.id}"),
                                    color = if (isSelected) TheatricalCrimson else Color(0xFF1E293B),
                                    shape = RoundedCornerShape(12.dp),
                                    border = BorderStroke(
                                        1.dp,
                                        if (isSelected) TheatricalCrimsonLight else Color(0xFF334155)
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
                                            color = if (isSelected) Color.White else GoldAccent
                                        )
                                        Text(
                                            text = formattedDate,
                                            fontSize = 11.sp,
                                            color = if (isSelected) Color.White else Color(0xFF94A3B8)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 7. Sticky Bottom CTA Bar
        Surface(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth(),
            color = Color(0xFF131A29),
            tonalElevation = 8.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "तिकीट दर सुरू",
                        fontSize = 11.sp,
                        color = Color(0xFF94A3B8)
                    )
                    Text(
                        text = "₹$minPrice",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black,
                        color = GoldBright
                    )
                }

                Button(
                    onClick = {
                        val sessionToBook = selectedSession?.id ?: allSessions.firstOrNull()?.id ?: 0
                        if (sessionToBook != 0) {
                            onBookSession(sessionToBook, event.id)
                        }
                    },
                    enabled = allSessions.isNotEmpty(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = GoldAccent,
                        disabledContainerColor = Color(0xFF334155)
                    ),
                    modifier = Modifier
                        .height(48.dp)
                        .testTag("select_seats_cta_button")
                ) {
                    Text(
                        text = "जागा निवडा (Select Seats) 🎭",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.Black
                    )
                }
            }
        }
    }
}

@Composable
private fun AmenityBadge(icon: String, text: String) {
    Surface(
        color = Color(0xFF1E293B),
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = icon, fontSize = 12.sp)
            Spacer(modifier = Modifier.width(4.dp))
            Text(text = text, fontSize = 11.sp, color = Color(0xFFCBD5E1), fontWeight = FontWeight.Medium)
        }
    }
}
