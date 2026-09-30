package `in`.ticketghar.mahaticket

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import `in`.ticketghar.mahaticket.model.*
import `in`.ticketghar.mahaticket.theme.*
import `in`.ticketghar.mahaticket.ui.screens.HomeScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Enable edge-to-edge window insets for status & gesture navigation bars
        enableEdgeToEdge()

        setContent {
            MahaTicketTheme {
                MahaTicketAppRoot()
            }
        }
    }
}

@Composable
fun MahaTicketAppRoot() {
    var currentTab by remember { mutableStateOf(0) }
    var selectedEvent by remember { mutableStateOf<EventItem?>(null) }

    // Sample Maharashtra events for native runtime
    val sampleEvents = remember {
        listOf(
            EventItem(
                id = 1,
                title = "Punha Sahi Re Sahi",
                titleMr = "पुन्हा सही रे सही",
                category = "plays",
                categoryMr = "नाटक",
                language = "Marathi",
                durationMinutes = 165,
                description = "Bharat Jadhav historic comedy masterpiece",
                posterUrl = "https://picsum.photos/seed/punhasahi/600/800",
                minPrice = 35000,
                venue = VenueItem(1, "Bal Gandharva Ranga Mandir", "बालगंधर्व रंगमंदिर", "JM Road, Shivajinagar", "Pune"),
                sessions = listOf(SessionItem(1, 1, "2026-10-05T19:30:00Z", "2026-10-05T22:15:00Z", "active"))
            ),
            EventItem(
                id = 2,
                title = "Bhadipa Live Comedy",
                titleMr = "भाडिपा स्टँडअप कॉमेडी",
                category = "comedy",
                categoryMr = "कॉमेडी",
                language = "Marathi",
                durationMinutes = 120,
                description = "Maharashtra biggest Marathi standup comedy show",
                posterUrl = "https://picsum.photos/seed/bhadipa/600/800",
                minPrice = 40000,
                venue = VenueItem(2, "Shivaji Mandir", "श्री छत्रपती शिवाजी मंदिर", "Dadar West", "Mumbai"),
                sessions = listOf(SessionItem(2, 2, "2026-10-06T20:00:00Z", "2026-10-06T22:00:00Z", "active"))
            )
        )
    }

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.systemBars),
        containerColor = MahaDarkBackground,
        bottomBar = {
            NavigationBar(
                containerColor = MahaSurface,
                tonalElevation = 4.dp
            ) {
                val navItems = listOf(
                    Triple(0, "होम", Icons.Default.Home),
                    Triple(1, "शोधा", Icons.Default.Explore),
                    Triple(2, "तिकिटे", Icons.Default.ConfirmationNumber),
                    Triple(3, "ऑफर्स", Icons.Default.LocalOffer),
                    Triple(4, "प्रोफाइल", Icons.Default.Person)
                )

                navItems.forEach { (index, title, icon) ->
                    val isSelected = currentTab == index
                    NavigationBarItem(
                        selected = isSelected,
                        onClick = {
                            currentTab = index
                            selectedEvent = null
                        },
                        icon = { Icon(icon, contentDescription = title) },
                        label = { Text(title, fontSize = 11.sp) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MahaOrange,
                            selectedTextColor = MahaOrange,
                            indicatorColor = MahaOrange.copy(alpha = 0.15f),
                            unselectedIconColor = MahaTextSecondary,
                            unselectedTextColor = MahaTextSecondary
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding)) {
            when (currentTab) {
                0 -> HomeScreen(
                    events = sampleEvents,
                    onSelectEvent = { selectedEvent = it }
                )
                2 -> Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = androidx.compose.ui.Alignment.Center
                ) {
                    Text(
                        "आपण बुक केलेली सर्व तिकिटे येथे दिसतील",
                        color = MahaTextSecondary,
                        fontSize = 14.sp
                    )
                }
                else -> HomeScreen(
                    events = sampleEvents,
                    onSelectEvent = { selectedEvent = it }
                )
            }
        }
    }
}
