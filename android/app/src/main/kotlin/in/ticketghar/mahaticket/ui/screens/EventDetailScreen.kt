package `in`.ticketghar.mahaticket.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.lazy.LazyRow
import coil.compose.AsyncImage
import `in`.ticketghar.mahaticket.MahaTicketApp
import `in`.ticketghar.mahaticket.model.EventItem
import `in`.ticketghar.mahaticket.model.SessionItem
import `in`.ticketghar.mahaticket.theme.*
import `in`.ticketghar.mahaticket.ui.viewmodel.EventViewModel
import `in`.ticketghar.mahaticket.ui.viewmodel.EventViewModelFactory
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

    LaunchedEffect(eventId) {
        eventViewModel.loadEventDetails(eventId)
    }

    val eventState by eventViewModel.eventDetailState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("कार्यक्रम तपशील") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        when (val state = eventState) {
            is `in`.ticketghar.mahaticket.ui.viewmodel.EventDetailUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = MahaPrimaryLight)
                }
            }
            is `in`.ticketghar.mahaticket.ui.viewmodel.EventDetailUiState.Success -> {
                EventDetailContent(
                    event = state.event,
                    onBookSession = onBookSession,
                    modifier = Modifier.padding(paddingValues)
                )
            }
            is `in`.ticketghar.mahaticket.ui.viewmodel.EventDetailUiState.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(state.message, color = MahaError)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { eventViewModel.loadEventDetails(eventId) }) {
                            Text("पुन्हा प्रयत्न करा")
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
    var contentVisible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        contentVisible = true
    }

    val posterAlpha by animateFloatAsState(
        targetValue = if (contentVisible) 1f else 0.7f,
        animationSpec = tween(300),
        label = "posterAlpha"
    )
    val posterScale by animateFloatAsState(
        targetValue = if (contentVisible) 1f else 1.04f,
        animationSpec = tween(350),
        label = "posterScale"
    )

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
        contentPadding = PaddingValues(bottom = 16.dp)
    ) {
        // Hero Poster Image with smooth entrance
        item {
            AsyncImage(
                model = event.posterUrl,
                contentDescription = event.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(300.dp)
                    .graphicsLayer {
                        alpha = posterAlpha
                        scaleX = posterScale
                        scaleY = posterScale
                    },
                contentScale = ContentScale.Crop
            )
        }

        // Title & Basic Info
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Text(
                    text = event.titleMr,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Text(
                    text = event.title,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Category & Language Pills
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = MaterialTheme.colorScheme.primaryContainer
                    ) {
                        Text(
                            text = event.categoryMr,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = MahaSurfaceVariant
                    ) {
                        Text(
                            text = event.language,
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Venue Info
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Column {
                        Text(
                            text = event.venue?.nameMr ?: "",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                        Text(
                            text = event.venue?.address ?: "",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Duration
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Schedule,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "कालावधी: ${event.durationMinutes} मिनिटे",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // Description Section
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Divider(color = MahaBorder)
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "विवरण",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = event.description,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 20.sp
                )
            }
        }

        // Sessions Section with animated date tabs
        item {
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "उपलब्ध शो (Available Shows)",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            Spacer(modifier = Modifier.height(10.dp))

            // Animated Date Filter Pills
            if (uniqueDates.size > 1) {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        val isAllSelected = selectedDateKey == "all"
                        val pillBg by animateColorAsState(
                            targetValue = if (isAllSelected) MaterialTheme.colorScheme.primary else MahaSurface,
                            animationSpec = tween(200),
                            label = "datePillBg"
                        )
                        val pillText by animateColorAsState(
                            targetValue = if (isAllSelected) Color.White else MahaTextPrimary,
                            animationSpec = tween(200),
                            label = "datePillText"
                        )

                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = pillBg,
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (isAllSelected) MaterialTheme.colorScheme.primary else MahaBorder
                            ),
                            modifier = Modifier
                                .height(36.dp)
                                .clickable { selectedDateKey = "all" }
                        ) {
                            Box(
                                modifier = Modifier.padding(horizontal = 14.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "सर्व तारखा",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = pillText
                                )
                            }
                        }
                    }

                    items(uniqueDates) { (dateKey, dateLabel) ->
                        val isDateSelected = selectedDateKey == dateKey
                        val pillBg by animateColorAsState(
                            targetValue = if (isDateSelected) MaterialTheme.colorScheme.primary else MahaSurface,
                            animationSpec = tween(200),
                            label = "datePillBg"
                        )
                        val pillText by animateColorAsState(
                            targetValue = if (isDateSelected) Color.White else MahaTextPrimary,
                            animationSpec = tween(200),
                            label = "datePillText"
                        )

                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = pillBg,
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (isDateSelected) MaterialTheme.colorScheme.primary else MahaBorder
                            ),
                            modifier = Modifier
                                .height(36.dp)
                                .clickable { selectedDateKey = dateKey }
                        ) {
                            Box(
                                modifier = Modifier.padding(horizontal = 14.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = dateLabel,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = pillText
                                )
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))
            }
        }

        items(filteredSessions) { session ->
            SessionCard(
                session = session,
                onBookClick = { onBookSession(session.id) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp)
            )
        }

        // No sessions state
        if (event.sessions.isNullOrEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "या कार्यक्रमासाठी सध्या कोणतेही शो उपलब्ध नाहीत",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}

@Composable
fun SessionCard(
    session: SessionItem,
    onBookClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val startDateTime = try {
        ZonedDateTime.parse(session.sessionStartTime)
    } catch (e: Exception) {
        null
    }

    val dateFormatter = DateTimeFormatter.ofPattern("d MMMM, yyyy")
    val timeFormatter = DateTimeFormatter.ofPattern("h:mm a")

    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp)
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
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Schedule,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = startDateTime.format(timeFormatter),
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                if (session.status == "sold_out") {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Sold Out",
                        fontSize = 11.sp,
                        color = MahaError,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Button(
                onClick = onBookClick,
                enabled = session.status == "available",
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                ),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("बुक करा", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
