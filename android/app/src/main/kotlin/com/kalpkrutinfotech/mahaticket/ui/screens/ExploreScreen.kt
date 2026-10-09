package com.kalpkrutinfotech.mahaticket.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
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
    val searchQuery by viewModel.searchQuery.collectAsState()

    val categories = listOf(
        Triple("all", "सर्व कार्यक्रम", "🎭"),
        Triple("plays", "नाटक", "🎭"),
        Triple("music", "संगीत मैफल", "🎵"),
        Triple("comedy", "स्टँडअप", "😄"),
        Triple("cultural", "सांस्कृतिक", "🎪"),
        Triple("workshops", "कार्यशाळा", "🎨"),
        Triple("movies", "चित्रपट", "🎬"),
        Triple("sports", "क्रीडा", "🏏")
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MahaBg)
            .testTag("explore_screen")
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Top Search Bar (City is managed in the persistent top bar)
            Surface(
                color = Color.White,
                modifier = Modifier.fillMaxWidth(),
                border = BorderStroke(1.dp, MahaBorder),
                shadowElevation = 1.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    Text(
                        text = "शोधा आणि एक्सप्लोर करा",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "नाट्य, संगीत व सांस्कृतिक कार्यक्रमांचा शोध घ्या",
                        fontSize = 11.5.sp,
                        color = TextSecondary,
                        modifier = Modifier.padding(top = 2.dp)
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Search input
                    var localSearch by remember { mutableStateOf(searchQuery) }
                    OutlinedTextField(
                        value = localSearch,
                        onValueChange = {
                            localSearch = it
                            viewModel.searchEvents(it)
                        },
                        placeholder = {
                            Text(
                                "नाटक, कलाकार किंवा नाट्यगृह शोधा...",
                                fontSize = 13.sp,
                                color = TextSecondary
                            )
                        },
                        leadingIcon = {
                            Icon(
                                Icons.Default.Search,
                                contentDescription = null,
                                tint = MahaOrange,
                                modifier = Modifier.size(20.dp)
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
                                        tint = TextSecondary,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedBorderColor = MahaOrange,
                            unfocusedBorderColor = MahaBorder,
                            focusedContainerColor = MahaWarmLight,
                            unfocusedContainerColor = MahaWarmLight
                        ),
                        singleLine = true
                    )
                }
            }

            // Categories Row
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MahaBg)
                    .padding(vertical = 10.dp),
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(categories) { (key, label, emoji) ->
                    val isSelected = selectedCategory == key
                    Surface(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .clickable { viewModel.selectCategory(key) },
                        color = if (isSelected) MahaOrange else Color.White,
                        shape = RoundedCornerShape(20.dp),
                        border = BorderStroke(
                            1.dp,
                            if (isSelected) MahaOrange else MahaBorder
                        ),
                        shadowElevation = if (isSelected) 2.dp else 0.dp
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(text = emoji, fontSize = 13.sp)
                            Text(
                                text = label,
                                fontSize = 12.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) Color.White else TextPrimary
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
                        ExploreShimmerSkeleton()
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
                                    tint = MahaOrange,
                                    modifier = Modifier.size(48.dp)
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    text = "माहिती लोड करण्यात अडचण आली",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Spacer(modifier = Modifier.height(14.dp))
                                Button(
                                    onClick = { viewModel.loadEvents() },
                                    colors = ButtonDefaults.buttonColors(containerColor = MahaOrange),
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
                                    Text(text = "🎭", fontSize = 44.sp)
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text(
                                        text = "कोणतेही कार्यक्रम सापडले नाहीत",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = "कृपया वेगळी श्रेणी निवडून किंवा शोधशब्द बदलून पहा.",
                                        fontSize = 12.sp,
                                        color = TextSecondary
                                    )
                                }
                            }
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 90.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
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
        shape = RoundedCornerShape(14.dp),
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
            // Poster with Live Tag
            Box(
                modifier = Modifier
                    .size(86.dp, 114.dp)
                    .clip(RoundedCornerShape(10.dp))
            ) {
                AsyncImage(
                    model = event.posterUrl.ifBlank { "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400" },
                    contentDescription = event.title,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
                Surface(
                    color = Color.White.copy(alpha = 0.95f),
                    shape = RoundedCornerShape(4.dp),
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(4.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(5.dp)
                                .clip(androidx.compose.foundation.shape.CircleShape)
                                .background(Color(0xFF16A34A))
                        )
                        Text(
                            text = "Live",
                            fontSize = 8.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Details
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(3.dp)
            ) {
                Surface(
                    color = MahaWarm,
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = event.category.ifBlank { "नाटक" },
                        color = MahaOrangeDeep,
                        fontSize = 9.5.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }

                Text(
                    text = if (event.titleMr.isNotBlank()) event.titleMr else event.title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Text(
                    text = "🏛️ ${event.venue?.nameMr ?: event.venue?.name ?: "नाट्यगृह"}",
                    fontSize = 11.sp,
                    color = TextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Text(
                    text = "📍 ${event.venue?.city ?: "पुणे"}",
                    fontSize = 10.5.sp,
                    color = TextSecondary
                )

                Spacer(modifier = Modifier.height(2.dp))

                // Bottom row: 5-Star rating & Book CTA (Matching Web EventCard.tsx)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Rating block
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        Text(text = "★", color = Color(0xFFF59E0B), fontSize = 13.sp)
                        val ratingVal = if (event.rating != null && event.rating > 0) {
                            if (event.rating > 5) String.format("%.1f", event.rating / 2) else String.format("%.1f", event.rating)
                        } else "4.8"
                        Text(
                            text = ratingVal,
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        val ratingCount = if (event.ratingCount != null && event.ratingCount > 0) event.ratingCount else 120
                        Text(
                            text = "($ratingCount)",
                            fontSize = 10.sp,
                            color = TextSecondary
                        )
                    }

                    // Book CTA
                    Surface(
                        color = MahaOrange,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.clickable { onClick() }
                    ) {
                        Text(
                            text = "बुक करा",
                            color = Color.White,
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ExploreShimmerSkeleton() {
    val transition = rememberInfiniteTransition(label = "explore_shimmer")
    val translateAnim by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer_explore"
    )
    val shimmerBrush = Brush.linearGradient(
        colors = listOf(
            Color(0xFFF1F5F9),
            Color(0xFFE2E8F0),
            Color(0xFFF1F5F9)
        ),
        start = Offset.Zero,
        end = Offset(x = translateAnim, y = translateAnim)
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        repeat(3) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, MahaBorder),
                color = Color.White
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(80.dp, 105.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(shimmerBrush)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Box(
                            modifier = Modifier
                                .size(50.dp, 16.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(shimmerBrush)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(0.8f)
                                .height(18.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(shimmerBrush)
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(0.5f)
                                .height(14.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(shimmerBrush)
                        )
                    }
                }
            }
        }
    }
}

