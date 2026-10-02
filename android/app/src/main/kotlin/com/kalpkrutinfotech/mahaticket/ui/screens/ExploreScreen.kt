package com.kalpkrutinfotech.mahaticket.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.kalpkrutinfotech.mahaticket.model.EventItem
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventViewModel
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventsUiState
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

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
    var selectedPriceFilter by remember { mutableStateOf("all") }

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

    val categories = listOf(
        Triple("all", "सर्व कार्यक्रम", Icons.Default.AutoAwesome),
        Triple("plays", "नाटक", Icons.Default.TheaterComedy),
        Triple("music", "संगीत", Icons.Default.MusicNote),
        Triple("comedy", "कॉमेडी", Icons.Default.SentimentSatisfiedAlt),
        Triple("cultural", "सांस्कृतिक", Icons.Default.Celebration),
        Triple("workshops", "कार्यशाळा", Icons.Default.Palette),
        Triple("movies", "चित्रपट", Icons.Default.Movie)
    )

    val priceFilters = listOf(
        "all" to "सर्व दर",
        "300" to "₹३०० च्या आत",
        "500" to "₹५०० च्या आत",
        "1000" to "₹१००० च्या आत"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Top Search Header with City & Search Bar
        Surface(
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 2.dp
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
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Black,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "नाटके, संगीत मैफिली, स्टँडअप कॉमेडी आणि बरेच काही",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    // City Filter Pill
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = Color(0xFFFFF7ED),
                        border = BorderStroke(1.dp, Color(0xFFFED7AA)),
                        modifier = Modifier.clickable { showCityDialog = true }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.LocationOn,
                                contentDescription = null,
                                tint = Color(0xFFEA580C),
                                modifier = Modifier.size(13.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            val displayCity = if (selectedCity.contains("All", ignoreCase = true)) "सर्व शहरे" else selectedCity
                            Text(
                                text = displayCity,
                                color = Color(0xFFEA580C),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Modern Search Input Field
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { viewModel.searchEvents(it) },
                    placeholder = { Text("नाटक, कलाकार किंवा सभागृह शोधा...", fontSize = 13.sp) },
                    leadingIcon = {
                        Icon(
                            Icons.Default.Search,
                            contentDescription = null,
                            tint = Color(0xFFEA580C),
                            modifier = Modifier.size(20.dp)
                        )
                    },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { viewModel.searchEvents("") }) {
                                Icon(Icons.Default.Close, contentDescription = "Clear", tint = MahaTextSecondary)
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Color(0xFFF9FAFB),
                        unfocusedContainerColor = Color(0xFFF9FAFB),
                        focusedBorderColor = Color(0xFFEA580C),
                        unfocusedBorderColor = Color(0xFFE5E7EB)
                    ),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Categories LazyRow
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(categories) { (id, label, icon) ->
                        val isSelected = selectedCategory == id || (id == "plays" && selectedCategory == "drama")
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = if (isSelected) Color(0xFFEA580C) else MaterialTheme.colorScheme.surface,
                            border = BorderStroke(1.dp, if (isSelected) Color(0xFFEA580C) else Color(0xFFE5E7EB)),
                            modifier = Modifier.clickable { viewModel.selectCategory(id) }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    icon,
                                    contentDescription = label,
                                    tint = if (isSelected) Color.White else Color(0xFFEA580C),
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(
                                    text = label,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }
                }
            }
        }

        // Content Area
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp)
        ) {
            when (val state = eventsState) {
                is EventsUiState.Loading -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        CircularProgressIndicator(
                            color = Color(0xFFEA580C),
                            strokeWidth = 3.dp,
                            modifier = Modifier.size(36.dp)
                        )
                        Spacer(modifier = Modifier.height(14.dp))
                        Text(
                            "इव्हेंट्स शोधत आहोत...",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
                is EventsUiState.Error -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.ErrorOutline,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            state.message,
                            color = MaterialTheme.colorScheme.onSurface,
                            fontSize = 14.sp
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { viewModel.loadEvents() },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C)),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("पुन्हा प्रयत्न करा", fontWeight = FontWeight.Bold)
                        }
                    }
                }
                is EventsUiState.Success -> {
                    val rawEvents = state.events
                    val filteredEvents = remember(rawEvents, selectedPriceFilter) {
                        when (selectedPriceFilter) {
                            "300" -> rawEvents.filter { (it.minPrice ?: 0) <= 30000 }
                            "500" -> rawEvents.filter { (it.minPrice ?: 0) <= 50000 }
                            "1000" -> rawEvents.filter { (it.minPrice ?: 0) <= 100000 }
                            else -> rawEvents
                        }
                    }

                    if (filteredEvents.isEmpty()) {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                Icons.Default.SearchOff,
                                contentDescription = null,
                                tint = Color(0xFFEA580C).copy(alpha = 0.5f),
                                modifier = Modifier.size(64.dp)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                "कोणतेही कार्यक्रम सापडले नाहीत",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                "कृपया वेगळा शोध शब्द किंवा फिल्टर वापरून पहा",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            OutlinedButton(
                                onClick = {
                                    viewModel.selectCategory("all")
                                    viewModel.selectCity("महाराष्ट्र (All)")
                                    viewModel.searchEvents("")
                                    selectedPriceFilter = "all"
                                },
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(1.dp, Color(0xFFEA580C)),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEA580C))
                            ) {
                                Text("फिल्टर रीसेट करा", fontWeight = FontWeight.Bold)
                            }
                        }
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(vertical = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            item {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "${filteredEvents.size} कार्यक्रम उपलब्ध",
                                        style = MaterialTheme.typography.labelLarge,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )

                                    // Price filter chips
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        items(priceFilters) { (valKey, valLabel) ->
                                            val isPSelected = selectedPriceFilter == valKey
                                            Surface(
                                                shape = RoundedCornerShape(8.dp),
                                                color = if (isPSelected) Color(0xFFFFF7ED) else MaterialTheme.colorScheme.surface,
                                                border = BorderStroke(1.dp, if (isPSelected) Color(0xFFEA580C) else Color(0xFFE5E7EB)),
                                                modifier = Modifier.clickable { selectedPriceFilter = valKey }
                                            ) {
                                                Text(
                                                    text = valLabel,
                                                    fontSize = 10.sp,
                                                    fontWeight = if (isPSelected) FontWeight.Bold else FontWeight.Normal,
                                                    color = if (isPSelected) Color(0xFFEA580C) else MaterialTheme.colorScheme.onSurfaceVariant,
                                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            items(filteredEvents) { event ->
                                ModernEventCardItem(
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
