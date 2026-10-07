package com.kalpkrutinfotech.mahaticket.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import coil.compose.AsyncImage
import com.kalpkrutinfotech.mahaticket.BookingRoutes
import com.kalpkrutinfotech.mahaticket.BuildConfig
import com.kalpkrutinfotech.mahaticket.data.api.AnnouncementResponse
import com.kalpkrutinfotech.mahaticket.data.api.CityCatalogItem
import com.kalpkrutinfotech.mahaticket.model.EventItem
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventViewModel
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventsUiState
import kotlinx.coroutines.delay
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

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

    if (showCityDialog) {
        CitySelectionDialog(
            cities = cities,
            selectedCity = selectedCity,
            onSelect = {
                viewModel.selectCity(it)
                showCityDialog = false
            },
            onDismiss = { showCityDialog = false }
        )
    }

    HomeScreen(
        eventsState = eventsState,
        selectedCategory = selectedCategory,
        selectedCity = selectedCity,
        announcements = announcements,
        onSelectEvent = { event ->
            navController.navigate(BookingRoutes.eventDetail(event.id))
        },
        onCategorySelected = { viewModel.selectCategory(it) },
        onOpenCitySelector = { showCityDialog = true },
        onSearch = { viewModel.searchEvents(it) },
        onRetry = { viewModel.loadEvents() }
    )
}

@Composable
fun HomeScreen(
    eventsState: EventsUiState,
    selectedCategory: String,
    selectedCity: String,
    announcements: List<AnnouncementResponse>,
    onSelectEvent: (EventItem) -> Unit,
    onCategorySelected: (String) -> Unit,
    onOpenCitySelector: () -> Unit,
    onSearch: (String) -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    var searchQuery by remember { mutableStateOf("") }
    val context = LocalContext.current

    // Category options matching the website: All, Plays/Drama, Music, Comedy, Cultural, Workshops, Movies
    val categories = listOf(
        Triple("all", "सर्व अनुभव", Icons.Default.AutoAwesome),
        Triple("plays", "नाटक", Icons.Default.TheaterComedy),
        Triple("music", "संगीत व मैफिली", Icons.Default.MusicNote),
        Triple("comedy", "स्टँडअप कॉमेडी", Icons.Default.SentimentSatisfiedAlt),
        Triple("cultural", "सांस्कृतिक", Icons.Default.Celebration),
        Triple("workshops", "कार्यशाळा", Icons.Default.Palette),
        Triple("movies", "चित्रपट", Icons.Default.Movie)
    )

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Modern Top Header with Brand Badge & City Pill
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Logo with Ticket Icon Badge
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(
                                    Brush.linearGradient(
                                        listOf(Color(0xFFF97316), Color(0xFFEA580C), Color(0xFFC2410C))
                                    )
                                )
                                .shadow(4.dp, RoundedCornerShape(12.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.ConfirmationNumber,
                                contentDescription = "MahaTicket Logo",
                                tint = Color.White,
                                modifier = Modifier.size(22.dp)
                            )
                        }

                        Column {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = "MahaTicket",
                                    color = MaterialTheme.colorScheme.onBackground,
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Black,
                                    letterSpacing = (-0.5).sp
                                )
                                Surface(
                                    shape = RoundedCornerShape(4.dp),
                                    color = Color(0xFFEA580C).copy(alpha = 0.12f)
                                ) {
                                    Text(
                                        text = "महाटिकिट",
                                        color = Color(0xFFEA580C),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                    )
                                }
                            }
                            Text(
                                text = "महाराष्ट्राचे हक्काचे तिकीट व्यासपीठ",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }

                    // City Selector Pill Button
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = MaterialTheme.colorScheme.surface,
                        border = BorderStroke(1.dp, Color(0xFFFED7AA)),
                        modifier = Modifier.clickable { onOpenCitySelector() }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.LocationOn,
                                contentDescription = null,
                                tint = Color(0xFFEA580C),
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            val displayCity = when {
                                selectedCity.contains("All", ignoreCase = true) || selectedCity.contains("महाराष्ट्र") -> "महाराष्ट्र"
                                else -> selectedCity
                            }
                            Text(
                                text = displayCity,
                                color = MaterialTheme.colorScheme.onSurface,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.width(2.dp))
                            Icon(
                                Icons.Default.KeyboardArrowDown,
                                contentDescription = null,
                                tint = Color(0xFFEA580C),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Search Bar matching the website style
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = {
                        searchQuery = it
                        onSearch(it)
                    },
                    placeholder = {
                        Text(
                            "नाटक, संगीत, सभागृह किंवा कलाकार शोधा...",
                            fontSize = 13.sp,
                            color = MahaTextSecondary
                        )
                    },
                    leadingIcon = {
                        Icon(
                            Icons.Default.Search,
                            contentDescription = "Search",
                            tint = Color(0xFFEA580C),
                            modifier = Modifier.size(20.dp)
                        )
                    },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = {
                                searchQuery = ""
                                onSearch("")
                            }) {
                                Icon(
                                    Icons.Default.Close,
                                    contentDescription = "Clear",
                                    tint = MahaTextSecondary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Color(0xFFF9FAFB),
                        unfocusedContainerColor = Color(0xFFF9FAFB),
                        focusedBorderColor = Color(0xFFEA580C),
                        unfocusedBorderColor = Color(0xFFE5E7EB),
                        focusedTextColor = MaterialTheme.colorScheme.onSurface,
                        unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                    ),
                    singleLine = true
                )
            }
        }

        // 2. Category Navigation Rail (Horizontal scrollable chips with icons)
        item {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(categories) { (id, label, icon) ->
                    val isSelected = selectedCategory == id ||
                            (id == "plays" && (selectedCategory == "drama" || selectedCategory == "plays"))
                    
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (isSelected) Color(0xFFEA580C) else MaterialTheme.colorScheme.surface,
                        border = BorderStroke(
                            1.dp,
                            if (isSelected) Color(0xFFEA580C) else Color(0xFFE5E7EB)
                        ),
                        shadowElevation = if (isSelected) 2.dp else 0.dp,
                        modifier = Modifier.clickable { onCategorySelected(id) }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                icon,
                                contentDescription = label,
                                tint = if (isSelected) Color.White else Color(0xFFEA580C),
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = label,
                                fontSize = 12.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }
        }

        // Handle State & Content
        when (eventsState) {
            is EventsUiState.Loading -> {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(280.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            CircularProgressIndicator(
                                color = Color(0xFFEA580C),
                                strokeWidth = 3.dp,
                                modifier = Modifier.size(36.dp)
                            )
                            Spacer(modifier = Modifier.height(14.dp))
                            Text(
                                "कार्यक्रम लोड होत आहेत...",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontWeight = FontWeight.Medium
                            )
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
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, Color(0xFFE5E7EB))
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Default.CloudOff,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = MaterialTheme.colorScheme.error
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = eventsState.message,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurface,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = onRetry,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("पुन्हा प्रयत्न करा", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
            is EventsUiState.Success -> {
                val allEvents = eventsState.events

                if (allEvents.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            shape = RoundedCornerShape(16.dp),
                            border = BorderStroke(1.dp, Color(0xFFE5E7EB))
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(32.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    Icons.Default.TheaterComedy,
                                    contentDescription = null,
                                    modifier = Modifier.size(56.dp),
                                    tint = Color(0xFFEA580C).copy(alpha = 0.5f)
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    text = "या निवडीसाठी सध्या कोणतेही कार्यक्रम नाहीत",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "इतर श्रेणी निवडा किंवा संपूर्ण महाराष्ट्रातील कार्यक्रम शोधा",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(16.dp))
                                OutlinedButton(
                                    onClick = { onCategorySelected("all") },
                                    shape = RoundedCornerShape(8.dp),
                                    border = BorderStroke(1.dp, Color(0xFFEA580C)),
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEA580C))
                                ) {
                                    Text("सर्व कार्यक्रम पहा", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                } else {
                    // 3. Multi-Slide Hero Carousel (Auto-scrolling with touch support)
                    if (searchQuery.isBlank()) {
                        item {
                            ModernHeroBannerCarousel(
                                events = allEvents,
                                announcements = announcements,
                                onSelectEvent = onSelectEvent,
                                modifier = Modifier.padding(horizontal = 16.dp)
                            )
                        }

                        // 4. Advertisement / Showcase Banner (Same as website lines 487-515)
                        item {
                            AdShowcaseBanner(
                                onContactClick = {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("${BuildConfig.API_BASE_URL}/contact"))
                                    context.startActivity(intent)
                                },
                                modifier = Modifier.padding(horizontal = 16.dp)
                            )
                        }
                    }

                    // Filter theatre/plays events for Marathi Theatre Spotlight
                    val theatreEvents = allEvents.filter {
                        it.category.contains("drama", ignoreCase = true) ||
                                it.category.contains("play", ignoreCase = true) ||
                                it.title.contains("Sahi", ignoreCase = true) ||
                                it.titleMr.contains("नाटक")
                    }

                    // 5. Horizontal Scrolling Rail: Marathi Theatre Spotlight (मराठी रंगभूमी विशेष)
                    if (selectedCategory == "all" && searchQuery.isBlank() && theatreEvents.isNotEmpty()) {
                        item {
                            Column(modifier = Modifier.fillMaxWidth()) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp, vertical = 4.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(32.dp)
                                                .background(Color(0xFFFFF7ED), RoundedCornerShape(8.dp))
                                                .border(1.dp, Color(0xFFFED7AA), RoundedCornerShape(8.dp)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                Icons.Default.TheaterComedy,
                                                contentDescription = null,
                                                tint = Color(0xFFEA580C),
                                                modifier = Modifier.size(18.dp)
                                            )
                                        }
                                        Column {
                                            Text(
                                                text = "मराठी रंगभूमी विशेष",
                                                fontSize = 16.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.onBackground
                                            )
                                            Text(
                                                text = "महाराष्ट्रातील नामवंत रंगमंदिरांमधील लोकप्रिय नाटके",
                                                fontSize = 11.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                // Horizontal scrolling poster cards
                                LazyRow(
                                    contentPadding = PaddingValues(horizontal = 16.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    items(theatreEvents) { event ->
                                        HorizontalEventCardItem(
                                            event = event,
                                            onClick = { onSelectEvent(event) }
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Filter music/concerts/trending
                    val musicEvents = allEvents.filter {
                        it.category.contains("music", ignoreCase = true) ||
                                it.category.contains("concert", ignoreCase = true) ||
                                it.category.contains("comedy", ignoreCase = true)
                    }

                    // 6. Horizontal Scrolling Rail: Music & Trending Events
                    if (selectedCategory == "all" && searchQuery.isBlank() && musicEvents.isNotEmpty()) {
                        item {
                            Column(modifier = Modifier.fillMaxWidth()) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp, vertical = 4.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(32.dp)
                                                .background(Color(0xFFFFF7ED), RoundedCornerShape(8.dp))
                                                .border(1.dp, Color(0xFFFED7AA), RoundedCornerShape(8.dp)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                Icons.Default.MusicNote,
                                                contentDescription = null,
                                                tint = Color(0xFFEA580C),
                                                modifier = Modifier.size(18.dp)
                                            )
                                        }
                                        Column {
                                            Text(
                                                text = "लोकप्रिय संगीत व आगामी कार्यक्रम",
                                                fontSize = 16.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.onBackground
                                            )
                                            Text(
                                                text = "मैफिली, संगीत नाटके आणि स्टँडअप शोज",
                                                fontSize = 11.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                LazyRow(
                                    contentPadding = PaddingValues(horizontal = 16.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    items(musicEvents) { event ->
                                        HorizontalEventCardItem(
                                            event = event,
                                            onClick = { onSelectEvent(event) }
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // 7. All Events Section Header
                    item {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 4.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = if (selectedCategory == "all") "सर्व आगामी कार्यक्रम" else "निवडलेले कार्यक्रम",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onBackground
                                )
                                Text(
                                    text = "${allEvents.size} कार्यक्रम उपलब्ध",
                                    fontSize = 12.sp,
                                    color = Color(0xFFEA580C),
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                            Text(
                                text = "${selectedCity} • थेट ऑनलाईन सीट निवडून तिकीट बुक करा",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    // 8. Main Catalog Events Cards
                    items(allEvents) { event ->
                        Box(modifier = Modifier.padding(horizontal = 16.dp)) {
                            ModernEventCardItem(
                                event = event,
                                onClick = { onSelectEvent(event) }
                            )
                        }
                    }

                    // 9. Producer & Organizer Banner (Matching Website bottom banner)
                    item {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            border = BorderStroke(1.dp, Color(0xFFE5E7EB)),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Business,
                                        contentDescription = null,
                                        tint = Color(0xFFEA580C),
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(
                                        text = "नाट्य व कार्यक्रम आयोजकांसाठी",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFFEA580C)
                                    )
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "आपला कार्यक्रम महाटिकिटवर सूचीबद्ध करा",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "पारदर्शक लेजर, थेट बँक खात्यात सेटलमेंट, मोफत व्हॉट्सॲप डिजिटल पास, आणि सभागृह गेट स्कॅनर सपोर्ट.",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    lineHeight = 16.sp
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                Button(
                                    onClick = {
                                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("${BuildConfig.API_BASE_URL}/contact"))
                                        context.startActivity(intent)
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                                ) {
                                    Text("भागीदार व्हा / संपर्क करा", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Multi-Slide Hero Carousel with smooth Pager transitions, auto-scroll, and dots
 */
@Composable
fun ModernHeroBannerCarousel(
    events: List<EventItem>,
    announcements: List<AnnouncementResponse>,
    onSelectEvent: (EventItem) -> Unit,
    modifier: Modifier = Modifier
) {
    // Collect slides: top featured events + promo announcements
    val slides = remember(events, announcements) {
        val list = mutableListOf<HeroSlideItem>()
        // Top 4 events
        events.take(4).forEach { ev ->
            list.add(
                HeroSlideItem(
                    id = ev.id,
                    title = ev.titleMr.ifBlank { ev.title },
                    secondaryTitle = ev.title,
                    category = ev.categoryMr.ifBlank { ev.category },
                    venue = ev.venue?.nameMr ?: ev.venue?.name ?: "पुणे",
                    city = ev.venue?.city ?: "महाराष्ट्र",
                    imageUrl = ev.posterUrl.ifBlank { "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800" },
                    sessionTime = ev.sessions?.firstOrNull()?.sessionStartTime,
                    event = ev
                )
            )
        }
        // If promo announcements exist with image, add them
        announcements.filter { !it.imageUrl.isNullOrBlank() }.take(2).forEach { ann ->
            list.add(
                HeroSlideItem(
                    id = ann.id,
                    title = ann.title,
                    secondaryTitle = ann.message,
                    category = "विशेष ऑफर",
                    venue = "MahaTicket",
                    city = ann.city ?: "महाराष्ट्र",
                    imageUrl = ann.imageUrl ?: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800",
                    isPromo = true
                )
            )
        }
        list
    }

    if (slides.isEmpty()) return

    val pagerState = rememberPagerState(pageCount = { slides.size })

    // Auto-advance slides every 4.5 seconds
    LaunchedEffect(pagerState, slides.size) {
        if (slides.size > 1) {
            while (true) {
                delay(4500)
                val nextPage = (pagerState.currentPage + 1) % slides.size
                pagerState.animateScrollToPage(nextPage)
            }
        }
    }

    Column(modifier = modifier.fillMaxWidth()) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(210.dp),
            shape = RoundedCornerShape(18.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxSize()
            ) { page ->
                val slide = slides[page]
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .clickable {
                            if (slide.event != null) {
                                onSelectEvent(slide.event)
                            }
                        }
                ) {
                    // Poster image
                    AsyncImage(
                        model = slide.imageUrl,
                        contentDescription = slide.title,
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
                                        Color.Black.copy(alpha = 0.25f),
                                        Color.Black.copy(alpha = 0.40f),
                                        Color.Black.copy(alpha = 0.90f)
                                    ),
                                    startY = 50f
                                )
                            )
                    )

                    // Overlay Content
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(14.dp),
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        // Top Badges
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = Color(0xFFEA580C)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        Icons.Default.AutoAwesome,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Text(
                                        text = if (slide.isPromo) "महा ऑफर" else "विशेष शिफारस",
                                        color = Color.White,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }

                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = Color.Black.copy(alpha = 0.55f)
                            ) {
                                Text(
                                    text = "📍 ${slide.city}",
                                    color = Color.White,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                        }

                        // Bottom Title, Venue & Book Button
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Bottom
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = slide.title,
                                    color = Color.White,
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.Black,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        Icons.Default.LocationOn,
                                        contentDescription = null,
                                        tint = Color(0xFFF97316),
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Text(
                                        text = "${slide.venue} • ${slide.category}",
                                        color = Color.White.copy(alpha = 0.85f),
                                        fontSize = 11.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }

                            Button(
                                onClick = {
                                    if (slide.event != null) {
                                        onSelectEvent(slide.event)
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)),
                                shape = RoundedCornerShape(10.dp),
                                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                            ) {
                                Icon(
                                    Icons.Default.ConfirmationNumber,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(13.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "बुक करा",
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

        // Dot Pagination Indicators matching website style
        if (slides.size > 1) {
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                repeat(slides.size) { index ->
                    val isSelected = pagerState.currentPage == index
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 3.dp)
                            .height(5.dp)
                            .width(if (isSelected) 22.dp else 5.dp)
                            .clip(CircleShape)
                            .background(
                                if (isSelected) Color(0xFFEA580C) else Color(0xFFD1D5DB)
                            )
                    )
                }
            }
        }
    }
}

/**
 * Ad & Showcase Banner identical to website lines 487-515
 */
@Composable
fun AdShowcaseBanner(
    onContactClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.horizontalGradient(
                        listOf(
                            Color(0xFFEA580C),
                            Color(0xFFD97706),
                            Color(0xFFE11D48)
                        )
                    )
                )
                .padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color.White.copy(alpha = 0.22f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.AutoAwesome,
                            contentDescription = null,
                            tint = Color(0xFFFDE68A),
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    Column {
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = Color.Black.copy(alpha = 0.25f)
                        ) {
                            Text(
                                text = "जाहिरात व आगामी नाटके",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFFFDE68A),
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "आपल्या नाटकाची जाहिरात येथे करा — लाखो नाट्यप्रेमींपर्यंत पोहोचा",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            lineHeight = 15.sp,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(modifier = Modifier.width(8.dp))

                Button(
                    onClick = onContactClick,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White,
                        contentColor = Color(0xFF111827)
                    ),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "संपर्क",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

/**
 * 2:3 Portrait Horizontal Card for Spotlight Rails (BookMyShow standard style)
 */
@Composable
fun HorizontalEventCardItem(
    event: EventItem,
    onClick: () -> Unit
) {
    val displayTitle = event.titleMr.ifBlank { event.title }
    val venueName = event.venue?.nameMr ?: event.venue?.name ?: "पुणे"
    val nextSession = event.sessions?.firstOrNull()

    Card(
        modifier = Modifier
            .width(160.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, Color(0xFFE5E7EB)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            // Poster 2:3 Aspect Ratio
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(210.dp)
            ) {
                AsyncImage(
                    model = event.posterUrl.ifBlank { "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800" },
                    contentDescription = displayTitle,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )

                // Poster Gradient
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.85f)),
                                startY = 100f
                            )
                        )
                )

                // Top Badges
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = Color(0xFFEA580C)
                    ) {
                        Text(
                            text = event.language.ifBlank { "मराठी" },
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                        )
                    }

                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = Color.Black.copy(alpha = 0.65f)
                    ) {
                        Text(
                            text = event.categoryMr.ifBlank { event.category },
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                        )
                    }
                }

                // Showtime overlay at bottom of poster
                if (nextSession != null) {
                    val formattedTime = try {
                        val dt = ZonedDateTime.parse(nextSession.sessionStartTime)
                        dt.format(DateTimeFormatter.ofPattern("EEE, d MMM"))
                    } catch (e: Exception) {
                        "लवकरच"
                    }

                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color.Black.copy(alpha = 0.75f),
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(6.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(3.dp)
                        ) {
                            Icon(
                                Icons.Default.CalendarToday,
                                contentDescription = null,
                                tint = Color(0xFFF97316),
                                modifier = Modifier.size(10.dp)
                            )
                            Text(
                                text = formattedTime,
                                fontSize = 9.sp,
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }

            // Card Body
            Column(modifier = Modifier.padding(10.dp)) {
                Text(
                    text = displayTitle,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(2.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = Color(0xFFEA580C),
                        modifier = Modifier.size(11.dp)
                    )
                    Text(
                        text = venueName,
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                Button(
                    onClick = onClick,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(vertical = 6.dp)
                ) {
                    Text(
                        text = "बुक करा",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
    }
}

/**
 * Modern Full-width Event Card for the main catalog
 */
@Composable
fun ModernEventCardItem(
    event: EventItem,
    onClick: () -> Unit
) {
    val displayTitle = event.titleMr.ifBlank { event.title }
    val secondaryTitle = if (event.titleMr.isNotBlank()) event.title else null
    val venueName = event.venue?.nameMr ?: event.venue?.name ?: "पुणे"
    val nextSession = event.sessions?.firstOrNull()

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, Color(0xFFE5E7EB)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Left Poster Thumbnail
            Box(
                modifier = Modifier
                    .width(105.dp)
                    .height(145.dp)
                    .clip(RoundedCornerShape(12.dp))
            ) {
                AsyncImage(
                    model = event.posterUrl.ifBlank { "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800" },
                    contentDescription = displayTitle,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )

                // Language badge overlay
                Surface(
                    shape = RoundedCornerShape(bottomEnd = 8.dp),
                    color = Color(0xFFEA580C),
                    modifier = Modifier.align(Alignment.TopStart)
                ) {
                    Text(
                        text = event.language.ifBlank { "मराठी" },
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            // Right Info Column
            Column(
                modifier = Modifier
                    .weight(1f)
                    .height(145.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    // Category & Duration tag
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = Color(0xFFFFF7ED)
                        ) {
                            Text(
                                text = event.categoryMr.ifBlank { event.category },
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFEA580C),
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }

                        if (event.durationMinutes > 0) {
                            Text(
                                text = "• ${event.durationMinutes} मि.",
                                fontSize = 11.sp,
                                color = MahaTextSecondary
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = displayTitle,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    if (!secondaryTitle.isNullOrBlank()) {
                        Text(
                            text = secondaryTitle,
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        Icon(
                            Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = Color(0xFFEA580C),
                            modifier = Modifier.size(13.dp)
                        )
                        Text(
                            text = "$venueName • ${event.venue?.city ?: "महाराष्ट्र"}",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                // Bottom: Showtime or Price + Book Button
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (nextSession != null) {
                        val sessionDate = try {
                            val dt = ZonedDateTime.parse(nextSession.sessionStartTime)
                            dt.format(DateTimeFormatter.ofPattern("d MMM, h:mm a"))
                        } catch (e: Exception) {
                            "थेट प्रयोग"
                        }
                        Text(
                            text = sessionDate,
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurface,
                            fontWeight = FontWeight.SemiBold
                        )
                    } else {
                        Text(
                            text = "थेट प्रयोग",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Button(
                        onClick = onClick,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                    ) {
                        Icon(
                            Icons.Default.ConfirmationNumber,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(13.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "बुक करा",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }
            }
        }
    }
}

/**
 * City Selection Dialog with Maharashtra's premier cultural cities
 */
@Composable
fun CitySelectionDialog(
    cities: List<CityCatalogItem>,
    selectedCity: String,
    onSelect: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val defaultCities = listOf(
        "महाराष्ट्र (All)" to "सर्व शहरे",
        "Pune" to "पुणे (Pune)",
        "Mumbai" to "मुंबई (Mumbai)",
        "Thane" to "ठाणे (Thane)",
        "Nashik" to "नाशिक (Nashik)",
        "Nagpur" to "नागपूर (Nagpur)",
        "Kolhapur" to "कोल्हापूर (Kolhapur)",
        "Chhatrapati Sambhaji Nagar" to "छत्रपती संभाजीनगर",
        "Solapur" to "सोलापूर (Solapur)",
        "Sangli" to "सांगली (Sangli)",
        "Satara" to "सातारा (Satara)"
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = Color(0xFFEA580C),
                    modifier = Modifier.size(22.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("आपले शहर निवडा (Select City)", fontWeight = FontWeight.Bold, fontSize = 17.sp)
            }
        },
        text = {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 350.dp)
            ) {
                items(defaultCities) { (cityValue, cityDisplay) ->
                    val isSelected = selectedCity.equals(cityValue, ignoreCase = true) ||
                            (cityValue == "महाराष्ट्र (All)" && selectedCity.contains("All", ignoreCase = true))

                    Surface(
                        color = if (isSelected) Color(0xFFFFF7ED) else Color.Transparent,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelect(cityValue) }
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = cityDisplay,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) Color(0xFFEA580C) else MaterialTheme.colorScheme.onSurface,
                                fontSize = 14.sp
                            )
                            if (isSelected) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = Color(0xFFEA580C),
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = onDismiss,
                colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFFEA580C))
            ) {
                Text("बंद करा", fontWeight = FontWeight.Bold)
            }
        }
    )
}

data class HeroSlideItem(
    val id: Int,
    val title: String,
    val secondaryTitle: String? = null,
    val category: String,
    val venue: String,
    val city: String,
    val imageUrl: String,
    val sessionTime: String? = null,
    val isPromo: Boolean = false,
    val event: EventItem? = null
)
