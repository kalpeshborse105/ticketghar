package com.kalpkrutinfotech.mahaticket.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kalpkrutinfotech.mahaticket.data.api.GeminiChatService
import com.kalpkrutinfotech.mahaticket.data.repository.BookingRepository
import com.kalpkrutinfotech.mahaticket.data.repository.EventRepository
import com.kalpkrutinfotech.mahaticket.model.*
import com.kalpkrutinfotech.mahaticket.theme.AppLanguage
import com.kalpkrutinfotech.mahaticket.theme.UserRole
import com.kalpkrutinfotech.mahaticket.util.NetworkMonitor
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID

class TicketGharViewModel(
    private val eventRepository: EventRepository? = null,
    private val bookingRepository: BookingRepository? = null,
    private val networkMonitor: NetworkMonitor? = null,
    val geminiService: GeminiChatService = GeminiChatService()
) : ViewModel() {

    // Language setting (Marathi default as required by user)
    private val _language = MutableStateFlow(AppLanguage.MARATHI)
    val language: StateFlow<AppLanguage> = _language.asStateFlow()

    // Active Screen Tab
    private val _currentTab = MutableStateFlow(AppTab.EXPLORE)
    val currentTab: StateFlow<AppTab> = _currentTab.asStateFlow()

    // User State
    private val _currentUser = MutableStateFlow<User?>(
        User(
            id = "user_default",
            email = "kalpesh@kalpkrut.com",
            name = "Kalpesh Borse",
            phone = "9822012345",
            role = UserRole.PUBLIC_USER,
            isOtpVerified = true
        )
    )
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    // Events Flow
    private val _events = MutableStateFlow<List<Event>>(emptyList())
    val events: StateFlow<List<Event>> = _events.asStateFlow()

    // Bookings Flow
    private val _bookings = MutableStateFlow<List<Booking>>(emptyList())
    val bookings: StateFlow<List<Booking>> = _bookings.asStateFlow()

    // Notifications Flow
    private val _notifications = MutableStateFlow<List<NotificationItem>>(emptyList())
    val notifications: StateFlow<List<NotificationItem>> = _notifications.asStateFlow()

    // Audit Logs Flow
    private val _auditLogs = MutableStateFlow<List<AuditLog>>(emptyList())
    val auditLogs: StateFlow<List<AuditLog>> = _auditLogs.asStateFlow()

    // Dynamic Seating Map Cache
    private val seatMapCache = mutableMapOf<String, MutableList<Seat>>()

    // Layout configuration
    private val _currentLayoutConfig = MutableStateFlow(
        SeatLayoutConfig(
            rows = listOf("A", "B", "C", "D", "E", "F", "G", "H"),
            seatsPerRow = 12,
            aisleAfterSeat = 6
        )
    )
    val currentLayoutConfig: StateFlow<SeatLayoutConfig> = _currentLayoutConfig.asStateFlow()

    // Active Selected Event & Showtime for booking
    private val _selectedEvent = MutableStateFlow<Event?>(null)
    val selectedEvent: StateFlow<Event?> = _selectedEvent.asStateFlow()

    private val _selectedShowtime = MutableStateFlow<Showtime?>(null)
    val selectedShowtime: StateFlow<Showtime?> = _selectedShowtime.asStateFlow()

    // Live seats for the active showtime
    private val _currentSeats = MutableStateFlow<List<Seat>>(emptyList())
    val currentSeats: StateFlow<List<Seat>> = _currentSeats.asStateFlow()

    // Selected seats by user
    private val _selectedSeats = MutableStateFlow<List<Seat>>(emptyList())
    val selectedSeats: StateFlow<List<Seat>> = _selectedSeats.asStateFlow()

    // Seat hold countdown timer (8:00 minutes)
    private val _seatHoldSeconds = MutableStateFlow(480)
    val seatHoldSeconds: StateFlow<Int> = _seatHoldSeconds.asStateFlow()
    private var timerJob: Job? = null

    // Loading State
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _loadingMessage = MutableStateFlow("")
    val loadingMessage: StateFlow<String> = _loadingMessage.asStateFlow()

    // Modals
    private val _showTrailerModal = MutableStateFlow(false)
    val showTrailerModal: StateFlow<Boolean> = _showTrailerModal.asStateFlow()

    private val _showPaymentSheet = MutableStateFlow(false)
    val showPaymentSheet: StateFlow<Boolean> = _showPaymentSheet.asStateFlow()

    private val _showOtpModal = MutableStateFlow(false)
    val showOtpModal: StateFlow<Boolean> = _showOtpModal.asStateFlow()

    private val _latestConfirmedBooking = MutableStateFlow<Booking?>(null)
    val latestConfirmedBooking: StateFlow<Booking?> = _latestConfirmedBooking.asStateFlow()

    // Temporary Guest Checkout details
    var guestEmail = MutableStateFlow("kalpesh@kalpkrut.com")
    var guestPhone = MutableStateFlow("9822012345")
    var lastSentOtp = MutableStateFlow("123456")

    // QR Scanner Result
    private val _scannerResult = MutableStateFlow<QrValidationResult?>(null)
    val scannerResult: StateFlow<QrValidationResult?> = _scannerResult.asStateFlow()

    // Filters
    val selectedCategoryFilter = MutableStateFlow<EventCategory?>(null)
    val selectedCityFilter = MutableStateFlow("All")
    val searchQuery = MutableStateFlow("")

    init {
        loadInitialData()
    }

    fun loadInitialData() {
        viewModelScope.launch {
            if (eventRepository != null) {
                val res = eventRepository.getEvents()
                res.onSuccess { eventItems ->
                    val mapped = eventItems.map { it.toEvent() }
                    _events.value = mapped
                    if (mapped.isNotEmpty() && _selectedEvent.value == null) {
                        _selectedEvent.value = mapped.first()
                        if (mapped.first().availableShowtimes.isNotEmpty()) {
                            _selectedShowtime.value = mapped.first().availableShowtimes.first()
                        }
                    }
                }
            }

            if (bookingRepository != null) {
                val ordRes = bookingRepository.getMyOrders("9822012345")
                ordRes.onSuccess { orders ->
                    val mapped = orders.map { it.toBooking() }
                    _bookings.value = mapped
                }
            }

            // Seed initial notifications & audit logs
            _notifications.value = listOf(
                NotificationItem(
                    id = "notif_001",
                    title = "🎭 Weekend Housefull Alert / हाऊसफुल्ल इशारा",
                    message = "प्रयोगांची तिकिटे वेगाने संपत आहेत! लवकरात लवकर जागा आरक्षित करा.",
                    isUrgent = false,
                    timestamp = System.currentTimeMillis() - 1800000
                ),
                NotificationItem(
                    id = "notif_002",
                    title = "⚡ Parking Notice / वाहनतळ सूचना",
                    message = "नाट्यगृह गेट ३ वरून दुचाकींसाठी पार्किंग सोय उपलब्ध आहे.",
                    isUrgent = true,
                    timestamp = System.currentTimeMillis() - 600000
                )
            )

            _auditLogs.value = listOf(
                AuditLog(
                    id = "aud_001",
                    timestamp = System.currentTimeMillis() - 7200000,
                    actorEmail = "admin@kalpkrut.com",
                    actorRole = UserRole.ADMIN,
                    actionType = "SYSTEM_INITIALIZED",
                    details = "TicketGhar platform initialized with production security and live booking engines.",
                    resourceTarget = "Kalpkrut Control Center"
                )
            )
        }
    }

    fun setLanguage(lang: AppLanguage) {
        _language.value = lang
    }

    fun setTab(tab: AppTab) {
        _currentTab.value = tab
    }

    fun selectEvent(event: Event) {
        _selectedEvent.value = event
        val firstShow = event.availableShowtimes.firstOrNull()
        if (firstShow != null) {
            selectShowtime(firstShow)
        }
    }

    fun selectShowtime(showtime: Showtime) {
        _selectedShowtime.value = showtime
        loadSeatsForShowtime(showtime.id)
    }

    fun loadSeatsForShowtime(showtimeId: String) {
        viewModelScope.launch {
            val sessionIdInt = showtimeId.toIntOrNull()
            if (sessionIdInt != null && bookingRepository != null) {
                val res = bookingRepository.getSessionSeats(sessionIdInt)
                res.onSuccess { seatItems ->
                    val seats = seatItems.map { it.toSeat() }
                    _currentSeats.value = seats
                    _selectedSeats.value = emptyList()
                    return@launch
                }
            }

            // Fallback generation based on current layout config
            if (!seatMapCache.containsKey(showtimeId)) {
                val layout = _currentLayoutConfig.value
                val generated = mutableListOf<Seat>()
                layout.rows.forEachIndexed { rowIndex, rowLetter ->
                    val tier = when (rowIndex) {
                        0, 1 -> SeatTier.VIP
                        2, 3 -> SeatTier.BALCONY
                        4, 5 -> SeatTier.EXECUTIVE
                        else -> SeatTier.STANDARD
                    }
                    for (num in 1..layout.seatsPerRow) {
                        val seatId = "$rowLetter$num"
                        val isBooked = (rowLetter == "A" && num in 3..5) ||
                                (rowLetter == "C" && (num == 7 || num == 8)) ||
                                (rowLetter == "D" && num in 1..3)
                        val status = if (isBooked) SeatStatus.BOOKED else SeatStatus.AVAILABLE
                        generated.add(
                            Seat(
                                id = seatId,
                                row = rowLetter,
                                number = num,
                                tier = tier,
                                price = tier.price,
                                status = status,
                                isAisle = num == layout.aisleAfterSeat
                            )
                        )
                    }
                }
                seatMapCache[showtimeId] = generated
            }
            _currentSeats.value = seatMapCache[showtimeId]!!.map { it.copy() }
            _selectedSeats.value = emptyList()
        }
    }

    fun toggleSeat(seatId: String) {
        val currentList = _currentSeats.value.toMutableList()
        val index = currentList.indexOfFirst { it.id == seatId }
        if (index != -1) {
            val s = currentList[index]
            if (s.status == SeatStatus.AVAILABLE) {
                currentList[index] = s.copy(status = SeatStatus.SELECTED)
            } else if (s.status == SeatStatus.SELECTED) {
                currentList[index] = s.copy(status = SeatStatus.AVAILABLE)
            }
            _currentSeats.value = currentList
            _selectedSeats.value = currentList.filter { it.status == SeatStatus.SELECTED }
            startHoldTimer()
        }
    }

    fun autoSelectGroup(count: Int) {
        val currentList = _currentSeats.value.toMutableList()
        // Deselect currently selected
        for (i in currentList.indices) {
            if (currentList[i].status == SeatStatus.SELECTED) {
                currentList[i] = currentList[i].copy(status = SeatStatus.AVAILABLE)
            }
        }

        val rows = currentList.groupBy { it.row }
        var chosen = listOf<Seat>()
        for ((_, rowSeats) in rows) {
            val available = rowSeats.filter { it.status == SeatStatus.AVAILABLE }
            for (start in 0..(available.size - count)) {
                val candidate = available.subList(start, start + count)
                if (candidate.zipWithNext().all { it.second.number == it.first.number + 1 }) {
                    chosen = candidate
                    break
                }
            }
            if (chosen.isNotEmpty()) break
        }

        if (chosen.isEmpty()) {
            val available = currentList.filter { it.status == SeatStatus.AVAILABLE }
            if (available.size >= count) chosen = available.take(count)
        }

        chosen.forEach { c ->
            val idx = currentList.indexOfFirst { it.id == c.id }
            if (idx != -1) currentList[idx] = currentList[idx].copy(status = SeatStatus.SELECTED)
        }

        _currentSeats.value = currentList
        _selectedSeats.value = currentList.filter { it.status == SeatStatus.SELECTED }
        startHoldTimer()
    }

    private fun startHoldTimer() {
        timerJob?.cancel()
        _seatHoldSeconds.value = 480
        timerJob = viewModelScope.launch {
            while (_seatHoldSeconds.value > 0) {
                delay(1000)
                _seatHoldSeconds.value -= 1
            }
        }
    }

    fun openTrailerModal(open: Boolean) {
        _showTrailerModal.value = open
    }

    fun openPaymentSheet(open: Boolean) {
        _showPaymentSheet.value = open
    }

    fun dismissPaymentSheet() {
        _showPaymentSheet.value = false
    }

    fun openOtpModal(open: Boolean) {
        _showOtpModal.value = open
    }

    fun dismissOtpModal() {
        _showOtpModal.value = false
    }

    fun initiateBookingFlow() {
        if (_selectedSeats.value.isEmpty()) return
        if (_currentUser.value?.isOtpVerified == true) {
            _showPaymentSheet.value = true
        } else {
            _showOtpModal.value = true
        }
    }

    fun verifyOtp(enteredOtp: String) {
        if (enteredOtp.trim() == "123456" || enteredOtp.trim() == lastSentOtp.value) {
            _currentUser.value = _currentUser.value?.copy(
                email = guestEmail.value,
                phone = guestPhone.value,
                isOtpVerified = true
            )
            _showOtpModal.value = false
            _showPaymentSheet.value = true
        }
    }

    fun completeRazorpayPayment(method: String) {
        val event = _selectedEvent.value ?: return
        val showtime = _selectedShowtime.value ?: return
        val selected = _selectedSeats.value
        if (selected.isEmpty()) return

        _isLoading.value = true
        _loadingMessage.value = if (_language.value == AppLanguage.MARATHI)
            "Razorpay पेमेंट पडताळणी व ई-पास निर्मिती सुरू आहे..."
        else
            "Processing Razorpay payment and generating digital pass..."

        viewModelScope.launch {
            delay(1200) // Brief smooth animation

            val count = selected.size
            val baseAmount = selected.sumOf { it.price }
            val convFee = count * 35
            val gst = (convFee * 18) / 100
            val total = baseAmount + convFee + gst
            val orderNo = "TG-${(10000..99999).random()}"

            val newBooking = Booking(
                bookingId = orderNo,
                eventId = event.id,
                eventTitleEn = event.titleEn,
                eventTitleMr = event.titleMr,
                venueName = showtime.venueName,
                venueAddress = event.venue.address,
                showDate = showtime.dateText,
                showTime = showtime.timeText,
                seatIds = selected.map { it.id },
                seatTier = selected.firstOrNull()?.tier ?: SeatTier.BALCONY,
                ticketCount = count,
                baseAmount = baseAmount,
                convenienceFee = convFee,
                gstAmount = gst,
                totalAmount = total,
                userEmail = guestEmail.value,
                userPhone = guestPhone.value,
                paymentId = "pay_rzp_${System.currentTimeMillis()}",
                paymentMethod = method,
                qrCodeData = "TICKETGHAR|$orderNo|${event.id}|${selected.joinToString(",") { it.id }}|CONFIRMED"
            )

            // Mark seats as booked
            val currentList = _currentSeats.value.toMutableList()
            selected.forEach { sel ->
                val idx = currentList.indexOfFirst { it.id == sel.id }
                if (idx != -1) currentList[idx] = currentList[idx].copy(status = SeatStatus.BOOKED)
            }
            _currentSeats.value = currentList
            _selectedSeats.value = emptyList()

            val updatedBookings = _bookings.value.toMutableList()
            updatedBookings.add(0, newBooking)
            _bookings.value = updatedBookings
            _latestConfirmedBooking.value = newBooking

            _isLoading.value = false
            _showPaymentSheet.value = false
            _currentTab.value = AppTab.MY_TICKETS
        }
    }

    fun switchUserRole(role: UserRole) {
        val updated = when (role) {
            UserRole.ADMIN -> User(
                id = "admin_kalpkrut",
                email = "admin@kalpkrut.com",
                name = "Kalpkrut Super Admin",
                phone = "9822099999",
                role = UserRole.ADMIN,
                isOtpVerified = true
            )
            UserRole.ORGANIZER -> User(
                id = "organizer_pune",
                email = "organizer@theatrepune.org",
                name = "Pune Theatre Operations",
                phone = "9822088888",
                role = UserRole.ORGANIZER,
                isOtpVerified = true
            )
            UserRole.PUBLIC_USER -> User(
                id = "user_kalpesh",
                email = "kalpesh@kalpkrut.com",
                name = "Kalpesh Borse",
                phone = "9822012345",
                role = UserRole.PUBLIC_USER,
                isOtpVerified = true
            )
        }
        _currentUser.value = updated
        when (role) {
            UserRole.ADMIN -> _currentTab.value = AppTab.CONTROL_CENTER
            UserRole.ORGANIZER -> _currentTab.value = AppTab.ORGANIZER_DASHBOARD
            UserRole.PUBLIC_USER -> _currentTab.value = AppTab.EXPLORE
        }
    }

    fun validateAndCheckInQr(qrString: String, scannedBy: String) {
        val candidateBookingId = if (qrString.contains("TICKETGHAR|")) {
            val parts = qrString.split("|")
            if (parts.size >= 2) parts[1] else qrString
        } else {
            qrString.trim()
        }

        val currentBookings = _bookings.value.toMutableList()
        val index = currentBookings.indexOfFirst {
            it.bookingId.equals(candidateBookingId, ignoreCase = true) ||
                    it.qrCodeData.equals(qrString, ignoreCase = true)
        }

        if (index == -1) {
            _scannerResult.value = QrValidationResult(
                isValid = false,
                isAlreadyCheckedIn = false,
                messageEn = "Invalid QR code. Record not found.",
                messageMr = "अवैध तिकीट QR कोड. कोणतीही नोंद आढळली नाही."
            )
            return
        }

        val b = currentBookings[index]
        if (b.isCheckedIn) {
            _scannerResult.value = QrValidationResult(
                isValid = false,
                isAlreadyCheckedIn = true,
                booking = b,
                messageEn = "Ticket already checked-in!",
                messageMr = "इशारा! हे तिकीट आधीच वापरले गेले आहे."
            )
            return
        }

        val updated = b.copy(
            isCheckedIn = true,
            checkedInAt = System.currentTimeMillis(),
            checkedInByGateStaff = scannedBy
        )
        currentBookings[index] = updated
        _bookings.value = currentBookings

        _scannerResult.value = QrValidationResult(
            isValid = true,
            isAlreadyCheckedIn = false,
            booking = updated,
            messageEn = "Entry Approved! Welcome.",
            messageMr = "प्रवेश मंजूर! नाट्यगृहात आपले स्वागत आहे."
        )
    }

    fun broadcastNotification(title: String, message: String, isUrgent: Boolean) {
        val item = NotificationItem(
            id = "notif_${System.currentTimeMillis()}",
            title = title,
            message = message,
            isUrgent = isUrgent,
            timestamp = System.currentTimeMillis()
        )
        val list = _notifications.value.toMutableList()
        list.add(0, item)
        _notifications.value = list
    }

    fun validateGateQr(qrCode: String) {
        validateAndCheckInQr(qrCode, "Gate Security Staff")
    }

    fun clearScannerResult() {
        _scannerResult.value = null
    }

    fun updateSeatingLayout(newConfig: SeatLayoutConfig) {
        updateSeatingChartLayout(newConfig)
    }

    fun broadcastUrgentAlert(title: String, message: String, isUrgent: Boolean = true) {
        broadcastNotification(title, message, isUrgent = isUrgent)
    }

    fun updateSeatingChartLayout(newConfig: SeatLayoutConfig) {
        _currentLayoutConfig.value = newConfig
        seatMapCache.clear()
    }
}
