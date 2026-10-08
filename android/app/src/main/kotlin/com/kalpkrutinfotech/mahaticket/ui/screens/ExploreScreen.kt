package com.kalpkrutinfotech.mahaticket.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.kalpkrutinfotech.mahaticket.model.EventItem
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.components.TheaterLoaderCard
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventViewModel
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventsUiState

@Composable
fun ExploreScreen(
    viewModel: EventViewModel,
    onSelectEvent: (EventItem) -> Unit
) {
    val eventsState by viewModel.eventsState.collectAsState()
    val selectedCategory by viewModel.selectedCategory.collectAsState()
    val selectedCity by viewModel.selectedCity.collectAsState()
    val cities by viewModel.cities.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()

    var showCityDialog by remember { mutableStateOf(false) }

    if (showCityDialog) {
        val allCities = listOf("महाराष्ट्र (All)") + cities.map { it.name }
        AlertDialog(
            onDismissRequest = { showCityDialog = false },
            title = {
                Text(
                    text = "शहर निवडा (Select City)",
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    allCities.forEach { city ->
                        val isSelected = selectedCity.equals(city, ignoreCase = true)
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .clickable {
                                    viewModel.selectCity(city)
                                    showCityDialog = false
                                },
                            color = if (isSelected) TheatricalCrimson else Color(0xFF1E293B),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = city,
                                color = if (isSelected) Color.White else GoldAccent,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                modifier = Modifier.padding(12.dp)
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showCityDialog = false }) {
                    Text("रद्द करा", color = GoldAccent)
                }
            },
            containerColor = CinemaSurface
        )
    }

    val categories = listOf(
        Triple("all", "सर्व कार्यक्रम", Icons.Default.AutoAwesome),
        Triple("plays", "नाटक", Icons.Default.TheaterComedy),
        Triple("music", "संगीत", Icons.Default.MusicNote),
        Triple("comedy", "कॉमेडी", Icons.Default.SentimentSatisfiedAlt),
        Triple("cultural", "सांस्कृतिक", Icons.Default.Celebration),
        Triple("workshops", "कार्यशाळा", Icons.Default.Palette),
        Triple("movies", "चित्रपट", Icons.Default.Movie)
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(CinemaBg)
            .testTag("explore_screen")
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Top Search & City Bar
            Surface(
                color = CinemaSurface,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "शोधा आणि एक्सप्लोर करा",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.White
                            )
                            Text(
                                text = "महाराष्ट्रातील सर्वोत्तम नाट्य व सांस्कृतिक अनुभव",
                                fontSize = 11.sp,
                                color = GoldAccent
                            )
                        }

                        // City Selection Chip
                        Surface(
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .clickable { showCityDialog = true },
                            color = Color(0xFF1E293B),
                            shape = RoundedCornerShape(20.dp),
                            border = BorderStroke(1.dp, GoldAccent.copy(alpha = 0.5f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    Icons.Default.LocationOn,
                                    contentDescription = null,
                                    tint = GoldAccent,
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(
                                    text = if (selectedCity.contains("All") || selectedCity.contains("महाराष्ट्र")) "सर्व शहरे" else selectedCity,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Icon(
                                    Icons.Default.KeyboardArrowDown,
                                    contentDescription = null,
                                    tint = Color(0xFF94A3B8),
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Search input
                    var localSearch by remember { mutableStateOf(searchQuery) }
                    OutlinedTextField(
                        value = localSearch,
                        onValueChange = {
                            localSearch = it
                            viewModel.searchEvents(it)
                        },
                        placeholder = { Text("नाटक, कलाकार किंवा नाट्यगृह शोधा...", fontSize = 13.sp, color = Color(0xFF64748B)) },
                        leadingIcon = {
                            Icon(
                                Icons.Default.Search,
                                contentDescription = null,
                                tint = GoldAccent,
                                modifier = Modifier.size(18.dp)
                            )
                        },
                        trailingIcon = {
                            if (localSearch.isNotEmpty()) {
                                IconButton(onClick = {
                                    localSearch = ""
                                    viewModel.searchEvents("")
                                }) {
                                    Icon(
                                        Icons.Default.Close,
                                        contentDescription = "Clear",
                                        tint = Color(0xFF94A3B8),
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = GoldAccent,
                            unfocusedBorderColor = Color(0xFF334155),
                            focusedContainerColor = Color(0xFF1E293B),
                            unfocusedContainerColor = Color(0xFF1E293B)
                        ),
                        singleLine = true
                    )
                }
            }

            // Categories Row
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(CinemaBg)
                    .padding(vertical = 10.dp),
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(categories) { (key, label, icon) ->
                    val isSelected = selectedCategory == key
                    Surface(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .clickable { viewModel.selectCategory(key) },
                        color = if (isSelected) TheatricalCrimson else Color(0xFF1E293B),
                        shape = RoundedCornerShape(20.dp),
                        border = BorderStroke(
                            1.dp,
                            if (isSelected) GoldAccent else Color(0xFF334155)
                        )
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                icon,
                                contentDescription = null,
                                tint = if (isSelected) Color.White else GoldAccent,
                                modifier = Modifier.size(14.dp)
                            )
                            Text(
                                text = label,
                                fontSize = 12.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) Color.White else Color(0xFFCBD5E1)
                            )
                        }
                    }
                }
            }

            // Events List
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
            ) {
                when (val state = eventsState) {
                    is EventsUiState.Loading -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            TheaterLoaderCard(message = "थेट कार्यक्रम लोड होत आहेत...")
                        }
                    }
                    is EventsUiState.Error -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.padding(24.dp)
                            ) {
                                Icon(
                                    Icons.Default.WifiOff,
                                    contentDescription = null,
                                    tint = TheatricalCrimson,
                                    modifier = Modifier.size(48.dp)
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    text = "माहिती लोड करण्यात अडचण आली",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Spacer(modifier = Modifier.height(14.dp))
                                Button(
                                    onClick = { viewModel.loadEvents() },
                                    colors = ButtonDefaults.buttonColors(containerColor = TheatricalCrimson),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text("पुन्हा प्रयत्न करा", fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }
                        }
                    }
                    is EventsUiState.Success -> {
                        val events = state.events
                        if (events.isEmpty()) {
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    modifier = Modifier.padding(24.dp)
                                ) {
                                    Text(text = "🎭", fontSize = 48.sp)
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text(
                                        text = "या निकषांनुसार कोणतेही कार्यक्रम सापडले नाहीत",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = "कृपया वेगळी श्रेणी किंवा शहर निवडून पुन्हा शोधा.",
                                        fontSize = 12.sp,
                                        color = Color(0xFF94A3B8)
                                    )
                                }
                            }
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 90.dp),
                                verticalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                items(events, key = { it.id }) { event ->
                                    CinemaExploreEventCard(
                                        event = event,
                                        onClick = { onSelectEvent(event) }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CinemaExploreEventCard(
    event: EventItem,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .testTag("explore_card_${event.id}"),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = CinemaSurface),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Poster
            AsyncImage(
                model = event.posterUrl.ifBlank { "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400" },
                contentDescription = event.title,
                modifier = Modifier
                    .size(85.dp, 110.dp)
                    .clip(RoundedCornerShape(10.dp)),
                contentScale = ContentScale.Crop
            )

            Spacer(modifier = Modifier.width(14.dp))

            // Details
            Column(modifier = Modifier.weight(1f)) {
                Surface(
                    color = TheatricalCrimson.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = event.category.ifBlank { "नाटक" }.uppercase(),
                        color = TheatricalCrimsonLight,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = if (event.titleMr.isNotBlank()) event.titleMr else event.title,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = "🏛️ ${event.venue?.nameMr ?: event.venue?.name ?: "यशवंतराव चव्हाण नाट्यगृह"}",
                    fontSize = 11.sp,
                    color = Color(0xFFCBD5E1),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Text(
                    text = "📍 ${event.venue?.city ?: "पुणे"}",
                    fontSize = 11.sp,
                    color = Color(0xFF94A3B8)
                )

                Spacer(modifier = Modifier.height(6.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val price = (event.minPrice ?: 25000) / 100
                    Text(
                        text = "₹$price पासून",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black,
                        color = GoldBright
                    )

                    Surface(
                        color = GoldAccent,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = "तिकीट बुक करा",
                            color = Color.Black,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }
        }
    }
}
