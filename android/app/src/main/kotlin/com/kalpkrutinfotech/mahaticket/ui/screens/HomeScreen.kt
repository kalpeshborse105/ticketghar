package com.kalpkrutinfotech.mahaticket.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.FavoriteBorder
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import coil.compose.AsyncImage
import com.kalpkrutinfotech.mahaticket.BookingRoutes
import com.kalpkrutinfotech.mahaticket.data.api.AnnouncementResponse
import com.kalpkrutinfotech.mahaticket.model.Event
import com.kalpkrutinfotech.mahaticket.model.EventCategory
import com.kalpkrutinfotech.mahaticket.model.EventItem
import com.kalpkrutinfotech.mahaticket.model.toEvent
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.components.TrailerPreviewDialog
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventViewModel
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventsUiState
import com.kalpkrutinfotech.mahaticket.util.CurrencyUtils
import com.kalpkrutinfotech.mahaticket.util.DateTimeUtils

@Composable
fun HomeScreenWithViewModel(
    viewModel: EventViewModel,
    navController: NavHostController,
    language: AppLanguage = AppLanguage.MARATHI
) {
    val eventsState by viewModel.eventsState.collectAsState()
    val bannerEvents by viewModel.bannerEvents.collectAsState()
    val selectedCategory by viewModel.selectedCategory.collectAsState()
    val selectedCity by viewModel.selectedCity.collectAsState()
    val cities by viewModel.cities.collectAsState()
    val announcements by viewModel.announcements.collectAsState()

    HomeScreen(
        eventsState = eventsState,
        bannerEvents = bannerEvents,
        selectedCategory = selectedCategory,
        selectedCity = selectedCity,
        cities = cities.map { it.name },
        announcements = announcements,
        language = language,
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
    bannerEvents: List<EventItem> = emptyList(),
    selectedCategory: String,
    selectedCity: String,
    cities: List<String> = emptyList(),
    announcements: List<AnnouncementResponse> = emptyList(),
    language: AppLanguage = AppLanguage.MARATHI,
    onSelectEvent: (EventItem) -> Unit,
    onCategorySelected: (String) -> Unit,
    onCitySelected: (String) -> Unit = {},
    onSearch: (String) -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isMarathi = language == AppLanguage.MARATHI
    var searchQuery by remember { mutableStateOf("") }
    var selectedTrailerEvent by remember { mutableStateOf<Event?>(null) }

    val rawEvents = when (eventsState) {
        is EventsUiState.Success -> eventsState.events
        else -> emptyList()
    }

    val mappedEvents = remember(rawEvents) {
        rawEvents.map { it.toEvent() }
    }

    val filteredEvents = remember(mappedEvents, selectedCategory, selectedCity, searchQuery) {
        mappedEvents.filter { event ->
            val matchCat = selectedCategory == "all" || selectedCategory == "सर्व" || selectedCategory == "सर्व कार्यक्रम" ||
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

    val isCategoryOrSearchActive = remember(selectedCategory, searchQuery) {
        (selectedCategory != "all" && selectedCategory != "सर्व" && selectedCategory != "सर्व कार्यक्रम") ||
        searchQuery.isNotBlank()
    }

    val heroEvents = remember(rawEvents) {
        val list = rawEvents.filter {
            (it.featured == 1 || it.category.equals("plays", true) || it.category.equals("music", true) || it.category.equals("natak", true)) &&
            (!it.bannerUrl.isNullOrBlank() || !it.posterUrl.isNullOrBlank())
        }
        if (list.isNotEmpty()) list.take(6) else rawEvents.take(6)
    }

    val theatreEvents = remember(rawEvents) {
        rawEvents.filter {
            it.category.equals("natak", ignoreCase = true) ||
            it.category.equals("plays", ignoreCase = true) ||
            it.category.equals("theatre", ignoreCase = true) ||
            it.categoryMr.contains("नाटक")
        }
    }

    val musicalEvents = remember(rawEvents) {
        rawEvents.filter {
            it.category.equals("music", ignoreCase = true) ||
            it.category.equals("concert", ignoreCase = true) ||
            it.category.equals("comedy", ignoreCase = true) ||
            it.categoryMr.contains("संगीत") ||
            it.categoryMr.contains("कॉमेडी")
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MahaBg)
            .testTag("home_screen_feed")
    ) {
        if (eventsState is EventsUiState.Loading && rawEvents.isEmpty()) {
            HomeShimmerLoading()
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 80.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // 1. Hero Banner Carousel (Always stable, first section after Header & City Selector)
                item(key = "home_hero_banner") {
                    HeroBannerCarousel(
                        heroEvents = heroEvents,
                        language = language,
                        onSelectEvent = onSelectEvent
                    )
                }

                // 2. Category Quick Discovery (मनोरंजन वर्ग - 8 Tiles matching Web & Stitch)
                item {
                    Column(modifier = Modifier.padding(vertical = 4.dp)) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = if (isMarathi) "मनोरंजन वर्ग" else "Entertainment Categories",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = if (isMarathi) "सर्व श्रेणी" else "All Categories",
                                fontSize = 11.5.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MahaOrange,
                                modifier = Modifier.clickable { onCategorySelected("all") }
                            )
                        }

                        val stitchCategories = if (isMarathi) listOf(
                            Triple("all", "सर्व", "🎭"),
                            Triple("plays", "नाटक", "🎭"),
                            Triple("music", "संगीत मैफल", "🎵"),
                            Triple("comedy", "स्टँडअप", "😄"),
                            Triple("cultural", "सांस्कृतिक", "🎪"),
                            Triple("workshops", "कार्यशाळा", "🎨"),
                            Triple("movies", "चित्रपट", "🎬"),
                            Triple("sports", "क्रीडा", "🏏")
                        ) else listOf(
                            Triple("all", "All", "🎭"),
                            Triple("plays", "Plays", "🎭"),
                            Triple("music", "Concerts", "🎵"),
                            Triple("comedy", "Standup", "😄"),
                            Triple("cultural", "Cultural", "🎪"),
                            Triple("workshops", "Workshops", "🎨"),
                            Triple("movies", "Movies", "🎬"),
                            Triple("sports", "Sports", "🏏")
                        )

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState())
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            stitchCategories.forEach { (catId, catLabel, emoji) ->
                                val isSelected = selectedCategory == catId || (catId == "all" && (selectedCategory == "all" || selectedCategory == "सर्व" || selectedCategory == "All"))
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    modifier = Modifier
                                        .width(62.dp)
                                        .clickable { onCategorySelected(catId) }
                                ) {
                                    Surface(
                                        modifier = Modifier.size(52.dp),
                                        shape = RoundedCornerShape(14.dp),
                                        color = if (isSelected) MahaOrange else MahaWarm,
                                        border = BorderStroke(1.dp, if (isSelected) MahaOrange else Color(0xFFFFEDD5)),
                                        shadowElevation = if (isSelected) 1.dp else 0.dp
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(text = emoji, fontSize = 21.sp)
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = catLabel,
                                        fontSize = 10.5.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        color = if (isSelected) MahaOrangeDeep else TextPrimary,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                    }
                }

                if (isCategoryOrSearchActive) {
                    // CATEGORY / SEARCH ACTIVE VERTICAL NAVIGATION (Direct results header + event list)
                    item {
                        val categoryTitle = when {
                            searchQuery.isNotBlank() -> if (isMarathi) "शोध: \"$searchQuery\"" else "Search: \"$searchQuery\""
                            selectedCategory == "plays" -> if (isMarathi) "🎭 मराठी नाटक" else "🎭 Theatre & Plays"
                            selectedCategory == "music" -> if (isMarathi) "🎵 संगीत मैफल" else "🎵 Music & Concerts"
                            selectedCategory == "comedy" -> if (isMarathi) "😄 स्टँडअप कॉमेडी" else "😄 Standup Comedy"
                            selectedCategory == "cultural" -> if (isMarathi) "🎪 सांस्कृतिक कार्यक्रम" else "🎪 Cultural Shows"
                            selectedCategory == "workshops" -> if (isMarathi) "🎨 कार्यशाळा" else "🎨 Workshops"
                            selectedCategory == "movies" -> if (isMarathi) "🎬 चित्रपट" else "🎬 Movies & Cinema"
                            selectedCategory == "sports" -> if (isMarathi) "🏏 क्रीडा" else "🏏 Sports Events"
                            else -> selectedCategory
                        }

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = categoryTitle,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = TextPrimary
                                )
                                Text(
                                    text = if (isMarathi) "${filteredEvents.size} कार्यक्रम उपलब्ध" else "${filteredEvents.size} events available",
                                    fontSize = 12.sp,
                                    color = MahaOrangeDeep,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }

                            Surface(
                                color = MahaWarm,
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(1.dp, MahaOrange.copy(alpha = 0.4f)),
                                modifier = Modifier.clickable {
                                    searchQuery = ""
                                    onSearch("")
                                    onCategorySelected("all")
                                }
                            ) {
                                Text(
                                    text = if (isMarathi) "✕ सर्व दाखवा" else "✕ View All",
                                    fontSize = 11.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MahaOrange,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                )
                            }
                        }
                    }

                    if (eventsState is EventsUiState.Loading) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(160.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator(color = MahaOrange, modifier = Modifier.size(32.dp))
                            }
                        }
                    } else if (eventsState is EventsUiState.Error) {
                        item {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = (eventsState as EventsUiState.Error).message,
                                    color = Color(0xFFDC2626),
                                    fontSize = 12.5.sp,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Button(
                                    onClick = onRetry,
                                    colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text(if (isMarathi) "पुन्हा प्रयत्न करा" else "Retry", color = Color.White, fontSize = 12.sp)
                                }
                            }
                        }
                    } else if (filteredEvents.isEmpty()) {
                        item {
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                border = BorderStroke(1.dp, MahaBorder)
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(text = "🎭", fontSize = 32.sp)
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = if (isMarathi) "कोणतेही कार्यक्रम उपलब्ध नाहीत" else "No Events Available",
                                        color = TextPrimary,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = if (isMarathi) "निवडलेल्या श्रेणीत किंवा शहरात सध्या कार्यक्रम उपलब्ध नाहीत." else "No events available for selected category or city right now.",
                                        color = TextSecondary,
                                        fontSize = 11.5.sp,
                                        textAlign = TextAlign.Center,
                                        modifier = Modifier.padding(top = 4.dp)
                                    )
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Button(
                                        onClick = {
                                            searchQuery = ""
                                            onSearch("")
                                            onCategorySelected("all")
                                            onCitySelected("All")
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Text(if (isMarathi) "सर्व कार्यक्रम पहा" else "Explore All Events", color = Color.White, fontSize = 12.sp)
                                    }
                                }
                            }
                        }
                    } else {
                        items(filteredEvents) { event ->
                            val rawItem = rawEvents.firstOrNull { it.id.toString() == event.id }
                            EventCardItem(
                                event = event,
                                rawItem = rawItem,
                                language = language,
                                onCardClick = { if (rawItem != null) onSelectEvent(rawItem) },
                                onBookClick = { if (rawItem != null) onSelectEvent(rawItem) }
                            )
                        }
                    }
                } else {
                    // NORMAL HOME SCREEN
                    // 3. Rail 1: मराठी रंगभूमी विशेष (TheatricalPosterCard)
                    if (theatreEvents.isNotEmpty()) {
                        item {
                            Column(modifier = Modifier.padding(top = 4.dp)) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp, vertical = 6.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Box(
                                            modifier = Modifier
                                                .width(4.dp)
                                                .height(18.dp)
                                                .clip(RoundedCornerShape(2.dp))
                                                .background(MahaOrange)
                                        )
                                        Text(
                                            text = if (isMarathi) "मराठी रंगभूमी विशेष" else "Marathi Theatre Specials",
                                            fontSize = 14.5.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = TextPrimary
                                        )
                                    }
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(2.dp),
                                        modifier = Modifier.clickable { onCategorySelected("plays") }
                                    ) {
                                        Text(
                                            text = if (isMarathi) "सर्व पहा" else "View All",
                                            fontSize = 11.5.sp,
                                            color = MahaOrange,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                        Icon(
                                            imageVector = Icons.Default.ArrowForward,
                                            contentDescription = null,
                                            tint = MahaOrange,
                                            modifier = Modifier.size(13.dp)
                                        )
                                    }
                                }

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .horizontalScroll(rememberScrollState())
                                        .padding(horizontal = 16.dp, vertical = 4.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    theatreEvents.forEach { evItem ->
                                        val evTime = evItem.sessions?.firstOrNull()?.sessionStartTime?.let {
                                            DateTimeUtils.formatEventCardDateTime(it)
                                        } ?: ""
                                        val evPrice = evItem.minPrice?.let {
                                            CurrencyUtils.formatPaiseToRupees(it)
                                        } ?: ""
                                        TheatricalPosterCard(
                                            posterUrl = evItem.posterUrl ?: "",
                                            badgeText = if (evItem.rating != null && evItem.rating >= 4.5) (if (isMarathi) "लोकप्रिय" else "Trending") else (if (isMarathi) "विशेष" else "Special"),
                                            badgeColor = Color(0xFFC2410C),
                                            subBadge = if (isMarathi) evItem.categoryMr.ifBlank { "मराठी नाटक" } else evItem.category.replaceFirstChar { it.uppercase() },
                                            title = if (isMarathi) evItem.titleMr.ifBlank { evItem.title } else evItem.title.ifBlank { evItem.titleMr },
                                            venue = if (isMarathi) evItem.venue?.nameMr ?: evItem.venue?.name ?: "" else evItem.venue?.name ?: evItem.venue?.nameMr ?: "",
                                            time = evTime,
                                            priceText = evPrice,
                                            rating = evItem.rating,
                                            ratingCount = evItem.ratingCount,
                                            language = language,
                                            onBookClick = { onSelectEvent(evItem) }
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // 4. Promotional Special Offer Banner: महानाट्य महोत्सव २०२६
                    item {
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            shape = RoundedCornerShape(14.dp),
                            color = Color(0xFFC2410C),
                            shadowElevation = 2.dp
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(
                                        Brush.horizontalGradient(
                                            colors = listOf(Color(0xFFC2410C), MahaOrange)
                                        )
                                    )
                                    .padding(14.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text(text = "✪", color = Color.White, fontSize = 12.sp)
                                    Text(
                                        text = if (isMarathi) "मर्यादित काळासाठी ऑफर" else "Limited Period Offer",
                                        color = Color.White.copy(alpha = 0.95f),
                                        fontSize = 10.5.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                }

                                Spacer(modifier = Modifier.height(4.dp))

                                Text(
                                    text = if (isMarathi) "महानाट्य महोत्सव २०२६" else "MahaNatya Festival 2026",
                                    color = Color.White,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.ExtraBold
                                )

                                Text(
                                    text = if (isMarathi) "सर्व नाटकांच्या आगाऊ बुकिंगवर २०% पर्यंत भरघोस सूट!" else "Up to 20% off on all theatre advance bookings!",
                                    color = Color(0xFFFFEDD5),
                                    fontSize = 11.5.sp,
                                    modifier = Modifier.padding(top = 2.dp)
                                )

                                Spacer(modifier = Modifier.height(10.dp))

                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Surface(
                                        color = Color.Black.copy(alpha = 0.25f),
                                        shape = RoundedCornerShape(8.dp),
                                        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.6f))
                                    ) {
                                        Text(
                                            text = "CODE: MAHA20",
                                            color = Color.White,
                                            fontSize = 11.5.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                        )
                                    }

                                    Surface(
                                        color = Color.White,
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.clickable { onCategorySelected("plays") }
                                    ) {
                                        Text(
                                            text = if (isMarathi) "अटी व शर्ती पहा" else "Terms & Conditions",
                                            color = Color(0xFFC2410C),
                                            fontSize = 11.5.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // 5. Rail 2: आजचे लोकप्रिय कार्यक्रम व मैफिली (TheatricalHorizontalCard)
                    if (musicalEvents.isNotEmpty()) {
                        item {
                            Column(modifier = Modifier.padding(top = 4.dp)) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp, vertical = 6.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Box(
                                            modifier = Modifier
                                                .width(4.dp)
                                                .height(18.dp)
                                                .clip(RoundedCornerShape(2.dp))
                                                .background(MahaOrange)
                                        )
                                        Text(
                                            text = if (isMarathi) "आजचे लोकप्रिय कार्यक्रम व मैफिली" else "Trending Shows & Concerts",
                                            fontSize = 14.5.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = TextPrimary
                                        )
                                    }
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(2.dp),
                                        modifier = Modifier.clickable { onCategorySelected("music") }
                                    ) {
                                        Text(
                                            text = if (isMarathi) "सर्व पहा" else "View All",
                                            fontSize = 11.5.sp,
                                            color = MahaOrange,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                        Icon(
                                            imageVector = Icons.Default.ArrowForward,
                                            contentDescription = null,
                                            tint = MahaOrange,
                                            modifier = Modifier.size(13.dp)
                                        )
                                    }
                                }

                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp),
                                    verticalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    musicalEvents.take(4).forEach { evItem ->
                                        val evPrice = evItem.minPrice?.let { CurrencyUtils.formatPaiseToRupees(it) } ?: ""
                                        TheatricalHorizontalCard(
                                            thumbnailUrl = evItem.posterUrl ?: "",
                                            tag = if (isMarathi) evItem.categoryMr.ifBlank { "विशेष कार्यक्रम" } else evItem.category.replaceFirstChar { it.uppercase() },
                                            title = if (isMarathi) evItem.titleMr.ifBlank { evItem.title } else evItem.title.ifBlank { evItem.titleMr },
                                            venue = if (isMarathi) evItem.venue?.nameMr ?: evItem.venue?.name ?: "" else evItem.venue?.name ?: evItem.venue?.nameMr ?: "",
                                            priceText = evPrice,
                                            rating = evItem.rating,
                                            ratingCount = evItem.ratingCount,
                                            language = language,
                                            onTicketClick = { onSelectEvent(evItem) }
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // 6. Rail 3: सर्व आगामी कार्यक्रम Section Header & Event Cards (Placed BEFORE Theatres directory rail!)
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = if (isMarathi) "सर्व आगामी कार्यक्रम" else "All Upcoming Events",
                                fontSize = 14.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = if (isMarathi) "${filteredEvents.size} कार्यक्रम उपलब्ध" else "${filteredEvents.size} events available",
                                fontSize = 11.5.sp,
                                color = MahaOrange,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }

                    if (eventsState is EventsUiState.Loading) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(160.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator(color = MahaOrange, modifier = Modifier.size(32.dp))
                            }
                        }
                    } else if (eventsState is EventsUiState.Error) {
                        item {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = (eventsState as EventsUiState.Error).message,
                                    color = Color(0xFFDC2626),
                                    fontSize = 12.5.sp,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Button(
                                    onClick = onRetry,
                                    colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text(if (isMarathi) "पुन्हा प्रयत्न करा" else "Retry", color = Color.White, fontSize = 12.sp)
                                }
                            }
                        }
                    } else if (filteredEvents.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(140.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = if (isMarathi) "कोणतेही कार्यक्रम उपलब्ध नाहीत." else "No events available.",
                                    color = TextSecondary,
                                    fontSize = 13.sp
                                )
                            }
                        }
                    } else {
                        items(filteredEvents) { event ->
                            val rawItem = rawEvents.firstOrNull { it.id.toString() == event.id }
                            EventCardItem(
                                event = event,
                                rawItem = rawItem,
                                language = language,
                                onCardClick = { if (rawItem != null) onSelectEvent(rawItem) },
                                onBookClick = { if (rawItem != null) onSelectEvent(rawItem) }
                            )
                        }
                    }

                    // 7. Rail 4: नाट्यगृह दर्शन (Theatres Directory - Placed BEFORE bottom trust proposition!)
                    item {
                        TheatresDirectorySection(
                            selectedCity = selectedCity,
                            language = language,
                            onTheatreClick = { theatreName, theatreCity ->
                                onCitySelected(theatreCity)
                                onSearch(theatreName)
                            }
                        )
                    }

                    // 8. Rail 5: विश्वसनीयता आणि हमी (Trust Proposition matching web - Placed at bottom)
                    item {
                        TrustPropositionSection(language = language)
                    }

                    // 9. Organizer Quick Access Card
                    item {
                        Surface(
                            color = MahaWarm,
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, Color(0xFFFFEDD5)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 6.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Surface(
                                        shape = CircleShape,
                                        color = Color(0xFFFFDBCE),
                                        modifier = Modifier.size(36.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Icon(
                                                imageVector = Icons.Default.QrCodeScanner,
                                                contentDescription = "Scanner",
                                                tint = MahaOrangeDeep,
                                                modifier = Modifier.size(18.dp)
                                            )
                                        }
                                    }
                                    Column {
                                        Text(
                                            text = if (isMarathi) "आयोजक आहात का?" else "Are you an Organizer?",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = TextPrimary
                                        )
                                        Text(
                                            text = if (isMarathi) "येथे कार्यक्रम नोंदवा / तिकीट व्यवस्था" else "List events / manage ticketing here",
                                            fontSize = 10.5.sp,
                                            color = TextSecondary
                                        )
                                    }
                                }
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = Color.White,
                                    border = BorderStroke(1.dp, MahaOrange.copy(alpha = 0.3f)),
                                    modifier = Modifier.clickable { /* Organizer access */ }
                                ) {
                                    Text(
                                        text = if (isMarathi) "प्रवेश करा" else "Enter",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MahaOrange,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                    )
                                }
                            }
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

@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
@Composable
private fun HeroBannerCarousel(
    heroEvents: List<EventItem>,
    language: AppLanguage = AppLanguage.MARATHI,
    onSelectEvent: (EventItem) -> Unit
) {
    if (heroEvents.isEmpty()) return
    val isMarathi = language == AppLanguage.MARATHI

    val pagerState = androidx.compose.foundation.pager.rememberPagerState(pageCount = { heroEvents.size })

    // Auto-advance every 5 seconds
    LaunchedEffect(pagerState.pageCount) {
        if (pagerState.pageCount > 1) {
            while (true) {
                kotlinx.coroutines.delay(5000)
                val nextPage = (pagerState.currentPage + 1) % pagerState.pageCount
                pagerState.animateScrollToPage(nextPage)
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(235.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(Color(0xFF141B2B))
        ) {
            androidx.compose.foundation.pager.HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxSize()
            ) { page ->
                val ev = heroEvents[page]
                val imageUrl = if (!ev.bannerUrl.isNullOrBlank()) ev.bannerUrl else ev.posterUrl
                val title = if (isMarathi) (ev.titleMr.takeIf { !it.isNullOrBlank() } ?: ev.title) else (ev.title.takeIf { !it.isNullOrBlank() } ?: ev.titleMr)
                val categoryText = if (isMarathi) (ev.categoryMr.takeIf { !it.isNullOrBlank() } ?: ev.category) else (ev.category.takeIf { !it.isNullOrBlank() } ?: ev.categoryMr)
                val venueText = if (isMarathi) (ev.venue?.nameMr?.takeIf { !it.isNullOrBlank() } ?: ev.venue?.name ?: "") else (ev.venue?.name?.takeIf { !it.isNullOrBlank() } ?: ev.venue?.nameMr ?: "")
                val sessionTime = ev.sessions?.firstOrNull()?.sessionStartTime?.let {
                    DateTimeUtils.formatEventCardDateTime(it)
                } ?: ""

                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .clickable { onSelectEvent(ev) }
                ) {
                    // Background Image
                    AsyncImage(
                        model = imageUrl,
                        contentDescription = title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )

                    // Dual Gradient Overlay for web parity and high contrast
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color(0xFF141B2B).copy(alpha = 0.35f),
                                        Color(0xFF141B2B).copy(alpha = 0.95f)
                                    )
                                )
                            )
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.horizontalGradient(
                                    colors = listOf(
                                        Color(0xFF141B2B).copy(alpha = 0.85f),
                                        Color.Transparent
                                    )
                                )
                            )
                    )

                    // Badges Top Row
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .align(Alignment.TopStart)
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                color = MahaOrange,
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(3.dp)
                                ) {
                                    Text(text = "🔥", fontSize = 10.sp)
                                    Text(
                                        text = if (isMarathi) (if (ev.featured == 1) "विशेष शिफारस" else "थेट बुकिंग") else (if (ev.featured == 1) "Featured" else "Fast Booking"),
                                        color = Color.White,
                                        fontSize = 10.5.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }

                            if (categoryText.isNotBlank()) {
                                Surface(
                                    color = Color.White.copy(alpha = 0.92f),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text(
                                        text = categoryText,
                                        color = MahaOrangeDeep,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                    )
                                }
                            }
                        }

                        // Rating badge (Render ONLY when genuine rating exists)
                        val rating = ev.rating
                        if (rating != null && rating > 0.0) {
                            val ratingStr = if (rating > 5.0) String.format(java.util.Locale.US, "%.1f", rating / 2.0) else String.format(java.util.Locale.US, "%.1f", rating)
                            Surface(
                                color = Color(0xFF141B2B).copy(alpha = 0.75f),
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(0.5.dp, Color(0xFFF59E0B).copy(alpha = 0.6f))
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(3.dp)
                                ) {
                                    Text(text = "★", color = Color(0xFFF59E0B), fontSize = 11.sp)
                                    Text(
                                        text = ratingStr,
                                        color = Color.White,
                                        fontSize = 10.5.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    if (ev.ratingCount != null && ev.ratingCount > 0) {
                                        Text(
                                            text = "(${ev.ratingCount})",
                                            color = Color.White.copy(alpha = 0.7f),
                                            fontSize = 9.sp
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Content on Gradient (Bottom)
                    Column(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .fillMaxWidth()
                            .padding(14.dp)
                    ) {
                        Text(
                            text = title,
                            color = Color.White,
                            fontSize = 17.5.sp,
                            fontWeight = FontWeight.ExtraBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )

                        // Date and Venue pills
                        if (sessionTime.isNotBlank() || venueText.isNotBlank()) {
                            Row(
                                modifier = Modifier.padding(top = 4.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                if (sessionTime.isNotBlank()) {
                                    Surface(
                                        color = Color.White.copy(alpha = 0.15f),
                                        shape = RoundedCornerShape(6.dp)
                                    ) {
                                        Text(
                                            text = "📅 $sessionTime",
                                            color = Color.White,
                                            fontSize = 10.5.sp,
                                            fontWeight = FontWeight.Medium,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                                if (venueText.isNotBlank()) {
                                    Surface(
                                        color = Color.White.copy(alpha = 0.15f),
                                        shape = RoundedCornerShape(6.dp)
                                    ) {
                                        Text(
                                            text = "🏛️ $venueText",
                                            color = Color(0xFFFFDBCE),
                                            fontSize = 10.5.sp,
                                            fontWeight = FontWeight.Medium,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                            }
                        }

                        // Bottom Actions Row: Price tag + Details indicator (NO duplicate book button inside hero)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            val minPrice = ev.minPrice?.let { CurrencyUtils.formatPaiseToRupees(it) } ?: "₹२५०"
                            Surface(
                                color = Color.Black.copy(alpha = 0.45f),
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(0.5.dp, Color.White.copy(alpha = 0.25f))
                            ) {
                                Text(
                                    text = if (isMarathi) "$minPrice पासून" else "From $minPrice",
                                    color = Color(0xFFFFEDD5),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }

                            Surface(
                                color = Color.White.copy(alpha = 0.2f),
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(0.5.dp, Color.White.copy(alpha = 0.4f))
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text(
                                        text = if (isMarathi) "तपशील पहा" else "View Show",
                                        fontSize = 11.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                    Icon(
                                        imageVector = Icons.Default.ArrowForward,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(12.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Dot indicators in bottom right if > 1 page
            if (pagerState.pageCount > 1) {
                Row(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    repeat(pagerState.pageCount) { index ->
                        val isSelected = pagerState.currentPage == index
                        Box(
                            modifier = Modifier
                                .width(if (isSelected) 14.dp else 5.dp)
                                .height(4.dp)
                                .clip(RoundedCornerShape(2.dp))
                                .background(if (isSelected) MahaOrange else Color.White.copy(alpha = 0.5f))
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TheatresDirectorySection(
    selectedCity: String,
    language: AppLanguage = AppLanguage.MARATHI,
    onTheatreClick: (theatreName: String, theatreCity: String) -> Unit
) {
    val isMarathi = language == AppLanguage.MARATHI
    val theatres = if (isMarathi) listOf(
        Triple("बालगंधर्व रंगमंदिर", "जे. एम. रोड, शिवाजीनगर, पुणे", "पुणे"),
        Triple("श्री छत्रपती शिवाजी मंदिर", "दादर पश्चिम, मुंबई", "मुंबई"),
        Triple("यशवंतराव चव्हाण नाट्यगृह", "कोथरूड, पुणे", "पुणे"),
        Triple("दीनानाथ मंगेशकर नाट्यगृह", "विलेपार्ले पूर्व, मुंबई", "मुंबई")
    ) else listOf(
        Triple("Bal Gandharva Ranga Mandir", "J.M. Road, Shivajinagar, Pune", "Pune"),
        Triple("Shree Chhatrapati Shivaji Mandir", "Dadar West, Mumbai", "Mumbai"),
        Triple("Yashwantrao Chavan Natyagruha", "Kothrud, Pune", "Pune"),
        Triple("Dinanath Mangeshkar Natyagruha", "Vile Parle East, Mumbai", "Mumbai")
    )

    Column(modifier = Modifier.padding(top = 8.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Box(
                    modifier = Modifier
                        .width(4.dp)
                        .height(18.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(MahaOrange)
                )
                Column {
                    Text(
                        text = if (isMarathi) "नाट्यगृह दर्शन" else "Theatres Directory",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MahaOrange
                    )
                    Text(
                        text = if (isMarathi) "महाराष्ट्रातील प्रमुख नाट्यगृहे" else "Prominent Theatres in Maharashtra",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                }
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            theatres.forEach { (name, address, city) ->
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = Color.White,
                    border = BorderStroke(1.dp, MahaBorder),
                    shadowElevation = 1.dp,
                    modifier = Modifier
                        .width(240.dp)
                        .clickable { onTheatreClick(name, city) }
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = MahaWarm,
                                modifier = Modifier.size(36.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(text = "🏛️", fontSize = 18.sp)
                                }
                            }
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = Color(0xFFDCFCE7)
                            ) {
                                Text(
                                    text = if (isMarathi) "आज २ प्रयोग" else "2 Shows Today",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF16A34A),
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Text(
                            text = name,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = TextPrimary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(3.dp),
                            modifier = Modifier.padding(top = 2.dp)
                        ) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = MahaOrange, modifier = Modifier.size(12.dp))
                            Text(
                                text = address,
                                fontSize = 11.sp,
                                color = TextSecondary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }

                        Row(
                            modifier = Modifier.padding(top = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Surface(color = Color(0xFFF1F5F9), shape = RoundedCornerShape(4.dp)) {
                                Text(text = if (isMarathi) "AC सभागृह" else "AC Hall", fontSize = 9.5.sp, color = Color(0xFF475569), modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                            }
                            Surface(color = Color(0xFFF1F5F9), shape = RoundedCornerShape(4.dp)) {
                                Text(text = if (isMarathi) "वाहनतळ" else "Parking", fontSize = 9.5.sp, color = Color(0xFF475569), modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MahaWarm,
                            border = BorderStroke(1.dp, MahaOrange.copy(alpha = 0.3f)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onTheatreClick(name, city) }
                        ) {
                            Text(
                                text = if (isMarathi) "येथील प्रयोग पहा →" else "View Shows Here →",
                                fontSize = 11.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = MahaOrange,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(vertical = 7.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TrustPropositionSection(language: AppLanguage = AppLanguage.MARATHI) {
    val isMarathi = language == AppLanguage.MARATHI
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        border = BorderStroke(1.dp, MahaBorder),
        shadowElevation = 1.dp,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = if (isMarathi) "विश्वसनीयता आणि हमी" else "Trust & Guarantees",
                fontSize = 13.5.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Item 1
                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "🎟️", fontSize = 20.sp)
                    Column {
                        Text(text = if (isMarathi) "झटपट एम-तिकीट" else "Instant M-Ticket", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(text = if (isMarathi) "त्वरित व्हॉट्सॲप पास" else "WhatsApp Digital Pass", fontSize = 9.5.sp, color = TextSecondary)
                    }
                }

                // Item 2
                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "💺", fontSize = 20.sp)
                    Column {
                        Text(text = if (isMarathi) "थेट आसन निवड" else "Live Seat Selection", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(text = if (isMarathi) "रिअल-टाइम लेआउट" else "Real-time Seat Layout", fontSize = 9.5.sp, color = TextSecondary)
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Item 3
                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "🔒", fontSize = 20.sp)
                    Column {
                        Text(text = if (isMarathi) "१००% सुरक्षित पेमेंट" else "100% Safe Payments", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(text = if (isMarathi) "UPI व कार्ड व्यवहार" else "UPI & Card Checkout", fontSize = 9.5.sp, color = TextSecondary)
                    }
                }

                // Item 4
                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "📞", fontSize = 20.sp)
                    Column {
                        Text(text = if (isMarathi) "२४x७ मराठी सपोर्ट" else "24x7 Support", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(text = if (isMarathi) "मराठीत ग्राहक सेवा" else "Marathi & English Support", fontSize = 9.5.sp, color = TextSecondary)
                    }
                }
            }
        }
    }
}

@Composable
private fun TheatricalPosterCard(
    posterUrl: String,
    badgeText: String,
    badgeColor: Color,
    subBadge: String,
    title: String,
    venue: String,
    time: String,
    priceText: String = "",
    rating: Double? = null,
    ratingCount: Int? = null,
    language: AppLanguage = AppLanguage.MARATHI,
    onBookClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .width(200.dp)
            .clip(RoundedCornerShape(14.dp))
            .clickable { onBookClick() },
        color = Color.White,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, MahaBorder),
        shadowElevation = 1.5.dp
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(245.dp)
                    .background(Color(0xFF141B2B))
            ) {
                AsyncImage(
                    model = posterUrl,
                    contentDescription = title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
                // Top Tag
                Surface(
                    color = badgeColor,
                    shape = RoundedCornerShape(6.dp),
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(8.dp)
                ) {
                    Text(
                        text = badgeText,
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.5.dp)
                    )
                }
                // Genre Sub-badge
                if (subBadge.isNotBlank()) {
                    Surface(
                        color = Color.Black.copy(alpha = 0.7f),
                        shape = RoundedCornerShape(6.dp),
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(8.dp)
                    ) {
                        Text(
                            text = subBadge,
                            color = Color.White,
                            fontSize = 9.5.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.5.dp)
                        )
                    }
                }
                // Rating Star Badge Overlay (Web EventCard.tsx exact match: only render if genuine rating exists)
                if (rating != null && rating > 0.0) {
                    val ratingStr = if (rating > 5.0) String.format(java.util.Locale.US, "%.1f", rating / 2.0) else String.format(java.util.Locale.US, "%.1f", rating)
                    Surface(
                        color = Color.White.copy(alpha = 0.95f),
                        shape = RoundedCornerShape(6.dp),
                        border = BorderStroke(0.5.dp, Color.White),
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.5.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(2.dp)
                        ) {
                            Text(text = "★", color = Color(0xFFF59E0B), fontSize = 11.5.sp)
                            Text(
                                text = ratingStr,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color(0xFF141B2B)
                            )
                            if (ratingCount != null && ratingCount > 0) {
                                Text(
                                    text = "($ratingCount)",
                                    fontSize = 9.sp,
                                    color = TextSecondary
                                )
                            }
                        }
                    }
                }
            }

            Column(modifier = Modifier.padding(10.dp)) {
                Text(
                    text = title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(3.dp),
                    modifier = Modifier.padding(top = 3.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = MahaOrange,
                        modifier = Modifier.size(12.dp)
                    )
                    Text(
                        text = venue,
                        fontSize = 11.sp,
                        color = TextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                if (time.isNotBlank()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(3.dp),
                        modifier = Modifier.padding(top = 2.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Schedule,
                            contentDescription = null,
                            tint = Color(0xFFC2410C),
                            modifier = Modifier.size(12.dp)
                        )
                        Text(
                            text = time,
                            fontSize = 11.sp,
                            color = Color(0xFFC2410C),
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = priceText.ifBlank { if (language == AppLanguage.MARATHI) "₹२५० पासून" else "From ₹250" },
                        fontSize = 13.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MahaOrangeDeep
                    )

                    Surface(
                        color = MahaOrange,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.clickable { onBookClick() }
                    ) {
                        Text(
                            text = if (language == AppLanguage.MARATHI) "जागा निवडा" else "Book Seats",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TheatricalHorizontalCard(
    thumbnailUrl: String,
    tag: String,
    title: String,
    venue: String,
    priceText: String = "",
    rating: Double? = null,
    ratingCount: Int? = null,
    language: AppLanguage = AppLanguage.MARATHI,
    onTicketClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .clickable { onTicketClick() },
        color = Color.White,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, MahaBorder),
        shadowElevation = 1.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(86.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color(0xFF141B2B))
            ) {
                AsyncImage(
                    model = thumbnailUrl,
                    contentDescription = title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
                if (rating != null && rating > 0.0) {
                    val ratingStr = if (rating > 5.0) String.format(java.util.Locale.US, "%.1f", rating / 2.0) else String.format(java.util.Locale.US, "%.1f", rating)
                    Surface(
                        color = Color.Black.copy(alpha = 0.75f),
                        shape = RoundedCornerShape(4.dp),
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(3.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 3.dp, vertical = 1.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(2.dp)
                        ) {
                            Text(text = "★", color = Color(0xFFF59E0B), fontSize = 9.sp)
                            Text(text = ratingStr, color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            Column(modifier = Modifier.weight(1f)) {
                Surface(
                    color = MahaWarm,
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = tag,
                        fontSize = 9.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = MahaOrangeDeep,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
                Text(
                    text = title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 3.dp)
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(3.dp),
                    modifier = Modifier.padding(top = 2.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = MahaOrange,
                        modifier = Modifier.size(11.dp)
                    )
                    Text(
                        text = venue,
                        fontSize = 11.sp,
                        color = TextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = priceText.ifBlank { if (language == AppLanguage.MARATHI) "₹२५० पासून" else "From ₹250" },
                        fontSize = 12.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = MahaOrangeDeep
                    )

                    Surface(
                        color = MahaOrange,
                        shape = RoundedCornerShape(6.dp),
                        modifier = Modifier.clickable { onTicketClick() }
                    ) {
                        Text(
                            text = if (language == AppLanguage.MARATHI) "तिकीट घ्या" else "Book Seats",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun EventCardItem(
    event: Event,
    rawItem: EventItem?,
    language: AppLanguage = AppLanguage.MARATHI,
    onCardClick: () -> Unit,
    onBookClick: () -> Unit
) {
    Card(
        onClick = onCardClick,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp)
            .testTag("event_card_${event.id}"),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = BorderStroke(1.dp, MahaBorder)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .width(104.dp)
                    .height(138.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color(0xFF141B2B))
            ) {
                AsyncImage(
                    model = event.posterUrl,
                    contentDescription = event.titleEn,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
                val rating = rawItem?.rating
                if (rating != null && rating > 0.0) {
                    val ratingStr = if (rating > 5.0) String.format(java.util.Locale.US, "%.1f", rating / 2.0) else String.format(java.util.Locale.US, "%.1f", rating)
                    Surface(
                        color = Color.Black.copy(alpha = 0.75f),
                        shape = RoundedCornerShape(4.dp),
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(4.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(2.dp)
                        ) {
                            Text(text = "★", color = Color(0xFFF59E0B), fontSize = 10.sp)
                            Text(text = ratingStr, color = Color.White, fontSize = 9.5.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Surface(
                    color = MahaWarm,
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = if (language == AppLanguage.MARATHI) (rawItem?.categoryMr?.takeIf { it.isNotBlank() } ?: event.category.displayMr) else (rawItem?.category?.takeIf { it.isNotBlank() } ?: event.category.name),
                        fontSize = 9.5.sp,
                        color = MahaOrangeDeep,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = if (language == AppLanguage.MARATHI) event.titleMr else event.titleEn.ifBlank { event.titleMr },
                    fontSize = 14.5.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(3.dp),
                    modifier = Modifier.padding(top = 3.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = MahaOrange,
                        modifier = Modifier.size(12.dp)
                    )
                    Text(
                        text = if (language == AppLanguage.MARATHI) event.venue.nameMr else event.venue.nameEn.ifBlank { event.venue.nameMr },
                        fontSize = 11.5.sp,
                        color = TextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                val showTimeStr = rawItem?.sessions?.firstOrNull()?.sessionStartTime?.let {
                    DateTimeUtils.formatEventCardDateTime(it)
                }
                if (!showTimeStr.isNullOrBlank()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(3.dp),
                        modifier = Modifier.padding(top = 2.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Schedule,
                            contentDescription = null,
                            tint = Color(0xFFC2410C),
                            modifier = Modifier.size(12.dp)
                        )
                        Text(
                            text = showTimeStr,
                            fontSize = 11.sp,
                            color = Color(0xFFC2410C),
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val priceStr = rawItem?.minPrice?.let {
                        if (it > 0) CurrencyUtils.formatPaiseToRupees(it) else null
                    } ?: if (language == AppLanguage.MARATHI) "₹२५० पासून" else "From ₹250"

                    Text(
                        text = priceStr,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MahaOrangeDeep
                    )

                    Button(
                        onClick = onBookClick,
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                        modifier = Modifier.testTag("book_now_btn_${event.id}"),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = if (language == AppLanguage.MARATHI) "जागा निवडा" else "Book Seats",
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun HomeShimmerLoading(modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "home_shimmer")
    val translateAnim by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1200f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1100, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer_anim"
    )
    val shimmerBrush = Brush.linearGradient(
        colors = listOf(
            Color(0xFFE2E8F0),
            Color(0xFFF1F5F9),
            Color(0xFFE2E8F0)
        ),
        start = androidx.compose.ui.geometry.Offset(translateAnim - 450f, translateAnim - 450f),
        end = androidx.compose.ui.geometry.Offset(translateAnim, translateAnim)
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Shimmer Hero Banner (adaptive 235dp height)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(235.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(shimmerBrush)
        )

        // Shimmer Category Quick Discovery Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            repeat(5) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        modifier = Modifier
                            .size(54.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(shimmerBrush)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Box(
                        modifier = Modifier
                            .width(42.dp)
                            .height(10.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(shimmerBrush)
                    )
                }
            }
        }

        // Shimmer Section Header
        Box(
            modifier = Modifier
                .width(190.dp)
                .height(20.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(shimmerBrush)
        )

        // Shimmer Theatrical Poster Cards Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            repeat(2) {
                Box(
                    modifier = Modifier
                        .width(200.dp)
                        .height(245.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(shimmerBrush)
                )
            }
        }
    }
}

