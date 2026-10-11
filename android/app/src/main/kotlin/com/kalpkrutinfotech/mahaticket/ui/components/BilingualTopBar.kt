package com.kalpkrutinfotech.mahaticket.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import coil.compose.AsyncImage
import com.kalpkrutinfotech.mahaticket.R
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.util.UserSessionManager

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
    SupportedCity("Thane", "ठाणे", "Thane", "🌳"),
    SupportedCity("Nagpur", "नागपूर", "Nagpur", "🍊"),
    SupportedCity("Nashik", "नाशिक", "Nashik", "🍇"),
    SupportedCity("Chh. Sambhajinagar", "छ. संभाजीनगर", "Chh. Sambhajinagar", "🏰"),
    SupportedCity("Kolhapur", "कोल्हापूर", "Kolhapur", "🚩"),
    SupportedCity("Ahilyanagar", "अहिल्यानगर (अहमदनगर)", "Ahilyanagar (Ahmednagar)", "🌾"),
    SupportedCity("Akola", "अकोला", "Akola", "🏛️"),
    SupportedCity("Amravati", "अमरावती", "Amravati", "🌸"),
    SupportedCity("Beed", "बीड", "Beed", "🌾"),
    SupportedCity("Bhandara", "भंडारा", "Bhandara", "💧"),
    SupportedCity("Buldhana", "बुलढाणा", "Buldhana", "☄️"),
    SupportedCity("Chandrapur", "चंद्रपूर", "Chandrapur", "🐅"),
    SupportedCity("Dharashiv", "धाराशिव (उस्मानाबाद)", "Dharashiv (Osmanabad)", "🛕"),
    SupportedCity("Dhule", "धुळे", "Dhule", "🌾"),
    SupportedCity("Gadchiroli", "गडचिरोली", "Gadchiroli", "🌲"),
    SupportedCity("Gondia", "गोंदिया", "Gondia", "🌾"),
    SupportedCity("Hingoli", "हिंगोली", "Hingoli", "🌿"),
    SupportedCity("Jalgaon", "जळगाव", "Jalgaon", "🍌"),
    SupportedCity("Jalna", "जालना", "Jalna", "🏭"),
    SupportedCity("Latur", "लातूर", "Latur", "📚"),
    SupportedCity("Mumbai Suburban", "मुंबई उपनगर", "Mumbai Suburban", "🏙️"),
    SupportedCity("Nanded", "नांदेड", "Nanded", "🛕"),
    SupportedCity("Nandurbar", "नंदुरबार", "Nandurbar", "🏹"),
    SupportedCity("Palghar", "पालघर", "Palghar", "🏖️"),
    SupportedCity("Parbhani", "परभणी", "Parbhani", "🌾"),
    SupportedCity("Raigad", "रायगड", "Raigad", "🏰"),
    SupportedCity("Ratnagiri", "रत्नागिरी", "Ratnagiri", "🥭"),
    SupportedCity("Sangli", "सांगली", "Sangli", "🌾"),
    SupportedCity("Satara", "सातारा", "Satara", "⛰️"),
    SupportedCity("Sindhudurg", "सिंधुदुर्ग", "Sindhudurg", "🏖️"),
    SupportedCity("Solapur", "सोलापूर", "Solapur", "🧵"),
    SupportedCity("Wardha", "वर्धा", "Wardha", "🕊️"),
    SupportedCity("Washim", "वाशीम", "Washim", "🌿"),
    SupportedCity("Yavatmal", "यवतमाळ", "Yavatmal", "🌾")
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
    val context = LocalContext.current
    val sessionManager = remember { UserSessionManager.getInstance(context) }
    val userAvatar by sessionManager.userAvatar.collectAsState()
    val userName by sessionManager.userName.collectAsState()

    var showRoleMenu by remember { mutableStateOf(false) }
    var showCityModal by remember { mutableStateOf(false) }

    val displayCityMr = remember(selectedCity) {
        val matched = MAHARASHTRA_CITIES.firstOrNull {
            it.id.equals(selectedCity, ignoreCase = true) ||
            it.nameMr.contains(selectedCity, ignoreCase = true) ||
            it.nameEn.equals(selectedCity, ignoreCase = true)
        }
        when {
            matched != null -> matched.nameMr.substringBefore(" (")
            selectedCity.contains("All", ignoreCase = true) || selectedCity.contains("महाराष्ट्र") -> "महाराष्ट्र"
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
            // Brand Logo & City Indicator (Stitch & Web App Parity)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.weight(1f)
            ) {
                // Official MahaTicket Web App Icon
                Image(
                    painter = painterResource(id = R.drawable.ic_web_icon),
                    contentDescription = "MahaTicket",
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(10.dp))
                )

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

                // Profile Avatar (Circular with user photo or initial)
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
                        if (!userAvatar.isNullOrBlank()) {
                            AsyncImage(
                                model = userAvatar,
                                contentDescription = "User Avatar",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        } else {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.fillMaxSize()
                            ) {
                                val initial = userName?.firstOrNull()?.toString() ?: "क"
                                Text(
                                    text = initial,
                                    color = Color.White,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
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

    // Modern 36 Maharashtra Districts Search & Selection Modal Dialog
    if (showCityModal) {
        var districtSearchQuery by remember { mutableStateOf("") }
        val filteredDistricts = remember(districtSearchQuery) {
            if (districtSearchQuery.isBlank()) {
                MAHARASHTRA_CITIES
            } else {
                val q = districtSearchQuery.trim()
                MAHARASHTRA_CITIES.filter {
                    it.nameMr.contains(q, ignoreCase = true) ||
                    it.nameEn.contains(q, ignoreCase = true) ||
                    it.id.contains(q, ignoreCase = true)
                }
            }
        }

        Dialog(onDismissRequest = { showCityModal = false }) {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color.White,
                border = BorderStroke(1.dp, MahaBorder),
                shadowElevation = 16.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp)
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
                                text = "आपला जिल्हा किंवा शहर निवडा",
                                fontSize = 16.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "महाराष्ट्रातील सर्व ३६ जिल्ह्यांतील कार्यक्रम",
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

                    Spacer(modifier = Modifier.height(12.dp))

                    // District search box
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFF8FAFC),
                        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 9.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.Search,
                                contentDescription = "Search",
                                tint = Color(0xFFC2410C),
                                modifier = Modifier.size(18.dp)
                            )
                            BasicTextField(
                                value = districtSearchQuery,
                                onValueChange = { districtSearchQuery = it },
                                singleLine = true,
                                modifier = Modifier.weight(1f),
                                textStyle = androidx.compose.ui.text.TextStyle(
                                    color = TextPrimary,
                                    fontSize = 12.5.sp,
                                    fontWeight = FontWeight.Medium
                                ),
                                decorationBox = { innerTextField ->
                                    if (districtSearchQuery.isEmpty()) {
                                        Text(
                                            text = "जिल्हा किंवा शहर शोधा (उदा. पुणे, नाशिक)...",
                                            color = Color(0xFF94A3B8),
                                            fontSize = 12.sp
                                        )
                                    }
                                    innerTextField()
                                }
                            )
                            if (districtSearchQuery.isNotEmpty()) {
                                Icon(
                                    imageVector = Icons.Default.Close,
                                    contentDescription = "Clear",
                                    tint = TextSecondary,
                                    modifier = Modifier
                                        .size(16.dp)
                                        .clickable { districtSearchQuery = "" }
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 380.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(filteredDistricts, key = { it.id }) { city ->
                            val isSelected = (city.id == "All" && (selectedCity.contains("All", ignoreCase = true) || selectedCity.contains("महाराष्ट्र"))) ||
                                    selectedCity.equals(city.id, ignoreCase = true) ||
                                    selectedCity.equals(city.nameMr, ignoreCase = true) ||
                                    (city.id != "All" && selectedCity.contains(city.nameMr.substringBefore(" (")))

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
