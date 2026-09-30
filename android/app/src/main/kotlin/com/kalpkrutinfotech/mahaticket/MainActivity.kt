package com.kalpkrutinfotech.mahaticket

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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.compose.ui.draw.scale
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.animateFloatAsState
import androidx.navigation.NavType
import androidx.navigation.navArgument
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.screens.*
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.BookingViewModel
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventViewModel
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.BookingViewModelFactory
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.EventViewModelFactory

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Install Android 12+ Splash Screen
        installSplashScreen()
        
        super.onCreate(savedInstanceState)

        // Enable edge-to-edge window insets
        enableEdgeToEdge()

        setContent {
            MahaTicketTheme {
                MahaTicketRoot()
            }
        }
    }
}

sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
    data object Home : Screen("home", "होम", Icons.Default.Home)
    data object Explore : Screen("explore", "शोधा", Icons.Default.Explore)
    data object Tickets : Screen("tickets", "तिकिटे", Icons.Default.ConfirmationNumber)
    data object Offers : Screen("offers", "ऑफर्स", Icons.Default.LocalOffer)
    data object Profile : Screen("profile", "प्रोफाइल", Icons.Default.Person)
}

object BookingRoutes {
    const val EVENT_DETAIL = "event_detail/{eventId}"
    const val SEAT_SELECTION = "seat_selection/{sessionId}"
    const val CHECKOUT = "checkout/{holdToken}"
    const val BOOKING_SUCCESS = "booking_success/{orderNumber}"
    const val TICKET_DETAIL = "ticket_detail/{ticketCode}"
    const val LOGIN = "login"
    
    fun eventDetail(eventId: Int) = "event_detail/$eventId"
    fun seatSelection(sessionId: Int) = "seat_selection/$sessionId"
    fun checkout(holdToken: String) = "checkout/$holdToken"
    fun bookingSuccess(orderNumber: String) = "booking_success/$orderNumber"
    fun ticketDetail(ticketCode: String) = "ticket_detail/$ticketCode"
}

@Composable
fun MahaTicketRoot() {
    val navController = rememberNavController()
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as MahaTicketApp
    
    val eventViewModel: EventViewModel = viewModel(
        factory = EventViewModelFactory(app.eventRepository, app.networkMonitor)
    )
    
    val bookingViewModel: BookingViewModel = viewModel(
        factory = BookingViewModelFactory(app.bookingRepository, app.networkMonitor)
    )
    
    val isOnline by eventViewModel.isOnline.collectAsState()
    
    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.systemBars),
        bottomBar = {
            val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route
            // Hide bottom nav on booking flow screens
            val showBottomBar = currentRoute in listOf(
                Screen.Home.route,
                Screen.Explore.route,
                Screen.Tickets.route,
                Screen.Offers.route,
                Screen.Profile.route
            )
            if (showBottomBar) {
                BottomNavigationBar(navController)
            }
        }
    ) { innerPadding ->
        Column(modifier = Modifier
            .fillMaxSize()
            .padding(innerPadding)) {
            // Offline banner
            if (!isOnline) {
                OfflineBanner()
            }
            
            NavHost(
                navController = navController,
                startDestination = Screen.Home.route,
                modifier = Modifier.fillMaxSize(),
                enterTransition = {
                    fadeIn(animationSpec = tween(220)) + slideIntoContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.Start,
                        animationSpec = tween(220)
                    )
                },
                exitTransition = {
                    fadeOut(animationSpec = tween(180)) + slideOutOfContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.Start,
                        animationSpec = tween(180)
                    )
                },
                popEnterTransition = {
                    fadeIn(animationSpec = tween(220)) + slideIntoContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.End,
                        animationSpec = tween(220)
                    )
                },
                popExitTransition = {
                    fadeOut(animationSpec = tween(180)) + slideOutOfContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.End,
                        animationSpec = tween(180)
                    )
                }
            ) {
                composable(Screen.Home.route) {
                    HomeScreenWithViewModel(eventViewModel, navController)
                }
                composable(Screen.Explore.route) {
                    ExploreScreen(
                        viewModel = eventViewModel,
                        onSelectEvent = { event ->
                            navController.navigate(BookingRoutes.eventDetail(event.id))
                        }
                    )
                }
                composable(Screen.Tickets.route) {
                    MyTicketsScreen(
                        viewModel = bookingViewModel,
                        onNavigateToHome = {
                            navController.navigate(Screen.Home.route)
                        }
                    )
                }
                composable(Screen.Offers.route) {
                    OffersScreen(viewModel = eventViewModel)
                }
                composable(Screen.Profile.route) {
                    ProfileScreen(
                        onNavigateToLogin = {
                            navController.navigate(BookingRoutes.LOGIN)
                        },
                        onNavigateToTickets = {
                            navController.navigate(Screen.Tickets.route)
                        }
                    )
                }
                
                // Booking flow screens
                composable(
                    route = BookingRoutes.EVENT_DETAIL,
                    arguments = listOf(navArgument("eventId") { type = NavType.IntType })
                ) { backStackEntry ->
                    val eventId = backStackEntry.arguments?.getInt("eventId") ?: 0
                    EventDetailScreen(
                        eventId = eventId,
                        onNavigateBack = { navController.popBackStack() },
                        onBookSession = { sessionId ->
                            navController.navigate(BookingRoutes.seatSelection(sessionId))
                        }
                    )
                }
                
                composable(
                    route = BookingRoutes.SEAT_SELECTION,
                    arguments = listOf(navArgument("sessionId") { type = NavType.IntType })
                ) { backStackEntry ->
                    val sessionId = backStackEntry.arguments?.getInt("sessionId") ?: 0
                    SeatSelectionScreen(
                        sessionId = sessionId,
                        onNavigateBack = { navController.popBackStack() },
                        onContinueToCheckout = { holdToken ->
                            navController.navigate(BookingRoutes.checkout(holdToken))
                        }
                    )
                }
                
                composable(
                    route = BookingRoutes.CHECKOUT,
                    arguments = listOf(navArgument("holdToken") { type = NavType.StringType })
                ) { backStackEntry ->
                    val holdToken = backStackEntry.arguments?.getString("holdToken") ?: ""
                    CheckoutScreen(
                        holdToken = holdToken,
                        onNavigateBack = { navController.popBackStack() },
                        onBookingSuccess = { orderNumber ->
                            navController.navigate(BookingRoutes.bookingSuccess(orderNumber)) {
                                popUpTo(Screen.Home.route) { inclusive = false }
                            }
                        }
                    )
                }
                
                composable(
                    route = BookingRoutes.BOOKING_SUCCESS,
                    arguments = listOf(navArgument("orderNumber") { type = NavType.StringType })
                ) { backStackEntry ->
                    val orderNumber = backStackEntry.arguments?.getString("orderNumber") ?: ""
                    BookingSuccessScreen(
                        orderNumber = orderNumber,
                        onViewTicket = { ticketCode ->
                            navController.navigate(BookingRoutes.ticketDetail(ticketCode))
                        },
                        onGoHome = {
                            navController.navigate(Screen.Home.route) {
                                popUpTo(Screen.Home.route) { inclusive = true }
                            }
                        }
                    )
                }
                
                composable(
                    route = BookingRoutes.TICKET_DETAIL,
                    arguments = listOf(navArgument("ticketCode") { type = NavType.StringType })
                ) { backStackEntry ->
                    val ticketCode = backStackEntry.arguments?.getString("ticketCode") ?: ""
                    TicketDetailScreen(
                        ticketCode = ticketCode,
                        onNavigateBack = { navController.popBackStack() }
                    )
                }
                
                composable(BookingRoutes.LOGIN) {
                    LoginScreen(
                        onLoginSuccess = {
                            navController.navigate(Screen.Home.route) {
                                popUpTo(BookingRoutes.LOGIN) { inclusive = true }
                            }
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun BottomNavigationBar(navController: NavHostController) {
    val screens = listOf(
        Screen.Home,
        Screen.Explore,
        Screen.Tickets,
        Screen.Offers,
        Screen.Profile
    )
    
    val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route
    
    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = 4.dp
    ) {
        screens.forEach { screen ->
            val isSelected = currentRoute == screen.route
            val iconScale by animateFloatAsState(
                targetValue = if (isSelected) 1.15f else 1.0f,
                animationSpec = tween(200),
                label = "navIconScale"
            )

            NavigationBarItem(
                selected = isSelected,
                onClick = {
                    if (currentRoute != screen.route) {
                        navController.navigate(screen.route) {
                            popUpTo(Screen.Home.route) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                },
                icon = {
                    Icon(
                        screen.icon,
                        contentDescription = screen.title,
                        modifier = Modifier.scale(iconScale)
                    )
                },
                label = { Text(screen.title, fontSize = 11.sp) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = MaterialTheme.colorScheme.primary,
                    selectedTextColor = MaterialTheme.colorScheme.primary,
                    indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                )
            )
        }
    }
}

@Composable
fun OfflineBanner() {
    Surface(
        color = MahaWarning.copy(alpha = 0.15f),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Info,
                contentDescription = null,
                tint = MahaWarning,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                "ऑफलाइन मोड - कॅश केलेला डेटा दाखवत आहोत",
                style = MaterialTheme.typography.bodySmall,
                color = MahaTextPrimary
            )
        }
    }
}
