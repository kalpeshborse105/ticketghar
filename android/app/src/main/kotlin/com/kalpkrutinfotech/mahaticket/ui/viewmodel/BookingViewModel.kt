package com.kalpkrutinfotech.mahaticket.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kalpkrutinfotech.mahaticket.data.api.HoldSeatsResponse
import com.kalpkrutinfotech.mahaticket.data.repository.BookingRepository
import com.kalpkrutinfotech.mahaticket.model.BookingOrder
import com.kalpkrutinfotech.mahaticket.model.SeatItem
import com.kalpkrutinfotech.mahaticket.util.DateTimeUtils
import com.kalpkrutinfotech.mahaticket.util.NetworkMonitor
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

sealed class SeatsUiState {
    data object Loading : SeatsUiState()
    data class Success(val seats: List<SeatItem>) : SeatsUiState()
    data class Error(val message: String) : SeatsUiState()
}

sealed class BookingUiState {
    data object Idle : BookingUiState()
    data object Loading : BookingUiState()
    data class HoldSuccess(val holdResponse: HoldSeatsResponse) : BookingUiState()
    data class BookingSuccess(val order: BookingOrder) : BookingUiState()
    data class Error(val message: String) : BookingUiState()
}

sealed class TicketsUiState {
    data object Loading : TicketsUiState()
    data class Success(val tickets: List<BookingOrder>, val isOfflineData: Boolean = false) : TicketsUiState()
    data class Error(val message: String) : TicketsUiState()
}

class BookingViewModel(
    private val repository: BookingRepository,
    private val networkMonitor: NetworkMonitor
) : ViewModel() {
    
    private val _seatsState = MutableStateFlow<SeatsUiState>(SeatsUiState.Loading)
    val seatsState: StateFlow<SeatsUiState> = _seatsState.asStateFlow()
    
    private val _bookingState = MutableStateFlow<BookingUiState>(BookingUiState.Idle)
    val bookingState: StateFlow<BookingUiState> = _bookingState.asStateFlow()
    
    private val _ticketsState = MutableStateFlow<TicketsUiState>(TicketsUiState.Loading)
    val ticketsState: StateFlow<TicketsUiState> = _ticketsState.asStateFlow()
    
    private val _selectedSeats = MutableStateFlow<List<SeatItem>>(emptyList())
    val selectedSeats: StateFlow<List<SeatItem>> = _selectedSeats.asStateFlow()
    
    private val _holdResponse = MutableStateFlow<HoldSeatsResponse?>(null)
    val holdResponse: StateFlow<HoldSeatsResponse?> = _holdResponse.asStateFlow()

    // Absolute Server-Authoritative Seat Hold Expiry Timestamp (Epoch ms)
    private val _holdExpiresAtEpochMs = MutableStateFlow(0L)
    val holdExpiresAtEpochMs: StateFlow<Long> = _holdExpiresAtEpochMs.asStateFlow()
    
    private val _bookingOrder = MutableStateFlow<BookingOrder?>(null)
    val bookingOrder: StateFlow<BookingOrder?> = _bookingOrder.asStateFlow()
    
    var activeSessionId: Int = 1
    var activeEventId: Int = 1
    var activeEventTitle: String = "नियम व अटी लागू"
    var activeEventPoster: String = ""
    var activeVenueName: String = "बाळ गंधर्व रंगमंदिर, पुणे"
    var activeSessionTime: String = "शनिवार, १२ ऑक्टोबर • संध्या. ०५:००"

    // Authoritative State Preservation for Active Booking Session
    var activeHoldToken: String? = null
    var activeSeatIds: List<Int> = emptyList()
    var activeOrderId: String? = null
    var isProcessingPayment: Boolean = false

    fun setActiveBookingContext(title: String, poster: String, venue: String, time: String) {
        if (title.isNotBlank()) activeEventTitle = title
        if (poster.isNotBlank()) activeEventPoster = poster
        if (venue.isNotBlank()) activeVenueName = venue
        if (time.isNotBlank()) activeSessionTime = time
    }

    val isOnline: StateFlow<Boolean> = networkMonitor.isOnline
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), networkMonitor.isCurrentlyOnline())
    
    fun clearSelectedSeats() {
        if (isProcessingPayment) return
        _selectedSeats.value = emptyList()
        activeSeatIds = emptyList()
        activeHoldToken = null
        _holdResponse.value = null
        _holdExpiresAtEpochMs.value = 0L
    }

    fun getRemainingHoldSeconds(): Int {
        val expiry = _holdExpiresAtEpochMs.value
        if (expiry <= 0L) {
            return if (_selectedSeats.value.isNotEmpty() || activeSeatIds.isNotEmpty()) 300 else 0
        }
        val remaining = (expiry - System.currentTimeMillis()) / 1000L
        return remaining.coerceAtLeast(0L).toInt()
    }

    fun isHoldExpired(): Boolean {
        val expiry = _holdExpiresAtEpochMs.value
        return expiry > 0L && System.currentTimeMillis() >= expiry
    }

    fun loadSeats(sessionId: Int, eventId: Int = 1) {
        val sessionChanged = activeSessionId != sessionId
        activeSessionId = sessionId
        if (eventId > 0) activeEventId = eventId

        // Only clear state if navigating to an entirely different session
        if (sessionChanged && !isProcessingPayment) {
            _selectedSeats.value = emptyList()
            activeSeatIds = emptyList()
            activeHoldToken = null
            _holdResponse.value = null
            _holdExpiresAtEpochMs.value = 0L
        }

        viewModelScope.launch {
            _seatsState.value = SeatsUiState.Loading
            
            val result = repository.getSessionSeats(sessionId)
            
            _seatsState.value = result.fold(
                onSuccess = { seats -> SeatsUiState.Success(seats) },
                onFailure = { error -> SeatsUiState.Error(error.localizedMessage ?: "Failed to load seats") }
            )
        }
    }
    
    fun holdSeats(
        sessionId: Int,
        phoneNumber: String,
        onSuccess: (String) -> Unit = {},
        onError: (String) -> Unit = {}
    ) {
        activeSessionId = sessionId
        viewModelScope.launch {
            _bookingState.value = BookingUiState.Loading
            
            val seatIds = _selectedSeats.value.map { it.seatId }.ifEmpty { activeSeatIds }
            val result = repository.holdSeats(sessionId, seatIds, phoneNumber)
            
            _bookingState.value = result.fold(
                onSuccess = { holdResp ->
                    _holdResponse.value = holdResp
                    val expiresAtIso = holdResp.hold?.holdExpiresAt ?: holdResp.hold?.expiresAt
                    val expiryMs = DateTimeUtils.parseToIST(expiresAtIso)?.toInstant()?.toEpochMilli()
                        ?: (System.currentTimeMillis() + 300_000L)
                    _holdExpiresAtEpochMs.value = expiryMs

                    val token = (holdResp.hold?.holdToken ?: holdResp.holdToken).takeIf { !it.isNullOrBlank() }
                        ?: "hold_${sessionId}_${System.currentTimeMillis()}"
                    activeHoldToken = token
                    activeSeatIds = seatIds
                    onSuccess(token)
                    BookingUiState.HoldSuccess(holdResp)
                },
                onFailure = { 
                    onError(it.localizedMessage ?: "Hold failed")
                    BookingUiState.Error(it.localizedMessage ?: "Hold failed")
                }
            )
        }
    }
    
    fun confirmBooking(
        holdToken: String,
        phoneNumber: String,
        email: String?,
        attendeeNames: Map<String, String> = emptyMap(),
        razorpayPaymentId: String? = null,
        razorpaySignature: String? = null,
        onSuccess: (String) -> Unit = {},
        onError: (String) -> Unit = {}
    ) {
        viewModelScope.launch {
            _bookingState.value = BookingUiState.Loading
            
            val seatIds = _selectedSeats.value.map { it.seatId }
            val customerName = attendeeNames.values.firstOrNull() ?: "Customer"

            val result = repository.confirmBooking(
                sessionId = activeSessionId,
                eventId = activeEventId,
                seatIds = seatIds,
                userName = customerName,
                userEmail = email ?: "customer@mahaticket.in",
                userPhone = phoneNumber,
                paymentId = razorpayPaymentId
            )
            
            _bookingState.value = result.fold(
                onSuccess = { confirmation ->
                    val orderNumber = confirmation.order?.orderNumber ?: "ORD-${System.currentTimeMillis()}"
                    onSuccess(orderNumber)
                    BookingUiState.Idle
                },
                onFailure = { 
                    onError(it.localizedMessage ?: "Booking failed")
                    BookingUiState.Error(it.localizedMessage ?: "Booking failed")
                }
            )
        }
    }

    fun confirmBooking(
        sessionId: Int,
        eventId: Int,
        customerName: String,
        phoneNumber: String,
        email: String?,
        attendeeNames: Map<Int, String> = emptyMap(),
        couponCode: String? = null,
        razorpayPaymentId: String? = null,
        razorpayOrderId: String? = null,
        razorpaySignature: String? = null,
        seatIds: List<Int>? = null,
        onSuccess: (String) -> Unit = {},
        onError: (String) -> Unit = {}
    ) {
        viewModelScope.launch {
            _bookingState.value = BookingUiState.Loading
            
            val effectiveSeatIds = seatIds?.takeIf { it.isNotEmpty() }
                ?: activeSeatIds.takeIf { it.isNotEmpty() }
                ?: _selectedSeats.value.map { it.seatId }

            if (effectiveSeatIds.isEmpty()) {
                isProcessingPayment = false
                val err = "कोणतेही आसन निवडलेले नाही (No seats selected)"
                _bookingState.value = BookingUiState.Error(err)
                onError(err)
                return@launch
            }

            val result = repository.confirmBooking(
                sessionId = sessionId,
                eventId = eventId,
                seatIds = effectiveSeatIds,
                userName = customerName,
                userEmail = email ?: "customer@mahaticket.in",
                userPhone = phoneNumber,
                couponCode = couponCode,
                paymentId = razorpayPaymentId,
                orderId = razorpayOrderId ?: activeOrderId,
                signature = razorpaySignature
            )
            
            _bookingState.value = result.fold(
                onSuccess = { confirmation ->
                    isProcessingPayment = false
                    val orderNumber = confirmation.order?.orderNumber ?: "ORD-${System.currentTimeMillis()}"
                    // Clear selected seats ONLY on confirmed server-verified success!
                    _selectedSeats.value = emptyList()
                    activeSeatIds = emptyList()
                    activeHoldToken = null
                    _holdResponse.value = null
                    _holdExpiresAtEpochMs.value = 0L
                    onSuccess(orderNumber)
                    BookingUiState.Idle
                },
                onFailure = { 
                    isProcessingPayment = false
                    onError(it.localizedMessage ?: "Booking failed")
                    BookingUiState.Error(it.localizedMessage ?: "Booking failed")
                }
            )
        }
    }

    fun createPaymentOrder(
        sessionId: Int,
        seatIds: List<Int>,
        holdToken: String? = null,
        couponCode: String? = null,
        onSuccess: (orderId: String, amount: Int, keyId: String) -> Unit,
        onError: (String) -> Unit
    ) {
        val effectiveHoldToken = holdToken ?: activeHoldToken ?: _holdResponse.value?.holdToken
        activeHoldToken = effectiveHoldToken
        if (seatIds.isNotEmpty()) {
            activeSeatIds = seatIds
        }
        isProcessingPayment = true

        viewModelScope.launch {
            val result = repository.createPaymentOrder(sessionId, seatIds, effectiveHoldToken, couponCode)
            result.fold(
                onSuccess = { orderResp ->
                    val orderId = orderResp.orderId ?: ""
                    val amount = orderResp.amount
                    val keyId = orderResp.keyId ?: "rzp_test_TkizMeQ14N4b6s"
                    activeOrderId = orderId
                    orderResp.holdExpiresAt?.let { expiresIso ->
                        DateTimeUtils.parseToIST(expiresIso)?.toInstant()?.toEpochMilli()?.let { expiryMs ->
                            if (expiryMs > System.currentTimeMillis()) {
                                _holdExpiresAtEpochMs.value = expiryMs
                            }
                        }
                    }
                    onSuccess(orderId, amount, keyId)
                },
                onFailure = { err ->
                    isProcessingPayment = false
                    onError(err.localizedMessage ?: "पेमेंट ऑर्डर तयार करण्यात त्रुटी")
                }
            )
        }
    }

    fun validateCoupon(
        code: String,
        amount: Int,
        onSuccess: (discountPaise: Int, message: String) -> Unit,
        onError: (String) -> Unit
    ) {
        viewModelScope.launch {
            val result = repository.validateCoupon(code, amount)
            result.fold(
                onSuccess = { resp ->
                    onSuccess(resp.discount, resp.message ?: "कूपन लागू झाले")
                },
                onFailure = { err ->
                    onError(err.localizedMessage ?: "अवैध कूपन कोड")
                }
            )
        }
    }
    
    fun loadMyTickets(phone: String? = null) {
        viewModelScope.launch {
            _ticketsState.value = TicketsUiState.Loading
            
            val queryPhone = if (!phone.isNullOrBlank()) phone.trim() else "9876543210"
            val result = repository.getMyOrders(queryPhone)
            
            _ticketsState.value = result.fold(
                onSuccess = { orders ->
                    TicketsUiState.Success(orders)
                },
                onFailure = { error ->
                    TicketsUiState.Error(error.localizedMessage ?: "Failed to load tickets")
                }
            )
        }
    }
    
    fun resetBookingState() {
        _bookingState.value = BookingUiState.Idle
    }
    
    fun toggleSeatSelection(seat: SeatItem) {
        val currentSeats = _selectedSeats.value.toMutableList()
        val existingIndex = currentSeats.indexOfFirst {
            it.seatId == seat.seatId || it.seatCode.equals(seat.seatCode, ignoreCase = true)
        }
        if (existingIndex >= 0) {
            currentSeats.removeAt(existingIndex)
        } else {
            if (currentSeats.size >= 6) return // Strictly limit to max 6 seats per booking
            currentSeats.add(seat)
        }
        _selectedSeats.value = currentSeats
    }
    
    fun releaseHold(
        sessionId: Int = activeSessionId,
        holdToken: String? = null,
        seatIds: List<Int>? = null
    ) {
        if (isProcessingPayment) {
            // Never release seats during active payment processing!
            return
        }
        val token = holdToken ?: activeHoldToken ?: _holdResponse.value?.holdToken
        val targetSeatIds = seatIds ?: activeSeatIds.takeIf { it.isNotEmpty() } ?: _selectedSeats.value.map { it.seatId }
        if (!token.isNullOrBlank()) {
            viewModelScope.launch {
                try {
                    repository.releaseHold(sessionId, token, targetSeatIds)
                } catch (e: Exception) {
                    // Non-blocking
                }
            }
        }
        _holdResponse.value = null
        _selectedSeats.value = emptyList()
        activeSeatIds = emptyList()
        activeHoldToken = null
        _holdExpiresAtEpochMs.value = 0L
    }
}
