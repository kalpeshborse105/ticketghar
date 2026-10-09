package com.kalpkrutinfotech.mahaticket

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.*
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.kalpkrutinfotech.mahaticket.theme.*
import com.kalpkrutinfotech.mahaticket.ui.components.BilingualTopBar
import com.kalpkrutinfotech.mahaticket.ui.screens.*
import com.kalpkrutinfotech.mahaticket.ui.viewmodel.*
import com.kalpkrutinfotech.mahaticket.util.RazorpayPaymentManager
import com.razorpay.Checkout
import com.razorpay.PaymentData
import com.razorpay.PaymentResultWithDataListener

class MainActivity : ComponentActivity(), PaymentResultWithDataListener {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        Checkout.preload(applicationContext)
        enableEdgeToEdge()

        setContent {
            MahaTicketTheme {
                MahaTicketRoot()
            }
        }
    }

    override fun onPaymentSuccess(razorpayPaymentId: String?, paymentData: PaymentData?) {
        RazorpayPaymentManager.handlePaymentSuccess(razorpayPaymentId, paymentData)
    }

    override fun onPaymentError(errorCode: Int, response: String?, paymentData: PaymentData?) {
        RazorpayPaymentManager.handlePaymentError(errorCode, response, paymentData)
    }
}

sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
    data object Home : Screen("home", "होम", Icons.Default.Home)
    data object Explore : Screen("explore", "शोधा", Icons.Default.Explore)
    data object Tickets : Screen("tickets", "तिकिटे", Icons.Default.ConfirmationNumber)
    data object Offers : Screen("offers", "ऑफर्स", Icons.Default.LocalOffer)
    data object Profile : Screen("profile", "प्रोफाइल", Icons.Default.Person)
    data object Admin : Screen("admin_control", "नियंत्रण", Icons.Default.AdminPanelSettings)
    data object Organizer : Screen("organizer_dashboard", "आयोजक", Icons.Default.Dashboard)
    data object QrScanner : Screen("qr_scanner", "स्कॅनर", Icons.Default.QrCodeScanner)
    data object Chatbot : Screen("chatbot", "नाट्यमित्र", Icons.Default.SmartToy)
    data object Notifications : Screen("notifications", "सूचना", Icons.Default.Notifications)
}

object BookingRoutes {
    const val EVENT_DETAIL = "event_detail/{eventId}"
    const val SEAT_SELECTION = "seat_selection/{sessionId}/{eventId}"
    const val CHECKOUT = "checkout/{holdToken}/{sessionId}/{eventId}"
    const val BOOKING_SUCCESS = "booking_success/{orderNumber}"
    const val TICKET_DETAIL = "ticket_detail/{ticketCode}"
    const val LOGIN = "login"
    const val LEGAL = "legal/{policyType}"

    fun eventDetail(eventId: Int) = "event_detail/$eventId"
    fun seatSelection(sessionId: Int, eventId: Int = 1) = "seat_selection/$sessionId/$eventId"
    fun checkout(holdToken: String, sessionId: Int = 1, eventId: Int = 1) = "checkout/$holdToken/$sessionId/$eventId"
    fun bookingSuccess(orderNumber: String) = "booking_success/$orderNumber"
    fun ticketDetail(ticketCode: String) = "ticket_detail/$ticketCode"
    fun legal(policyType: String) = "legal/$policyType"
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

    val mainViewModel: TicketGharViewModel = viewModel(
        factory = object : androidx.lifecycle.ViewModelProvider.Factory {
            override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return TicketGharViewModel(
                    eventRepository = app.eventRepository,
                    bookingRepository = app.bookingRepository,
                    networkMonitor = app.networkMonitor
                ) as T
            }
        }
    )

    val currentLanguage by mainViewModel.language.collectAsState()
    val currentUser by mainViewModel.currentUser.collectAsState()
    val notifications by mainViewModel.notifications.collectAsState()

    val isOnline by eventViewModel.isOnline.collectAsState()
    var previousOnlineState by remember { mutableStateOf<Boolean?>(null) }
    var showOnlineToast by remember { mutableStateOf(false) }

    LaunchedEffect(isOnline) {
        if (previousOnlineState == false && isOnline) {
            showOnlineToast = true
            eventViewModel.loadEvents()
            eventViewModel.loadCities()
            eventViewModel.loadOffers()
            kotlinx.coroutines.delay(4000)
            showOnlineToast = false
        }
        previousOnlineState = isOnline
    }

    val currentBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = currentBackStackEntry?.destination?.route

    val isTopLevelRoute = currentRoute in listOf(
        Screen.Home.route,
        Screen.Explore.route,
        Screen.Tickets.route,
        Screen.Offers.route,
        Screen.Profile.route,
        Screen.Admin.route,
        Screen.Organizer.route
    )

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .windowInsetsPadding(WindowInsets.systemBars),
        topBar = {
            if (isTopLevelRoute) {
                val currentCity by eventViewModel.selectedCity.collectAsState()
                BilingualTopBar(
                    currentLanguage = currentLanguage,
                    onLanguageToggle = { mainViewModel.setLanguage(it) },
                    currentRole = currentUser?.role ?: UserRole.PUBLIC_USER,
                    onRoleSelected = { role ->
                        mainViewModel.switchUserRole(role)
                        when (role) {
                            UserRole.ADMIN -> navController.navigate(Screen.Admin.route) {
                                popUpTo(Screen.Home.route) { saveState = true }
                                launchSingleTop = true
                            }
                            UserRole.ORGANIZER -> navController.navigate(Screen.Organizer.route) {
                                popUpTo(Screen.Home.route) { saveState = true }
                                launchSingleTop = true
                            }
                            UserRole.PUBLIC_USER -> navController.navigate(Screen.Home.route) {
                                popUpTo(Screen.Home.route) { inclusive = false }
                                launchSingleTop = true
                            }
                        }
                    },
                    selectedCity = currentCity,
                    onCityClick = {},
                    onCitySelected = { selectedCityName ->
                        eventViewModel.selectCity(selectedCityName)
                    },
                    onProfileClick = {
                        navController.navigate(Screen.Profile.route)
                    },
                    notificationCount = notifications.count { !it.isRead },
                    onNotificationClick = { navController.navigate(Screen.Notifications.route) },
                    onChatbotClick = { navController.navigate(Screen.Chatbot.route) }
                )
            }
        },
        floatingActionButton = {
            val showFab = currentRoute !in listOf(
                Screen.Chatbot.route,
                BookingRoutes.EVENT_DETAIL,
                BookingRoutes.SEAT_SELECTION,
                BookingRoutes.CHECKOUT
            )
            if (showFab) {
                FloatingActionButton(
                    onClick = { navController.navigate(Screen.Chatbot.route) },
                    containerColor = GoldAccent,
                    contentColor = Color.Black,
                    modifier = Modifier.testTag("ai_assistant_fab")
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = "🎭", fontSize = 18.sp)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (currentLanguage == AppLanguage.MARATHI) "नाट्यमित्र AI" else "NatyaMitra",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        },
        bottomBar = {
            if (isTopLevelRoute) {
                TheatricalBottomNavigationBar(
                    navController = navController,
                    currentRole = currentUser?.role ?: UserRole.PUBLIC_USER
                )
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Offline banner
            AnimatedVisibility(
                visible = !isOnline,
                enter = expandVertically() + fadeIn(),
                exit = shrinkVertically() + fadeOut()
            ) {
                OfflineBanner()
            }

            // Internet restored banner
            AnimatedVisibility(
                visible = showOnlineToast,
                enter = expandVertically() + fadeIn(),
                exit = shrinkVertically() + fadeOut()
            ) {
                OnlineRestoredBanner()
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
                        },
                        onNavigateToLegal = { policyType ->
                            navController.navigate(BookingRoutes.legal(policyType))
                        }
                    )
                }
                composable(Screen.Admin.route) {
                    AdminControlCenterScreen(viewModel = mainViewModel)
                }
                composable(Screen.Organizer.route) {
                    OrganizerScreen(
                        viewModel = mainViewModel,
                        onLaunchScannerClick = { navController.navigate(Screen.QrScanner.route) },
                        onViewShowSeatsClick = { event ->
                            val firstSession = event.availableShowtimes.firstOrNull()?.id?.toIntOrNull() ?: 1
                            val evId = event.id.toIntOrNull() ?: 1
                            navController.navigate(BookingRoutes.seatSelection(firstSession, evId))
                        }
                    )
                }
                composable(Screen.QrScanner.route) {
                    QrScannerScreen(viewModel = mainViewModel)
                }
                composable(Screen.Chatbot.route) {
                    ChatbotScreen(viewModel = mainViewModel)
                }
                composable(Screen.Notifications.route) {
                    NotificationsScreen(viewModel = mainViewModel)
                }

                // Booking Flow screens
                composable(
                    route = BookingRoutes.EVENT_DETAIL,
                    arguments = listOf(navArgument("eventId") { type = NavType.IntType })
                ) { backStackEntry ->
                    val eventId = backStackEntry.arguments?.getInt("eventId") ?: 0
                    EventDetailScreen(
                        eventId = eventId,
                        onNavigateBack = { navController.popBackStack() },
                        onBookSession = { sessionId, evId ->
                            navController.navigate(BookingRoutes.seatSelection(sessionId, evId))
                        }
                    )
                }

                composable(
                    route = BookingRoutes.SEAT_SELECTION,
                    arguments = listOf(
                        navArgument("sessionId") { type = NavType.IntType },
                        navArgument("eventId") { type = NavType.IntType; defaultValue = 1 }
                    )
                ) { backStackEntry ->
                    val sessionId = backStackEntry.arguments?.getInt("sessionId") ?: 0
                    val eventId = backStackEntry.arguments?.getInt("eventId") ?: 1
                    SeatSelectionScreen(
                        sessionId = sessionId,
                        eventId = eventId,
                        bookingViewModel = bookingViewModel,
                        eventViewModel = eventViewModel,
                        onNavigateBack = { navController.popBackStack() },
                        onContinueToCheckout = { holdToken, sessId, evId ->
                            navController.navigate(BookingRoutes.checkout(holdToken, sessId, evId))
                        }
                    )
                }

                composable(
                    route = BookingRoutes.CHECKOUT,
                    arguments = listOf(
                        navArgument("holdToken") { type = NavType.StringType },
                        navArgument("sessionId") { type = NavType.IntType; defaultValue = 1 },
                        navArgument("eventId") { type = NavType.IntType; defaultValue = 1 }
                    )
                ) { backStackEntry ->
                    val holdToken = backStackEntry.arguments?.getString("holdToken") ?: ""
                    val sessionId = backStackEntry.arguments?.getInt("sessionId") ?: 1
                    val eventId = backStackEntry.arguments?.getInt("eventId") ?: 1
                    CheckoutScreen(
                        holdToken = holdToken,
                        sessionId = sessionId,
                        eventId = eventId,
                        bookingViewModel = bookingViewModel,
                        onNavigateBack = { navController.popBackStack() },
                        onBookingSuccess = { orderNumber ->
                            navController.navigate(BookingRoutes.bookingSuccess(orderNumber)) {
                                popUpTo(Screen.Home.route) { inclusive = false }
                            }
                        }
                    )
                }

                composable(
                    route = BookingRoutes.LEGAL,
                    arguments = listOf(navArgument("policyType") { type = NavType.StringType })
                ) { backStackEntry ->
                    val policyType = backStackEntry.arguments?.getString("policyType") ?: "terms"
                    LegalScreen(
                        policyType = policyType,
                        onNavigateBack = { navController.popBackStack() }
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
fun TheatricalBottomNavigationBar(
    navController: NavHostController,
    currentRole: UserRole
) {
    val screens = when (currentRole) {
        UserRole.ADMIN -> listOf(
            Screen.Home,
            Screen.Admin,
            Screen.Organizer,
            Screen.QrScanner,
            Screen.Profile
        )
        UserRole.ORGANIZER -> listOf(
            Screen.Home,
            Screen.Organizer,
            Screen.QrScanner,
            Screen.Tickets,
            Screen.Profile
        )
        UserRole.PUBLIC_USER -> listOf(
            Screen.Home,
            Screen.Explore,
            Screen.Tickets,
            Screen.Profile
        )
    }

    val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route

    Surface(
        color = Color.White,
        shadowElevation = 10.dp,
        border = androidx.compose.foundation.BorderStroke(0.5.dp, MahaBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        NavigationBar(
            containerColor = Color.White,
            tonalElevation = 0.dp,
            modifier = Modifier.height(64.dp)
        ) {
            screens.forEach { screen ->
                val isSelected = currentRoute == screen.route
                val labelText = when (screen) {
                    Screen.Home -> "मुखपृष्ठ"
                    Screen.Explore -> "शोधा"
                    Screen.Tickets -> "माझी तिकिटे"
                    Screen.Profile -> "प्रोफाइल"
                    else -> screen.title
                }

                val iconScale by animateFloatAsState(
                    targetValue = if (isSelected) 1.12f else 1.0f,
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
                            contentDescription = labelText,
                            modifier = Modifier
                                .size(22.dp)
                                .scale(iconScale)
                        )
                    },
                    label = {
                        Text(
                            text = labelText,
                            fontSize = 10.5.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                        )
                    },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MahaOrangeDeep,
                        selectedTextColor = MahaOrangeDeep,
                        indicatorColor = MahaWarm,
                        unselectedIconColor = TextSecondary,
                        unselectedTextColor = TextSecondary
                    )
                )
            }
        }
    }
}

@Composable
fun OfflineBanner() {
    Surface(
        color = Color(0xFF450A0A),
        border = androidx.compose.foundation.BorderStroke(1.dp, TheatricalCrimson),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.WifiOff,
                contentDescription = null,
                tint = TheatricalCrimsonLight,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                "इंटरनेट कनेक्शन उपलब्ध नाही. थेट तिकीट बुकिंगसाठी इंटरनेट सुरू करा.",
                color = Color.White,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
fun OnlineRestoredBanner() {
    Surface(
        color = Color(0xFF064E3B),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF10B981)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.CheckCircle,
                contentDescription = null,
                tint = Color(0xFF34D399),
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                "✓ इंटरनेट पूर्ववत झाले! थेट डेटा अपडेट केला आहे.",
                color = Color.White,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}
