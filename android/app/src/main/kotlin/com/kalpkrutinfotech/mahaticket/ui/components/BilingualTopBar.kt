package com.kalpkrutinfotech.mahaticket.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import coil.compose.AsyncImage
import com.kalpkrutinfotech.mahaticket.theme.*

data class SupportedCity(
    val id: String,
    val nameMr: String,
    val nameEn: String,
    val iconEmoji: String = "📍"
)

val MAHARASHTRA_CITIES = listOf(
    SupportedCity("All", "संपूर्ण महाराष्ट्र", "All Maharashtra", "🏛️"),
    SupportedCity("Pune", "पुणे", "Pune", "🎭"),
    SupportedCity("Mumbai", "मुंबई", "Mumbai", "🌊"),
    SupportedCity("Nagpur", "नागपूर", "Nagpur", "🍊"),
    SupportedCity("Nashik", "नाशिक", "Nashik", "🍇"),
    SupportedCity("Chh. Sambhajinagar", "छ. संभाजीनगर", "Chh. Sambhajinagar", "🏰"),
    SupportedCity("Kolhapur", "कोल्हापूर", "Kolhapur", "🚩")
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BilingualTopBar(
    currentLanguage: AppLanguage,
    onLanguageToggle: (AppLanguage) -> Unit,
    currentRole: UserRole,
    onRoleSelected: (UserRole) -> Unit,
    notificationCount: Int,
    onNotificationClick: () -> Unit,
    onChatbotClick: () -> Unit,
    selectedCity: String = "पुणे",
    onCityClick: () -> Unit = {},
    onCitySelected: (String) -> Unit = {},
    onProfileClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var showRoleMenu by remember { mutableStateOf(false) }
    var showCityModal by remember { mutableStateOf(false) }

    val displayCityMr = remember(selectedCity) {
        when {
            selectedCity.contains("All", ignoreCase = true) || selectedCity.contains("महाराष्ट्र") -> "महाराष्ट्र"
            selectedCity.equals("Pune", ignoreCase = true) -> "पुणे"
            selectedCity.equals("Mumbai", ignoreCase = true) -> "मुंबई"
            selectedCity.equals("Nagpur", ignoreCase = true) -> "नागपूर"
            selectedCity.equals("Nashik", ignoreCase = true) -> "नाशिक"
            selectedCity.contains("Sambhajinagar", ignoreCase = true) -> "संभाजीनगर"
            selectedCity.equals("Kolhapur", ignoreCase = true) -> "कोल्हापूर"
            else -> selectedCity
        }
    }

    Surface(
        color = Color.White,
        shadowElevation = 2.dp,
        border = BorderStroke(0.5.dp, MahaBorder),
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Brand Logo & City Indicator (Stitch Exact)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.weight(1f)
            ) {
                // Theatre Mask Icon in warm gradient
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(MahaOrange),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "🎭", fontSize = 20.sp)
                }

                Column(modifier = Modifier.weight(1f, fill = false)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = if (currentLanguage == AppLanguage.MARATHI) "महाटिकिट" else "MahaTicket",
                            fontWeight = FontWeight.Black,
                            fontSize = 17.sp,
                            color = MahaOrangeDeep,
                            letterSpacing = (-0.3).sp
                        )

                        // Interactive Modern City Selector Pill
                        Surface(
                            color = MahaWarm,
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, MahaOrange.copy(alpha = 0.25f)),
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .clickable {
                                    showCityModal = true
                                    onCityClick()
                                }
                                .testTag("topbar_city_selector_chip")
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(3.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.LocationOn,
                                    contentDescription = "Location",
                                    tint = MahaOrange,
                                    modifier = Modifier.size(13.dp)
                                )
                                Text(
                                    text = displayCityMr,
                                    fontSize = 11.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MahaOrange
                                )
                                Icon(
                                    imageVector = Icons.Default.ExpandMore,
                                    contentDescription = "Expand",
                                    tint = MahaOrange,
                                    modifier = Modifier.size(13.dp)
                                )
                            }
                        }
                    }
                }
            }

            // Right side: Language Pill & Profile Avatar
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Language Toggle Pill
                Surface(
                    modifier = Modifier
                        .clip(RoundedCornerShape(14.dp))
                        .clickable {
                            val next = if (currentLanguage == AppLanguage.MARATHI) AppLanguage.ENGLISH else AppLanguage.MARATHI
                            onLanguageToggle(next)
                        }
                        .testTag("language_toggle_button"),
                    color = MahaWarm,
                    border = BorderStroke(1.dp, MahaBorder),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text(
                        text = if (currentLanguage == AppLanguage.MARATHI) "मराठी" else "ENG",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MahaOrangeDeep,
                        modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp)
                    )
                }

                // Profile Avatar (Circular with user initial or photo)
                Box {
                    Surface(
                        modifier = Modifier
                            .size(34.dp)
                            .clip(CircleShape)
                            .clickable { showRoleMenu = true }
                            .testTag("profile_avatar_topbar"),
                        color = MahaOrangeDeep,
                        shape = CircleShape,
                        border = BorderStroke(1.5.dp, MahaOrange.copy(alpha = 0.4f))
                    ) {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier.fillMaxSize()
                        ) {
                            Text(
                                text = "क",
                                color = Color.White,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    // Profile options dropdown menu (Strictly user-facing, no unauthorized admin control)
                    DropdownMenu(
                        expanded = showRoleMenu,
                        onDismissRequest = { showRoleMenu = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("माझे प्रोफाइल (Profile)", fontSize = 13.sp) },
                            onClick = {
                                showRoleMenu = false
                                onProfileClick()
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("टिकिटमित्र AI सह गप्पा", fontSize = 13.sp) },
                            onClick = {
                                showRoleMenu = false
                                onChatbotClick()
                            }
                        )
                        if (currentRole == UserRole.ADMIN) {
                            HorizontalDivider()
                            DropdownMenuItem(
                                text = { Text("प्रशासक नियंत्रण (Admin)", fontSize = 12.sp, color = MahaOrangeDeep) },
                                onClick = {
                                    showRoleMenu = false
                                    onRoleSelected(UserRole.ADMIN)
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    // Modern City Selection Modal Dialog
    if (showCityModal) {
        Dialog(onDismissRequest = { showCityModal = false }) {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color.White,
                border = BorderStroke(1.dp, MahaBorder),
                shadowElevation = 16.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "आपले शहर निवडा",
                                fontSize = 17.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "तुमच्या शहरात सुरू असलेले नाट्यप्रयोग व कार्यक्रम",
                                fontSize = 11.5.sp,
                                color = TextSecondary
                            )
                        }
                        IconButton(
                            onClick = { showCityModal = false },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = TextSecondary, modifier = Modifier.size(18.dp))
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        MAHARASHTRA_CITIES.forEach { city ->
                            val isSelected = (city.id == "All" && (selectedCity.contains("All", ignoreCase = true) || selectedCity.contains("महाराष्ट्र"))) ||
                                    selectedCity.equals(city.id, ignoreCase = true) ||
                                    selectedCity.equals(city.nameMr, ignoreCase = true)

                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .clickable {
                                        onCitySelected(city.id)
                                        showCityModal = false
                                    },
                                color = if (isSelected) MahaWarm else Color(0xFFF8FAFC),
                                border = BorderStroke(1.dp, if (isSelected) MahaOrange else MahaBorder),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 14.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        Text(text = city.iconEmoji, fontSize = 18.sp)
                                        Column {
                                            Text(
                                                text = city.nameMr,
                                                fontSize = 13.5.sp,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                                color = if (isSelected) MahaOrangeDeep else TextPrimary
                                            )
                                            Text(
                                                text = city.nameEn,
                                                fontSize = 10.sp,
                                                color = TextSecondary
                                            )
                                        }
                                    }

                                    if (isSelected) {
                                        Surface(
                                            shape = CircleShape,
                                            color = MahaOrange,
                                            modifier = Modifier.size(20.dp)
                                        ) {
                                            Box(contentAlignment = Alignment.Center) {
                                                Icon(
                                                    imageVector = Icons.Outlined.Check,
                                                    contentDescription = "Selected",
                                                    tint = Color.White,
                                                    modifier = Modifier.size(12.dp)
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
        }
    }
}
