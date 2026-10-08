package com.kalpkrutinfotech.mahaticket.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import coil.compose.AsyncImage
import com.kalpkrutinfotech.mahaticket.BookingRoutes
import com.kalpkrutinfotech.mahaticket.data.api.AnnouncementResponse
import com.kalpkrutinfotech.mahaticket.data.api.CityCatalogItem
import com.kalpkrutinfotech.mahaticket.model.Event
import com.kalpkrutinfotech.mahaticket.model.EventCategory
import com.kalpkrutinfotech.mahaticket.model.EventItem
import com.kalpkrutinfotech.mahaticket.model.toEvent
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.components.TrailerPreviewDialog
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventViewModel
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventsUiState

@Composable
fun HomeScreenWithViewModel(
    viewModel: EventViewModel,
    navController: NavHostController
) {
    val eventsState by viewModel.eventsState.collectAsState()
    val selectedCategory by viewModel.selectedCategory.collectAsState()
    val selectedCity by viewModel.selectedCity.collectAsState()
    val cities by viewModel.cities.collectAsState()
    val announcements by viewModel.announcements.collectAsState()

    var showCityDialog by remember { mutableStateOf(false) }

    HomeScreen(
        eventsState = eventsState,
        selectedCategory = selectedCategory,
        selectedCity = selectedCity,
        cities = cities.map { it.name },
        announcements = announcements,
        onSelectEvent = { event ->
            navController.navigate(BookingRoutes.eventDetail(event.id))
        },
        onCategorySelected = { viewModel.selectCategory(it) },
        onCitySelected = { viewModel.selectCity(it) },
        onSearch = { viewModel.searchEvents(it) },
        onRetry = { viewModel.loadEvents() }
    )
}

@Composable
fun HomeScreen(
    eventsState: EventsUiState,
    selectedCategory: String,
    selectedCity: String,
    cities: List<String> = emptyList(),
    announcements: List<AnnouncementResponse> = emptyList(),
    onSelectEvent: (EventItem) -> Unit,
    onCategorySelected: (String) -> Unit,
    onCitySelected: (String) -> Unit = {},
    onSearch: (String) -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedTrailerEvent by remember { mutableStateOf<Event?>(null) }

    val rawEvents = when (eventsState) {
        is EventsUiState.Success -> eventsState.events
        else -> emptyList()
    }

    val mappedEvents = remember(rawEvents) {
        rawEvents.map { it.toEvent() }
    }

    // Filter events by query, city, and category
    val filteredEvents = remember(mappedEvents, selectedCategory, selectedCity, searchQuery) {
        mappedEvents.filter { event ->
            val matchCat = selectedCategory == "all" || selectedCategory == "सर्व कार्यक्रम" ||
                    event.category.name.equals(selectedCategory, ignoreCase = true) ||
                    (selectedCategory == "plays" && event.category == EventCategory.NATAK) ||
                    (selectedCategory == "music" && event.category == EventCategory.CONCERT) ||
                    (selectedCategory == "comedy" && event.category == EventCategory.COMEDY) ||
                    (selectedCategory == "movies" && event.category == EventCategory.CINEMA)

            val matchCity = selectedCity.contains("All", ignoreCase = true) ||
                    selectedCity.contains("महाराष्ट्र", ignoreCase = true) ||
                    event.venue.city.contains(selectedCity, ignoreCase = true)

            val matchQuery = searchQuery.isBlank() ||
                    event.titleEn.contains(searchQuery, ignoreCase = true) ||
                    event.titleMr.contains(searchQuery, ignoreCase = true) ||
                    event.venue.nameMr.contains(searchQuery, ignoreCase = true) ||
                    event.venue.nameEn.contains(searchQuery, ignoreCase = true)

            matchCat && matchCity && matchQuery
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(CinemaBg)
            .testTag("home_screen_feed")
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 90.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // City Filter Pills & Search Bar
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    // City Filter Pills
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = "📍", fontSize = 14.sp)
                        val cityList = if (cities.isNotEmpty()) listOf("महाराष्ट्र (All)") + cities else listOf("महाराष्ट्र (All)", "पुणे", "मुंबई", "नाशिक", "ठाणे")
                        cityList.forEach { city ->
                            val isSelected = selectedCity.equals(city, ignoreCase = true) ||
                                    (city.contains("All") && (selectedCity.contains("All") || selectedCity.contains("महाराष्ट्र")))
                            Surface(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(16.dp))
                                    .clickable { onCitySelected(city) }
                                    .testTag("city_filter_$city"),
                                color = if (isSelected) TheatricalCrimson else Color(0xFF1E293B),
                                shape = RoundedCornerShape(16.dp),
                                border = BorderStroke(1.dp, if (isSelected) TheatricalCrimsonLight else Color(0xFF334155))
                            ) {
                                Text(
                                    text = city,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = Color.White,
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Search Input
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = {
                            searchQuery = it
                            onSearch(it)
                        },
                        placeholder = {
                            Text(
                                text = "नाटक, चित्रपट, किंवा सभागृह शोधा...",
                                fontSize = 13.sp,
                                color = Color(0xFF64748B)
                            )
                        },
                        leadingIcon = {
                            Icon(
                                imageVector = Icons.Outlined.Search,
                                contentDescription = "Search",
                                tint = GoldAccent
                            )
                        },
                        trailingIcon = {
                            if (searchQuery.isNotEmpty()) {
                                IconButton(onClick = {
                                    searchQuery = ""
                                    onSearch("")
                                }) {
                                    Icon(
                                        imageVector = Icons.Default.Close,
                                        contentDescription = "Clear",
                                        tint = Color(0xFF94A3B8),
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("home_search_bar"),
                        shape = RoundedCornerShape(14.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = GoldAccent,
                            unfocusedBorderColor = Color(0xFF334155),
                            focusedContainerColor = Color(0xFF131A29),
                            unfocusedContainerColor = Color(0xFF131A29),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        ),
                        singleLine = true
                    )
                }
            }

            // Hero Spotlight Banner
            item {
                val featured = mappedEvents.firstOrNull()
                if (featured != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                            .clip(RoundedCornerShape(18.dp))
                            .background(TheatricalCrimsonDark)
                            .clickable {
                                val originalItem = rawEvents.firstOrNull { it.id.toString() == featured.id }
                                if (originalItem != null) onSelectEvent(originalItem)
                            }
                            .testTag("hero_spotlight_banner")
                    ) {
                        AsyncImage(
                            model = featured.posterUrl,
                            contentDescription = featured.titleEn,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(175.dp)
                        )

                        // Gradient overlay
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(175.dp)
                                .background(
                                    Brush.verticalGradient(
                                        colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.88f))
                                    )
                                )
                        )

                        // Content on banner
                        Column(
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .padding(14.dp)
                        ) {
                            Surface(
                                color = TheatricalCrimson,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "🔥 हाऊसफुल्ल नाट्यप्रयोग / FEATURED",
                                    color = Color.White,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = featured.titleMr,
                                color = Color.White,
                                fontSize = 17.sp,
                                fontWeight = FontWeight.Black
                            )
                            Text(
                                text = "📍 ${featured.venue.nameMr} • ${featured.availableShowtimes.firstOrNull()?.timeText ?: "संध्याकाळी प्रयोग"}",
                                color = GoldBright,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }

            // Category Filter Pills
            item {
                Column(modifier = Modifier.padding(vertical = 4.dp)) {
                    Text(
                        text = "कला प्रकार निवडा (Categories)",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                    )

                    val categories = listOf(
                        "all" to "सर्व (All)",
                        "plays" to "🎭 नाटक",
                        "music" to "🎵 संगीत",
                        "comedy" to "😄 कॉमेडी",
                        "movies" to "🎬 चित्रपट"
                    )

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        categories.forEach { (catId, catLabel) ->
                            val isSelected = selectedCategory == catId
                            Surface(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(12.dp))
                                    .clickable { onCategorySelected(catId) }
                                    .testTag("cat_filter_$catId"),
                                color = if (isSelected) GoldAccent else Color(0xFF1E293B),
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(
                                    1.dp,
                                    if (isSelected) GoldBright else Color(0xFF334155)
                                )
                            ) {
                                Text(
                                    text = catLabel,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) Color.Black else Color.White,
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                                )
                            }
                        }
                    }
                }
            }

            // Section Header
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "🎭 आगामी नाट्यप्रयोग व कार्यक्रम",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text(
                        text = "${filteredEvents.size} उपलब्ध",
                        fontSize = 12.sp,
                        color = GoldAccent,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            // Loading / Error / Empty States
            when (eventsState) {
                is EventsUiState.Loading -> {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(220.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                CircularProgressIndicator(color = GoldAccent, modifier = Modifier.size(36.dp))
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(text = "कार्यक्रमांची यादी लोड होत आहे...", color = Color(0xFF94A3B8), fontSize = 13.sp)
                            }
                        }
                    }
                }
                is EventsUiState.Error -> {
                    item {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(20.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(text = "⚠️", fontSize = 28.sp)
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(text = eventsState.message, color = Color(0xFFF87171), fontSize = 13.sp)
                                Spacer(modifier = Modifier.height(12.dp))
                                Button(
                                    onClick = onRetry,
                                    colors = ButtonDefaults.buttonColors(containerColor = TheatricalCrimson)
                                ) {
                                    Text("पुन्हा प्रयत्न करा (Retry)", color = Color.White)
                                }
                            }
                        }
                    }
                }
                else -> {
                    if (filteredEvents.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(200.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "कोणतेही कार्यक्रम उपलब्ध नाहीत.",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 14.sp
                                )
                            }
                        }
                    } else {
                        // Events List (Cinematic Cards)
                        items(filteredEvents) { event ->
                            val rawItem = rawEvents.firstOrNull { it.id.toString() == event.id }
                            EventCardItem(
                                event = event,
                                onCardClick = { if (rawItem != null) onSelectEvent(rawItem) },
                                onBookClick = { if (rawItem != null) onSelectEvent(rawItem) },
                                onTrailerClick = { selectedTrailerEvent = event }
                            )
                        }
                    }
                }
            }
        }

        // Trailer Modal
        if (selectedTrailerEvent != null) {
            TrailerPreviewDialog(
                event = selectedTrailerEvent!!,
                language = AppLanguage.MARATHI,
                onDismiss = { selectedTrailerEvent = null },
                onBookNow = {
                    val rawItem = rawEvents.firstOrNull { it.id.toString() == selectedTrailerEvent?.id }
                    selectedTrailerEvent = null
                    if (rawItem != null) onSelectEvent(rawItem)
                }
            )
        }
    }
}

@Composable
private fun EventCardItem(
    event: Event,
    onCardClick: () -> Unit,
    onBookClick: () -> Unit,
    onTrailerClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp)
            .clickable { onCardClick() }
            .testTag("event_card_${event.id}"),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = CinemaSurface),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        border = BorderStroke(1.dp, CinemaBorder)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp)
            ) {
                // Event Poster
                Box(
                    modifier = Modifier
                        .size(width = 96.dp, height = 135.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF1E293B))
                ) {
                    AsyncImage(
                        model = event.posterUrl,
                        contentDescription = event.titleEn,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )

                    // Rating Badge
                    Surface(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(4.dp),
                        color = Color.Black.copy(alpha = 0.8f),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.Star,
                                contentDescription = "Rating",
                                tint = GoldAccent,
                                modifier = Modifier.size(11.dp)
                            )
                            Spacer(modifier = Modifier.width(2.dp))
                            Text(
                                text = "${event.rating}",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                // Info Column
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            color = TheatricalCrimson.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = event.category.displayMr,
                                fontSize = 10.sp,
                                color = TheatricalCrimsonLight,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }

                        Surface(
                            color = Color(0xFF1E293B),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = event.certification,
                                fontSize = 10.sp,
                                color = Color(0xFF94A3B8),
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                            )
                        }

                        Text(
                            text = "• ${event.durationText}",
                            fontSize = 10.sp,
                            color = Color(0xFF94A3B8)
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = event.titleMr,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    Text(
                        text = event.titleEn,
                        fontSize = 11.sp,
                        color = Color(0xFF94A3B8),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "📍 ${event.venue.nameMr}",
                        fontSize = 11.sp,
                        color = GoldAccent,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "दर ₹${event.basePrice} पासून",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = GoldBright
                    )
                }
            }

            // Bottom Actions Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF172033))
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(
                    onClick = onTrailerClick,
                    modifier = Modifier.testTag("trailer_btn_${event.id}")
                ) {
                    Text(
                        text = "▶ ट्रेलर पहा (Trailer)",
                        fontSize = 12.sp,
                        color = GoldAccent,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Button(
                    onClick = onBookClick,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = TheatricalCrimson),
                    modifier = Modifier.testTag("book_now_btn_${event.id}")
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Outlined.ConfirmationNumber,
                            contentDescription = "Book",
                            tint = Color.White,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "तिकीट बुक करा 🎭",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }
            }
        }
    }
}
