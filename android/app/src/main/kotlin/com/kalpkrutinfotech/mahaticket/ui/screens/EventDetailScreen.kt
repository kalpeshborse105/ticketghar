package com.kalpkrutinfotech.mahaticket.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.*
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.kalpkrutinfotech.mahaticket.BuildConfig
import com.kalpkrutinfotech.mahaticket.MahaTicketApp
import com.kalpkrutinfotech.mahaticket.model.EventItem
import com.kalpkrutinfotech.mahaticket.model.SessionItem
import com.kalpkrutinfotech.mahaticket.theme.*
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
    onBookSession: (Int) -> Unit
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as MahaTicketApp
    val eventViewModel: EventViewModel = viewModel(
        factory = EventViewModelFactory(app.eventRepository, app.networkMonitor)
    )
    val context = LocalContext.current

    LaunchedEffect(eventId) {
        eventViewModel.loadEventDetails(eventId)
    }

    val eventState by eventViewModel.eventDetailState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "कार्यक्रम तपशील",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }
                },
                actions = {
                    IconButton(onClick = {
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(
                                Intent.EXTRA_TEXT,
                                "MahaTicket वर हा लोकप्रिय कार्यक्रम पहा: ${BuildConfig.API_BASE_URL}/events/$eventId"
                            )
                        }
                        context.startActivity(Intent.createChooser(shareIntent, "कार्यक्रम शेअर करा"))
                    }) {
                        Icon(
                            Icons.Default.Share,
                            contentDescription = "Share",
                            tint = Color(0xFFEA580C)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        when (val state = eventState) {
            is EventDetailUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Color(0xFFEA580C))
                }
            }
            is EventDetailUiState.Success -> {
                EventDetailContent(
                    event = state.event,
                    onBookSession = onBookSession,
                    modifier = Modifier.padding(paddingValues)
                )
            }
            is EventDetailUiState.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.ErrorOutline,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(state.message, color = MaterialTheme.colorScheme.onSurface)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { eventViewModel.loadEventDetails(eventId) },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C))
                        ) {
                            Text("पुन्हा प्रयत्न करा", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun EventDetailContent(
    event: EventItem,
    onBookSession: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val allSessions = event.sessions ?: emptyList()

    val uniqueDates = remember(allSessions) {
        allSessions.mapNotNull { session ->
            try {
                val dt = ZonedDateTime.parse(session.sessionStartTime)
                dt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) to dt.format(DateTimeFormatter.ofPattern("EEE, d MMM"))
            } catch (e: Exception) {
                null
            }
        }.distinctBy { it.first }
    }
    var selectedDateKey by remember { mutableStateOf("all") }

    val filteredSessions = remember(selectedDateKey, allSessions) {
        if (selectedDateKey == "all") {
            allSessions
        } else {
            allSessions.filter { session ->
                try {
                    val dt = ZonedDateTime.parse(session.sessionStartTime)
                    dt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) == selectedDateKey
                } catch (e: Exception) {
                    true
                }
            }
        }
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Hero Poster Container with Gradient Overlay
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(280.dp)
            ) {
                AsyncImage(
                    model = event.posterUrl.ifBlank { "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800" },
                    contentDescription = event.title,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )

                // Dramatic Dark Gradient Scrim
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.5f),
                                    Color.Black.copy(alpha = 0.95f)
                                ),
                                startY = 80f
                            )
                        )
                )

                // Poster Bottom Overlay Title & Badges
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(16.dp)
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = Color(0xFFEA580C)
                        ) {
                            Text(
                                text = event.language.ifBlank { "मराठी" },
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }

                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = Color.White.copy(alpha = 0.25f)
                        ) {
                            Text(
                                text = event.categoryMr.ifBlank { event.category },
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }

                        if (event.durationMinutes > 0) {
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = Color.White.copy(alpha = 0.2f)
                            ) {
                                Text(
                                    text = "${event.durationMinutes} मिनिटे",
                                    fontSize = 10.sp,
                                    color = Color.White,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = event.titleMr.ifBlank { event.title },
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )

                    if (event.titleMr.isNotBlank()) {
                        Text(
                            text = event.title,
                            fontSize = 13.sp,
                            color = Color.White.copy(alpha = 0.8f)
                        )
                    }
                }
            }
        }

        // Venue & Theater Information Card
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, Color(0xFFE5E7EB)),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Row(
                            verticalAlignment = Alignment.Top,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Color(0xFFFFF7ED)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.LocationOn,
                                    contentDescription = null,
                                    tint = Color(0xFFEA580C),
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Column {
                                Text(
                                    text = event.venue?.nameMr ?: event.venue?.name ?: "नाट्यगृह",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "${event.venue?.address ?: "पत्ता उपलब्ध नाही"} • ${event.venue?.city ?: "महाराष्ट्र"}",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    lineHeight = 16.sp
                                )
                            }
                        }

                        // View on Map Button
                        val venueAddress = "${event.venue?.name ?: ""} ${event.venue?.city ?: ""}"
                        IconButton(onClick = {
                            val mapUri = Uri.parse("geo:0,0?q=" + Uri.encode(venueAddress))
                            val mapIntent = Intent(Intent.ACTION_VIEW, mapUri)
                            context.startActivity(mapIntent)
                        }) {
                            Icon(
                                Icons.Default.Directions,
                                contentDescription = "Directions",
                                tint = Color(0xFFEA580C)
                            )
                        }
                    }
                }
            }
        }

        // About the Show / Description Section
        if (event.description.isNotBlank()) {
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, Color(0xFFE5E7EB))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                Icons.Default.Info,
                                contentDescription = null,
                                tint = Color(0xFFEA580C),
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "कार्यक्रमाबद्दल (About the Show)",
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = event.description,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            lineHeight = 20.sp
                        )
                    }
                }
            }
        }

        // Available Shows & Dates Section
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "उपलब्ध शो (Available Shows)",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                    Text(
                        text = "${filteredSessions.size} शो उपलब्ध",
                        fontSize = 12.sp,
                        color = Color(0xFFEA580C),
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }

        // Date Tabs
        if (uniqueDates.size > 1) {
            item {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        val isAllSelected = selectedDateKey == "all"
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = if (isAllSelected) Color(0xFFEA580C) else MaterialTheme.colorScheme.surface,
                            border = BorderStroke(1.dp, if (isAllSelected) Color(0xFFEA580C) else Color(0xFFE5E7EB)),
                            modifier = Modifier.clickable { selectedDateKey = "all" }
                        ) {
                            Text(
                                text = "सर्व तारखा",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isAllSelected) Color.White else MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                            )
                        }
                    }

                    items(uniqueDates) { (dateKey, dateLabel) ->
                        val isDateSelected = selectedDateKey == dateKey
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = if (isDateSelected) Color(0xFFEA580C) else MaterialTheme.colorScheme.surface,
                            border = BorderStroke(1.dp, if (isDateSelected) Color(0xFFEA580C) else Color(0xFFE5E7EB)),
                            modifier = Modifier.clickable { selectedDateKey = dateKey }
                        ) {
                            Text(
                                text = dateLabel,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isDateSelected) Color.White else MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                            )
                        }
                    }
                }
            }
        }

        // Show Sessions
        items(filteredSessions) { session ->
            ModernSessionCard(
                session = session,
                onBookClick = { onBookSession(session.id) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            )
        }

        if (allSessions.isEmpty()) {
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, Color(0xFFE5E7EB))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "या कार्यक्रमासाठी सध्या पुढील तारखांचे शो निश्चित होत आहेत. कृपया लवकरच पुन्हा तपासा.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 13.sp,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ModernSessionCard(
    session: SessionItem,
    onBookClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val startDateTime = try {
        ZonedDateTime.parse(session.sessionStartTime)
    } catch (e: Exception) {
        null
    }

    val dateFormatter = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy")
    val timeFormatter = DateTimeFormatter.ofPattern("h:mm a")

    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, Color(0xFFE5E7EB)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                if (startDateTime != null) {
                    Text(
                        text = startDateTime.format(dateFormatter),
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            Icons.Default.Schedule,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = Color(0xFFEA580C)
                        )
                        Text(
                            text = startDateTime.format(timeFormatter),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFFEA580C)
                        )
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = Color(0xFFECFDF5)
                        ) {
                            Text(
                                text = "उपलब्ध",
                                fontSize = 10.sp,
                                color = Color(0xFF059669),
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }

                if (session.status == "sold_out") {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "सर्व जागा भरल्या (Sold Out)",
                        fontSize = 11.sp,
                        color = MahaError,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Button(
                onClick = onBookClick,
                enabled = session.status != "sold_out",
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)),
                shape = RoundedCornerShape(10.dp),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Icon(
                    Icons.Default.ConfirmationNumber,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text("जागा निवडा", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
