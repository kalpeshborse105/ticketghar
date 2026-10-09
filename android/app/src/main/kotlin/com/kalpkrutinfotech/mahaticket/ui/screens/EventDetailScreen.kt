package com.kalpkrutinfotech.mahaticket.ui.screens

import android.content.Intent
import android.net.Uri
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
import androidx.compose.material.icons.outlined.Chair
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
import androidx.compose.ui.text.style.TextOverflow
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
            .background(Color(0xFFF9F9FF))
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
                StitchEventDetailContent(
                    event = event,
                    onNavigateBack = onNavigateBack,
                    onBookSession = onBookSession,
                    onWatchTrailer = { showTrailerModal = true },
                    onShareEvent = {
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(
                                Intent.EXTRA_TEXT,
                                "महाटिकिट वर हा लोकप्रिय प्रयोग पहा: ${BuildConfig.API_BASE_URL}/events/$eventId\n${event.titleMr.ifBlank { event.title }}"
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
                            color = Color(0xFFFEE2E2),
                            border = BorderStroke(1.dp, Color(0xFFDC2626)),
                            modifier = Modifier.size(72.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.WifiOff,
                                    contentDescription = null,
                                    tint = Color(0xFFDC2626),
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
                            color = TextSecondary,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(20.dp))
                        Button(
                            onClick = { eventViewModel.loadEventDetails(eventId) },
                            colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                            shape = RoundedCornerShape(12.dp)
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
private fun StitchEventDetailContent(
    event: EventItem,
    onNavigateBack: () -> Unit,
    onBookSession: (Int, Int) -> Unit,
    onWatchTrailer: () -> Unit,
    onShareEvent: () -> Unit
) {
    val context = LocalContext.current
    val allSessions = event.sessions ?: emptyList()
    var selectedSessionId by remember(allSessions) {
        mutableStateOf(allSessions.firstOrNull()?.id ?: 1)
    }

    var selectedDateIndex by remember { mutableStateOf(0) }
    var isSynopsisExpanded by remember { mutableStateOf(false) }
    var isFavorite by remember { mutableStateOf(false) }

    // Accordion states
    var acc1Open by remember { mutableStateOf(false) }
    var acc2Open by remember { mutableStateOf(false) }
    var acc3Open by remember { mutableStateOf(false) }

    val selectedSession = remember(selectedSessionId, allSessions) {
        allSessions.find { it.id == selectedSessionId } ?: allSessions.firstOrNull()
    }

    val minPrice = remember(event) {
        val price = event.minPrice ?: 0
        if (price > 0) price / 100 else 250
    }

    val displayTitle = if (event.titleMr.isNotBlank()) event.titleMr else event.title
    val venueName = event.venue?.nameMr?.ifBlank { event.venue.name } ?: "बालगंधर्व रंगमंदिर"
    val venueAddress = event.venue?.let {
        listOf(it.address, it.city).filter { s -> s.isNotBlank() }.joinToString(", ")
    } ?: "झाशीची राणी लक्ष्मीबाई चौक, JM Road, पुणे - ४११००५"

    Box(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 110.dp)
        ) {
            // 1. Top App Bar
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(
                            onClick = onNavigateBack,
                            modifier = Modifier
                                .size(40.dp)
                                .background(Color.White, CircleShape)
                                .border(1.dp, MahaBorder, CircleShape)
                                .testTag("detail_back_button")
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "मागे जा",
                                tint = TextPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = "Event Details",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = onShareEvent,
                            modifier = Modifier
                                .size(40.dp)
                                .background(Color.White, CircleShape)
                                .border(1.dp, MahaBorder, CircleShape)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Share,
                                contentDescription = "शेअर करा",
                                tint = TextPrimary,
                                modifier = Modifier.size(18.dp)
                            )
                        }

                        IconButton(
                            onClick = { isFavorite = !isFavorite },
                            modifier = Modifier
                                .size(40.dp)
                                .background(Color.White, CircleShape)
                                .border(1.dp, MahaBorder, CircleShape)
                        ) {
                            Icon(
                                imageVector = if (isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                                contentDescription = "आवडते",
                                tint = if (isFavorite) Color(0xFFDC2626) else TextPrimary,
                                modifier = Modifier.size(18.dp)
                            )
                        }

                        Surface(
                            shape = CircleShape,
                            color = MahaOrange,
                            modifier = Modifier.size(34.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.Person,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                }
            }

            // 2. Theatrical Poster Card with Cream Backdrop
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = Color(0xFFFFF7ED),
                        shape = RoundedCornerShape(20.dp),
                        shadowElevation = 2.dp,
                        border = BorderStroke(1.dp, Color(0xFFFFEDD5))
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(14.dp),
                                verticalAlignment = Alignment.Top
                            ) {
                                // 2:3 Theatre Poster Card
                                Box(
                                    modifier = Modifier
                                        .width(115.dp)
                                        .height(165.dp)
                                        .clip(RoundedCornerShape(14.dp))
                                        .background(MahaWarm)
                                ) {
                                    if (event.posterUrl.isNotBlank()) {
                                        AsyncImage(
                                            model = event.posterUrl,
                                            contentDescription = displayTitle,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier.fillMaxSize()
                                        )
                                    } else {
                                        Box(
                                            modifier = Modifier.fillMaxSize(),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text("🎭", fontSize = 36.sp)
                                        }
                                    }

                                    // Top Left Ribbon
                                    Surface(
                                        color = MahaOrange,
                                        shape = RoundedCornerShape(topStart = 14.dp, bottomEnd = 10.dp),
                                        modifier = Modifier.align(Alignment.TopStart)
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = "मराठी नाटक",
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White
                                            )
                                        }
                                    }
                                }

                                // Headline & Badges
                                Column(
                                    modifier = Modifier.weight(1f),
                                    verticalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Surface(
                                            color = Color(0xFFFFEDD5),
                                            shape = RoundedCornerShape(12.dp)
                                        ) {
                                            Text(
                                                text = "✓ महाटिकिट प्रमाणित",
                                                fontSize = 9.5.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = MahaOrangeDeep,
                                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                                            )
                                        }

                                        Surface(
                                            color = MahaOrange.copy(alpha = 0.12f),
                                            shape = RoundedCornerShape(12.dp)
                                        ) {
                                            Text(
                                                text = "१००+ प्रयोग",
                                                fontSize = 9.5.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = MahaOrangeDeep,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                                            )
                                        }
                                    }

                                    Text(
                                        text = displayTitle,
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Black,
                                        color = TextPrimary,
                                        lineHeight = 24.sp
                                    )

                                    Text(
                                        text = if (event.title.isNotBlank()) "${event.title} • दिग्दर्शन: चंद्रकांत कुलकर्णी" else "दिग्दर्शन: चंद्रकांत कुलकर्णी",
                                        fontSize = 11.5.sp,
                                        color = TextSecondary,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis
                                    )

                                    // Rating & Review Tag Box
                                    Surface(
                                        color = Color.White.copy(alpha = 0.9f),
                                        shape = RoundedCornerShape(10.dp),
                                        border = BorderStroke(1.dp, Color(0xFFFFEDD5)),
                                        modifier = Modifier.fillMaxWidth().padding(top = 4.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(
                                                Icons.Default.Star,
                                                contentDescription = null,
                                                tint = Color(0xFFF59E0B),
                                                modifier = Modifier.size(16.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(
                                                text = "९.६",
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.Black,
                                                color = TextPrimary
                                            )
                                            Text(
                                                text = "/१०",
                                                fontSize = 10.sp,
                                                color = TextSecondary
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Box(
                                                modifier = Modifier
                                                    .width(1.dp)
                                                    .height(12.dp)
                                                    .background(Color(0xFFE2E8F0))
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                text = "३.५k नाट्यप्रेमी मते",
                                                fontSize = 10.sp,
                                                color = TextSecondary
                                            )
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // Quick Chips Ribbon
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                listOf(
                                    "🎭 मराठी भाषा",
                                    "⏱️ ${if (event.durationMinutes > 0) "${event.durationMinutes} मि." else "२ तास १५ मि."}",
                                    "👨‍👩‍👧 कौटुंबिक / विनोद",
                                    "🛡️ U/A सर्व वयोगट"
                                ).forEach { chip ->
                                    Surface(
                                        color = Color.White,
                                        shape = RoundedCornerShape(16.dp),
                                        border = BorderStroke(1.dp, Color(0xFFFFEDD5))
                                    ) {
                                        Text(
                                            text = chip,
                                            fontSize = 10.5.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = TextPrimary,
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 3. Cast & Crew Section (नाट्य कलाकार व दिग्दर्शक)
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .width(4.dp)
                                    .height(16.dp)
                                    .background(MahaOrange, RoundedCornerShape(2.dp))
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "नाट्य कलाकार व दिग्दर्शक",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                        }
                        Text(
                            text = "सर्व पहा",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MahaOrange
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        val artists = listOf(
                            Triple("प्रसाद ओक", "मुख्य भूमिका", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"),
                            Triple("मुक्ता बर्वे", "मुख्य भूमिका", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200"),
                            Triple("चंद्रकांत कुलकर्णी", "दिग्दर्शक", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"),
                            Triple("क्षिती जोग", "निर्माते", "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200")
                        )

                        artists.forEach { (name, role, imgUrl) ->
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.width(72.dp)
                            ) {
                                AsyncImage(
                                    model = imgUrl,
                                    contentDescription = name,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .size(60.dp)
                                        .clip(CircleShape)
                                        .border(1.5.dp, Color(0xFFFFEDD5), CircleShape)
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = name,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = role,
                                    fontSize = 9.5.sp,
                                    color = TextSecondary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }
            }

            // 4. Synopsis Section (नाट्य कथानक)
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .width(4.dp)
                                .height(16.dp)
                                .background(MahaOrange, RoundedCornerShape(2.dp))
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "नाट्य कथानक (Synopsis)",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, MahaBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            val synopsisText = event.description.ifBlank {
                                "आजच्या वेगवान आधुनिक युगात नातेसंबंध टिकवताना आपण नकळत काही 'नियम व अटी' लादतो का? एका सुशिक्षित जोडप्याच्या संसारातील खुसखुशीत संवाद, विनोदी क्षण आणि विचार करायला लावणारी भावनिक वळणे या नाटकामध्ये उत्कृष्टपणे गुंफली आहेत. प्रसाद ओक आणि मुक्ता बर्वे यांच्यातील सहजसुंदर जुगलबंदी प्रेक्षकांना खिळवून ठेवते."
                            }

                            Text(
                                text = synopsisText,
                                fontSize = 12.5.sp,
                                color = TextPrimary.copy(alpha = 0.9f),
                                lineHeight = 20.sp,
                                maxLines = if (isSynopsisExpanded) Int.MAX_VALUE else 3,
                                overflow = TextOverflow.Ellipsis
                            )

                            Spacer(modifier = Modifier.height(6.dp))

                            Text(
                                text = if (isSynopsisExpanded) "कमी करा ▴" else "अधिक वाचा... ▾",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = MahaOrange,
                                modifier = Modifier
                                    .clickable { isSynopsisExpanded = !isSynopsisExpanded }
                                    .padding(vertical = 2.dp)
                            )
                        }
                    }
                }
            }

            // 5. Date Selection Carousel (प्रयोग तारीख निवडा)
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .width(4.dp)
                                    .height(16.dp)
                                    .background(MahaOrange, RoundedCornerShape(2.dp))
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "प्रयोग तारीख निवडा",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                Icons.Default.CalendarToday,
                                contentDescription = null,
                                tint = MahaOrange,
                                modifier = Modifier.size(14.dp)
                            )
                            Text(
                                text = "ऑक्टोबर २०२४",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = MahaOrange
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    val dateList = listOf(
                        Triple("आज", "१२", "शनिवार"),
                        Triple("उद्या", "१३", "रविवार"),
                        Triple("सोम", "१४", "ऑक्टोबर"),
                        Triple("मंगळ", "१५", "ऑक्टोबर"),
                        Triple("पुढील", "१९", "शनि (विशेष)")
                    )

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        dateList.forEachIndexed { idx, (tag, day, sub) ->
                            val isSelected = selectedDateIndex == idx
                            Surface(
                                modifier = Modifier
                                    .width(74.dp)
                                    .clip(RoundedCornerShape(14.dp))
                                    .clickable { selectedDateIndex = idx },
                                color = if (isSelected) MahaOrange else Color.White,
                                shape = RoundedCornerShape(14.dp),
                                border = BorderStroke(
                                    1.dp,
                                    if (isSelected) MahaOrange else MahaBorder
                                ),
                                shadowElevation = if (isSelected) 3.dp else 1.dp
                            ) {
                                Column(
                                    modifier = Modifier.padding(vertical = 10.dp, horizontal = 4.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(
                                        text = tag,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isSelected) Color.White.copy(alpha = 0.9f) else TextSecondary
                                    )
                                    Text(
                                        text = day,
                                        fontSize = 20.sp,
                                        fontWeight = FontWeight.Black,
                                        color = if (isSelected) Color.White else TextPrimary
                                    )
                                    Text(
                                        text = sub,
                                        fontSize = 9.5.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = if (isSelected) Color.White.copy(alpha = 0.9f) else TextSecondary
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // 6. Available Shows & Times (उपलब्ध प्रयोग व वेळा)
            item {
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
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .width(4.dp)
                                    .height(16.dp)
                                    .background(MahaOrange, RoundedCornerShape(2.dp))
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "उपलब्ध प्रयोग व वेळा",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                        }
                        Text(
                            text = "पुणे केंद्र",
                            fontSize = 11.sp,
                            color = TextSecondary
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Show 1: Afternoon Show
                    val session1Id = allSessions.getOrNull(0)?.id ?: 1
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, if (selectedSessionId == session1Id) MahaOrange else MahaBorder),
                        shadowElevation = 1.dp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedSessionId = session1Id }
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top
                            ) {
                                Column {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text(
                                            text = "०४:३० PM",
                                            fontSize = 17.sp,
                                            fontWeight = FontWeight.Black,
                                            color = TextPrimary
                                        )
                                        Surface(
                                            color = Color(0xFFF1F3FF),
                                            shape = RoundedCornerShape(8.dp)
                                        ) {
                                            Text(
                                                text = "दुपारचा शो",
                                                fontSize = 10.sp,
                                                color = TextSecondary,
                                                fontWeight = FontWeight.Medium,
                                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                                            )
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "$venueName, JM Road पुणे",
                                        fontSize = 12.sp,
                                        color = TextSecondary
                                    )
                                }

                                Surface(
                                    color = Color(0xFFDCFCE7),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text(
                                        text = "● उपलब्ध (७२ जागा)",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF16A34A),
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "तिकीट दर श्रेणी",
                                        fontSize = 10.5.sp,
                                        color = TextSecondary
                                    )
                                    Text(
                                        text = "₹२५० - ₹६००",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary
                                    )
                                }

                                Button(
                                    onClick = {
                                        selectedSessionId = session1Id
                                        onBookSession(session1Id, event.id)
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.height(38.dp)
                                ) {
                                    Icon(
                                        Icons.Outlined.Chair,
                                        contentDescription = null,
                                        modifier = Modifier.size(15.dp),
                                        tint = Color.White
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "आसन निवडा",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Show 2: Evening Prime Show
                    val session2Id = allSessions.getOrNull(1)?.id ?: 2
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, if (selectedSessionId == session2Id) MahaOrange else MahaBorder),
                        shadowElevation = 1.dp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedSessionId = session2Id }
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top
                            ) {
                                Column {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text(
                                            text = "०८:०० PM",
                                            fontSize = 17.sp,
                                            fontWeight = FontWeight.Black,
                                            color = TextPrimary
                                        )
                                        Surface(
                                            color = Color(0xFFF1F3FF),
                                            shape = RoundedCornerShape(8.dp)
                                        ) {
                                            Text(
                                                text = "संध्याकाळचा शो",
                                                fontSize = 10.sp,
                                                color = TextSecondary,
                                                fontWeight = FontWeight.Medium,
                                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                                            )
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "$venueName, JM Road पुणे",
                                        fontSize = 12.sp,
                                        color = TextSecondary
                                    )
                                }

                                Surface(
                                    color = Color(0xFFFEF3C7),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text(
                                        text = "⚠️ फक्त १२ जागा शिल्लक!",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFFD97706),
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "तिकीट दर श्रेणी",
                                        fontSize = 10.5.sp,
                                        color = TextSecondary
                                    )
                                    Text(
                                        text = "₹३०० - ₹७००",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary
                                    )
                                }

                                Button(
                                    onClick = {
                                        selectedSessionId = session2Id
                                        onBookSession(session2Id, event.id)
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFF7ED)),
                                    shape = RoundedCornerShape(10.dp),
                                    border = BorderStroke(1.dp, Color(0xFFFFEDD5)),
                                    modifier = Modifier.height(38.dp)
                                ) {
                                    Icon(
                                        Icons.Outlined.Chair,
                                        contentDescription = null,
                                        modifier = Modifier.size(15.dp),
                                        tint = MahaOrange
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "आसन निवडा",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MahaOrange
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // 7. Venue Information & Amenities Card
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .width(4.dp)
                                .height(16.dp)
                                .background(MahaOrange, RoundedCornerShape(2.dp))
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "नाट्यगृह माहिती व सुविधा",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, MahaBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("🏛️", fontSize = 16.sp)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = venueName,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                            }
                            Text(
                                text = venueAddress,
                                fontSize = 11.5.sp,
                                color = TextSecondary,
                                modifier = Modifier.padding(top = 2.dp)
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            // 4 Amenities Chips
                            val amenities = listOf(
                                "❄️ पूर्णतः वातानुकूलित (AC)",
                                "🅿️ विनामूल्य पार्किंग",
                                "♿ व्हीलचेअर सुलभ प्रवेश",
                                "🍴 कॅफेटेरिया (अल्पोपहार)"
                            )

                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Surface(
                                        color = Color(0xFFFFF7ED),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text(
                                            text = amenities[0],
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = TextPrimary,
                                            modifier = Modifier.padding(8.dp)
                                        )
                                    }
                                    Surface(
                                        color = Color(0xFFFFF7ED),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text(
                                            text = amenities[1],
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = TextPrimary,
                                            modifier = Modifier.padding(8.dp)
                                        )
                                    }
                                }
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Surface(
                                        color = Color(0xFFFFF7ED),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text(
                                            text = amenities[2],
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = TextPrimary,
                                            modifier = Modifier.padding(8.dp)
                                        )
                                    }
                                    Surface(
                                        color = Color(0xFFFFF7ED),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text(
                                            text = amenities[3],
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = TextPrimary,
                                            modifier = Modifier.padding(8.dp)
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            // Metro Directions Strip
                            Surface(
                                color = Color(0xFFF1F3FF),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 12.dp, vertical = 8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text("🚇", fontSize = 14.sp)
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "शिवाजीनगर मेट्रो स्थानकापासून ५०० मी.",
                                            fontSize = 11.sp,
                                            color = TextPrimary,
                                            fontWeight = FontWeight.Medium
                                        )
                                    }

                                    Text(
                                        text = "नकाशा उघडा",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MahaOrange,
                                        modifier = Modifier.clickable {
                                            val gmmIntentUri = Uri.parse("geo:0,0?q=${Uri.encode(venueName + ", " + venueAddress)}")
                                            val mapIntent = Intent(Intent.ACTION_VIEW, gmmIntentUri)
                                            mapIntent.setPackage("com.google.android.apps.maps")
                                            try {
                                                context.startActivity(mapIntent)
                                            } catch (_: Exception) {
                                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://maps.google.com/?q=${Uri.encode(venueName)}")))
                                            }
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // 8. Rules & Advisory Accordions (नाट्यगृह नियम व अटी)
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .width(4.dp)
                                .height(16.dp)
                                .background(MahaOrange, RoundedCornerShape(2.dp))
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "नाट्यगृह नियम व अटी (Advisory)",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Accordion 1
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, MahaBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { acc1Open = !acc1Open }
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "📋 प्रवेश व वेळेचे नियम",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Icon(
                                    imageVector = if (acc1Open) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                    contentDescription = null,
                                    tint = TextSecondary
                                )
                            }
                            if (acc1Open) {
                                Text(
                                    text = "प्रयोग सुरू होण्यापूर्वी किमान २० मिनिटे आधी नाट्यगृहात पोहोचावे. तिसरी घंटा वाजल्यानंतर सभागृहात प्रवेश दिला जाणार नाही. मोबाईल सायलेंट ठेवावेत.",
                                    fontSize = 12.sp,
                                    color = TextSecondary,
                                    lineHeight = 18.sp,
                                    modifier = Modifier.padding(start = 14.dp, end = 14.dp, bottom = 14.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Accordion 2
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, MahaBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { acc2Open = !acc2Open }
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "💳 रद्द करणे व परतावा धोरण",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Icon(
                                    imageVector = if (acc2Open) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                    contentDescription = null,
                                    tint = TextSecondary
                                )
                            }
                            if (acc2Open) {
                                Text(
                                    text = "तिकीट आरक्षित झाल्यानंतर रद्द केले जाऊ शकत नाही. प्रयोग रद्द झाल्यास किंवा वेळ बदलल्यास महाटिकिट वॉलेटमध्ये संपूर्ण परतावा तात्काळ जमा करण्यात येईल.",
                                    fontSize = 12.sp,
                                    color = TextSecondary,
                                    lineHeight = 18.sp,
                                    modifier = Modifier.padding(start = 14.dp, end = 14.dp, bottom = 14.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Accordion 3
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, MahaBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { acc3Open = !acc3Open }
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "🚗 वाहन पार्किंग सल्ला",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Icon(
                                    imageVector = if (acc3Open) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                    contentDescription = null,
                                    tint = TextSecondary
                                )
                            }
                            if (acc3Open) {
                                Text(
                                    text = "नाट्यगृह परिसरातील वाहन पार्किंग आधी येणाऱ्यास प्राधान्य या तत्त्वावर विनामूल्य उपलब्ध आहे. गर्दी टाळण्यासाठी सार्वजनिक वाहतूक किंवा मेट्रोचा वापर करावा.",
                                    fontSize = 12.sp,
                                    color = TextSecondary,
                                    lineHeight = 18.sp,
                                    modifier = Modifier.padding(start = 14.dp, end = 14.dp, bottom = 14.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // 9. Sticky Bottom Floating Quick-Booking Bar
        Surface(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth(),
            color = Color.White.copy(alpha = 0.98f),
            shadowElevation = 16.dp,
            border = BorderStroke(1.dp, MahaBorder)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = "आज १२ शनि",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = MahaOrange
                        )
                        Text(
                            text = "•",
                            fontSize = 11.sp,
                            color = TextSecondary
                        )
                        Text(
                            text = if (selectedSessionId == (allSessions.getOrNull(1)?.id ?: 2)) "०८:०० PM संध्याकाळ" else "०४:३० PM दुपार",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = "₹$minPrice - ₹६००",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary
                        )
                        Text(
                            text = "+ कर",
                            fontSize = 10.sp,
                            color = TextSecondary
                        )
                    }
                }

                Button(
                    onClick = {
                        val sessionToBook = selectedSession?.id ?: allSessions.firstOrNull()?.id ?: 1
                        onBookSession(sessionToBook, event.id)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .height(48.dp)
                        .testTag("select_seats_cta_button")
                ) {
                    Text(
                        text = "आसन निवडा",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Icon(
                        Icons.Default.ArrowForward,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}
