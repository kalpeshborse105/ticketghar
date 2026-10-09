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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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

    val featured = mappedEvents.firstOrNull()

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MahaBg)
            .testTag("home_screen_feed")
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 80.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            item {
                Spacer(modifier = Modifier.height(2.dp))
            }

            // Featured Hero Spotlight (Stitch Exact: "नियम व अटी लागू")
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color(0xFF141B2B))
                        .clickable {
                            val target = rawEvents.firstOrNull { it.id.toString() == featured?.id }
                                ?: rawEvents.firstOrNull()
                            if (target != null) onSelectEvent(target)
                        }
                        .testTag("hero_spotlight_banner")
                ) {
                    AsyncImage(
                        model = featured?.posterUrl?.takeIf { it.isNotBlank() }
                            ?: "https://lh3.googleusercontent.com/aida-public/AB6AXuCP_BzdA34e8II4J2ZcM6V_bk1jorCB0dqJ-yED0HtW3ncqCpgRvvbmrb1qvB1-XgNZOvZ8UjOlJ_NFiFJYqyixvq9ux2kB8YnA79OL6twW3Ywm_bbgfXevbzL_f_EMMG0EOdLLE5Wp-79Fq3YTag-2B2SVXakRChxVfAlH8mGiBeB6Qp9u561aT3Pug3yWCUvYNhuxBIhcZFDlh5cDbMgUoszlRBMBQuJgP0A-Ook",
                        contentDescription = featured?.titleEn ?: "Featured Play",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(210.dp)
                    )

                    // Top Badges (Stitch Exact: हाऊसफुल्ल, मराठी नाटक + Heart bookmark)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .align(Alignment.TopStart)
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Surface(
                                color = MahaOrange,
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                                ) {
                                    Text(text = "🔥", fontSize = 10.sp)
                                    Text(
                                        text = "हाऊसफुल्ल",
                                        color = Color.White,
                                        fontSize = 10.5.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                            Surface(
                                color = Color.White.copy(alpha = 0.95f),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(
                                    text = "मराठी नाटक",
                                    color = MahaOrangeDeep,
                                    fontSize = 10.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                        }

                        Surface(
                            color = Color(0xFF141B2B).copy(alpha = 0.6f),
                            shape = CircleShape,
                            modifier = Modifier.size(32.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Outlined.FavoriteBorder,
                                    contentDescription = "Save",
                                    tint = Color.White,
                                    modifier = Modifier.size(17.dp)
                                )
                            }
                        }
                    }

                    // Content on Dark Gradient
                    Column(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .fillMaxWidth()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(Color.Transparent, Color(0xFF141B2B).copy(alpha = 0.95f))
                                )
                            )
                            .padding(14.dp)
                    ) {
                        Text(
                            text = featured?.titleMr ?: "नियम व अटी लागू",
                            color = Color.White,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                        Text(
                            text = "कलाकार: प्रसाद ओक, मुक्ता बर्वे • दिग्दर्शन: चंद्रकांत कुलकर्णी",
                            color = Color(0xFFE2E8F0),
                            fontSize = 11.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.padding(top = 2.dp)
                        )

                        Row(
                            modifier = Modifier.padding(top = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(
                                text = "📅 शनिवार, १२ ऑक्टोबर • संध्या. ०५:००",
                                color = Color(0xFFFFDBCE),
                                fontSize = 10.5.sp
                            )
                            Text(
                                text = "🏛️ बाळ गंधर्व रंगमंदिर, पुणे",
                                color = Color(0xFFFFDBCE),
                                fontSize = 10.5.sp
                            )
                        }

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 8.dp),
                            horizontalArrangement = Arrangement.End,
                            verticalAlignment = Alignment.CenterVertically
                        ) {

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Surface(
                                    color = Color.White.copy(alpha = 0.15f),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.clickable {
                                        val target = rawEvents.firstOrNull { it.id.toString() == featured?.id }
                                            ?: rawEvents.firstOrNull()
                                        if (target != null) onSelectEvent(target)
                                    }
                                ) {
                                    Text(
                                        text = "अधिक माहिती",
                                        fontSize = 11.5.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color.White,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp)
                                    )
                                }

                                Surface(
                                    color = MahaOrange,
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.clickable {
                                        val target = rawEvents.firstOrNull { it.id.toString() == featured?.id }
                                            ?: rawEvents.firstOrNull()
                                        if (target != null) onSelectEvent(target)
                                    }
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Text(
                                            text = "तिकीट बुक करा",
                                            fontSize = 11.5.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                        Icon(
                                            imageVector = Icons.Default.ArrowForward,
                                            contentDescription = "Book",
                                            tint = Color.White,
                                            modifier = Modifier.size(13.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Category Quick Discovery (मनोरंजन वर्ग - Stitch 8 Tiles)
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
                            text = "मनोरंजन वर्ग",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Text(
                            text = "सर्व श्रेणी",
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MahaOrange,
                            modifier = Modifier.clickable { onCategorySelected("all") }
                        )
                    }

                    val stitchCategories = listOf(
                        Triple("all", "सर्व", "🎭"),
                        Triple("plays", "नाटक", "🎭"),
                        Triple("music", "संगीत मैफल", "🎵"),
                        Triple("comedy", "स्टँडअप", "😄"),
                        Triple("cultural", "सांस्कृतिक", "🎪"),
                        Triple("workshops", "कार्यशाळा", "🎨"),
                        Triple("movies", "चित्रपट", "🎬"),
                        Triple("sports", "क्रीडा", "🏏")
                    )

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        stitchCategories.forEach { (catId, catLabel, emoji) ->
                            val isSelected = selectedCategory == catId || (catId == "all" && (selectedCategory == "all" || selectedCategory == "सर्व"))
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

            // Rail 1: मराठी रंगभूमी विशेष (Stitch BookMyShow Poster Rail)
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
                                text = "मराठी रंगभूमी विशेष",
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
                                text = "सर्व पहा",
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

                    // Poster Rail Cards
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Poster Card 1: अलबत्या गलबत्या
                        TheatricalPosterCard(
                            posterUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuCtuz94KtGOkBNKLrNOl7iZyQE4yO1W8ITKd0Pjx9QmRWS5wqyPiALT8xUGAupNQ8BrmGXv8oYnsxq_CXQcH0G2SvWcCQdGCTD7ifEclpgBkWh4IsypnpNlVL_a1kAZvcNRZwRl3RazKxN6mQEDBbUTE3n3N1UftuJHUsF5-MLExK609QnEimYt9zOV2G6lgrI9uDCtLPye2mA00b7KKlKkX0iVDR7E7xQDaYSHJns",
                            badgeText = "Selling Fast",
                            badgeColor = Color(0xFFDC2626),
                            subBadge = "बालनाट्य",
                            title = "अलबत्या गलबत्या",
                            venue = "यशवंतराव चव्हाण नाट्यगृह, कोथरूड",
                            time = "🕒 रविवार • दु. १२:३०",
                            onBookClick = {
                                val item = rawEvents.firstOrNull { it.titleMr.contains("अलबत्या") } ?: rawEvents.firstOrNull()
                                if (item != null) onSelectEvent(item)
                            }
                        )

                        // Poster Card 2: सही रे सही
                        TheatricalPosterCard(
                            posterUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuBhEXQlRdtokmftpgaQgTpAgzHn7uJPXapI2_Fu6QvOqJXFE1vZgqKDu2PxX9qxnPNFUgoXOo3RZDmYni6gmOKemuejqqHX_mDa8XpF84gB54D1ETrY5gco_u_00to1_t8KO4ELnxl-ipMy6UCAL8t1gTzaZhxdUYUZCS5DHSEVupys6dqxY7dGeIgMD37H_ngeTO2BvVGIaVenbyhKWFJRKzT430JwA0OhGlvMlIY",
                            badgeText = "भरत जाधव विशेष",
                            badgeColor = MahaOrange,
                            subBadge = "हास्य प्रहसन",
                            title = "सही रे सही",
                            venue = "प्रबोधनकार ठाकरे नाट्यगृह, मुंबई",
                            time = "🕒 शनिवार • रात्रौ ०८:३०",
                            onBookClick = {
                                val item = rawEvents.firstOrNull { it.titleMr.contains("सही") } ?: rawEvents.firstOrNull()
                                if (item != null) onSelectEvent(item)
                            }
                        )

                        // Poster Card 3: वाडा चिरेबंदी
                        TheatricalPosterCard(
                            posterUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuC-KoOtnmU0lu7F27prt9v70OeCUTs5e3GE57yqmf7OULAXQRK_TjM1IfeUG-0_Cy_Ef06_-VltGCZHt0lY7ZcqD_3dmMQIiSIANl4rnK6nH83hUHNDtXK8K3HY8SjdiwP9U_CE-6C_WfV3skUcGAffMX0sotvwd-LRiag4P3UE3qvRXbcwAw6B1P-GGAfsaF1cAKw8UFcGwA1VK2e8tssskeJBl3VQNUmxfVBQzPI",
                            badgeText = "क्लासिक नाटक",
                            badgeColor = Color(0xFFC2410C),
                            subBadge = "कौटुंबिक नाट्य",
                            title = "वाडा चिरेबंदी",
                            venue = "टिळक स्मारक मंदिर, पुणे",
                            time = "🕒 रविवार • संध्या. ०५:००",
                            onBookClick = {
                                val item = rawEvents.firstOrNull { it.titleMr.contains("वाडा") } ?: rawEvents.firstOrNull()
                                if (item != null) onSelectEvent(item)
                            }
                        )
                    }
                }
            }

            // Rail 2: आजचे लोकप्रिय कार्यक्रम व मैफिली (Horizontal Cards)
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
                                text = "आजचे लोकप्रिय कार्यक्रम व मैफिली",
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
                                text = "सर्व पहा",
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
                        // Card 1: Rahul Deshpande
                        TheatricalHorizontalCard(
                            thumbnailUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuBPDUS0iDXeFV_yQ-m_iqlNn8nh_94QZbbDaaAA1KucO0fUFQzhXnYSqU6OAPGUIoWRYTAv8Gl6H6gMYkJM0Y6YGv2xqtuGf1i8RPSNwZJZ4tftyZk3tWXFSqxbeDcdSn4s0TmchxWu97rpVLVHtUxcnzA70bQC_3L-DATOukRVUvXj0QqRPJtJqn_XxGmAHFs4t1EvCGfxx10EfxTufYF_CRLdx-HhoJJ_nMqj260",
                            tag = "कट्यार विशेष",
                            title = "राहुल देशपांडे लाईव्ह इन कॉन्सर्ट",
                            venue = "गणेश कला क्रीडा मंच, स्वारगेट, पुणे",
                            onTicketClick = {
                                val item = rawEvents.firstOrNull { it.category == "music" } ?: rawEvents.firstOrNull()
                                if (item != null) onSelectEvent(item)
                            }
                        )

                        // Card 2: Haswa Faswi
                        TheatricalHorizontalCard(
                            thumbnailUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuAlv0c05OiPD6XgNJz-6U3M5-QV7pO4DDCQCexQJSukBm0zKutEZ2lgu2L3gw1aO5y8-cHYNTqythqmGqXncTT-6hqnh3XD65mq9VGFMlDVRrQxCaON_I0VKzGVYNBug4QM8pgIteeNGs-NPDL-RzcKipltfiGedkTBSJdxgGnMpJELQ6qGnksncsef6tySQii1AQisGBkwOmPYC_PzZFQM50hhfvDfw0glzWY4xec",
                            tag = "स्टँडअप आणि प्रहसन",
                            title = "हसवा फसवी",
                            venue = "बाल गंधर्व रंगमंदिर, पुणे",
                            onTicketClick = {
                                val item = rawEvents.firstOrNull { it.category == "comedy" } ?: rawEvents.firstOrNull()
                                if (item != null) onSelectEvent(item)
                            }
                        )
                    }
                }
            }

            // Rail 3: पुण्यातले खास कार्यक्रम (Bal Gandharva / Pune Theatres Map Banner)
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
                                text = "पुण्यातील खास कार्यक्रम",
                                fontSize = 14.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                        }
                        Text(
                            text = "सर्व पहा →",
                            fontSize = 11.5.sp,
                            color = MahaOrange,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.clickable { onCitySelected("Pune") }
                        )
                    }

                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                            .height(115.dp)
                            .clip(RoundedCornerShape(14.dp)),
                        color = Color(0xFF1E293B)
                    ) {
                        Box(modifier = Modifier.fillMaxSize()) {
                            AsyncImage(
                                model = "https://lh3.googleusercontent.com/aida-public/AB6AXuB6ztsm3IdTNOVG0EJCUZ1TmGjjsREouPDMQFIufbjUzDeWyS2C5rNsA9DMZXZf-k8jjf6aw5VKUcGcUpW2N2-WWDRrb51laDI9Mb3pa0Jyv47Ap9CzuatDR4fUMScfgfV3OgUNDlNcZWUfMu-YYtekHWsSG9GFa_WmSGlBorSN_b2wyj2AijXj6rSnVFKrFjyRguGJIypluC6FDGui5aeXyN5raEV8XNAe1NNJtpQ",
                                contentDescription = "Pune Theatres Map",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(
                                        Brush.verticalGradient(
                                            colors = listOf(Color.Black.copy(alpha = 0.2f), Color.Black.copy(alpha = 0.75f))
                                        )
                                    )
                            )
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .align(Alignment.BottomStart)
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "पुण्यातील प्रमुख नाट्यगृहे",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = Color(0xFFFFDBCE)
                                    )
                                    Text(
                                        text = "बाल गंधर्व, यशवंतराव, टिळक स्मारक",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }
                                Icon(
                                    imageVector = Icons.Default.PinDrop,
                                    contentDescription = "Pin",
                                    tint = Color.White,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }
                    }
                }
            }

            // Organizer Quick Access Card (Stitch Exact: आयोजक आहात का?)
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
                                    text = "आयोजक आहात का?",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Text(
                                    text = "येथे कार्यक्रम नोंदवा / तिकीट व्यवस्था",
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
                                text = "प्रवेश करा",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = MahaOrange,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
            }

            // Dynamic Events Section (when filtered or searching)
            if (searchQuery.isNotBlank() || selectedCategory != "all") {
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "शोधलेले कार्यक्रम",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Text(
                            text = "${filteredEvents.size} सापडले",
                            fontSize = 11.sp,
                            color = MahaOrange,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                if (filteredEvents.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(160.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "कोणतेही कार्यक्रम उपलब्ध नाहीत.",
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
                            onCardClick = { if (rawItem != null) onSelectEvent(rawItem) },
                            onBookClick = { if (rawItem != null) onSelectEvent(rawItem) }
                        )
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
private fun TheatricalPosterCard(
    posterUrl: String,
    badgeText: String,
    badgeColor: Color,
    subBadge: String,
    title: String,
    venue: String,
    time: String,
    onBookClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .width(160.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable { onBookClick() },
        color = Color.White,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, MahaBorder),
        shadowElevation = 1.dp
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
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
                    shape = RoundedCornerShape(4.dp),
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(6.dp)
                ) {
                    Text(
                        text = badgeText,
                        color = Color.White,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
                // Bottom Genre Tag
                Surface(
                    color = Color.White.copy(alpha = 0.9f),
                    shape = RoundedCornerShape(4.dp),
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(6.dp)
                ) {
                    Text(
                        text = subBadge,
                        color = TextPrimary,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                    )
                }
            }

            Column(modifier = Modifier.padding(8.dp)) {
                Text(
                    text = title,
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = venue,
                    fontSize = 9.5.sp,
                    color = TextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 1.dp)
                )
                Text(
                    text = time,
                    fontSize = 9.5.sp,
                    color = MahaOrange,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(top = 2.dp)
                )

                Surface(
                    color = MahaOrange,
                    shape = RoundedCornerShape(6.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 6.dp)
                        .clickable { onBookClick() }
                ) {
                    Text(
                        text = "जागा निवडा",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        modifier = Modifier.padding(vertical = 5.dp)
                    )
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
    onTicketClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable { onTicketClick() },
        color = Color.White,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, MahaBorder),
        shadowElevation = 1.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            AsyncImage(
                model = thumbnailUrl,
                contentDescription = title,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(72.dp)
                    .clip(RoundedCornerShape(8.dp))
            )
            Column(modifier = Modifier.weight(1f)) {
                Surface(
                    color = MahaWarm,
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = tag,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = MahaOrangeDeep,
                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                    )
                }
                Text(
                    text = title,
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 2.dp)
                )
                Text(
                    text = venue,
                    fontSize = 10.sp,
                    color = TextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 1.dp)
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 4.dp),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        color = MahaOrange,
                        shape = RoundedCornerShape(6.dp),
                        modifier = Modifier.clickable { onTicketClick() }
                    ) {
                        Text(
                            text = "तिकीट घ्या",
                            fontSize = 10.5.sp,
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
    onCardClick: () -> Unit,
    onBookClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .clickable { onCardClick() }
            .testTag("event_card_${event.id}"),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = BorderStroke(1.dp, MahaBorder)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .width(72.dp)
                    .height(96.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(0xFFF1F5F9))
            ) {
                AsyncImage(
                    model = event.posterUrl,
                    contentDescription = event.titleEn,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }

            Spacer(modifier = Modifier.width(10.dp))

            Column(modifier = Modifier.weight(1f)) {
                Surface(
                    color = MahaWarm,
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = event.category.displayMr,
                        fontSize = 9.sp,
                        color = MahaOrangeDeep,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                    )
                }

                Spacer(modifier = Modifier.height(3.dp))

                Text(
                    text = event.titleMr,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Text(
                    text = "📍 ${event.venue.nameMr}",
                    fontSize = 10.sp,
                    color = TextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 2.dp)
                )

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 6.dp),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Button(
                        onClick = onBookClick,
                        shape = RoundedCornerShape(6.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
                        modifier = Modifier.testTag("book_now_btn_${event.id}"),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "जागा निवडा",
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
