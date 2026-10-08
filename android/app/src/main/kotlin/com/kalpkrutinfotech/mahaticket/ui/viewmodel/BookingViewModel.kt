package com.kalpkrutinfotech.mahaticket.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kalpkrutinfotech.mahaticket.data.api.HoldSeatsResponse
import com.kalpkrutinfotech.mahaticket.data.repository.BookingRepository
import com.kalpkrutinfotech.mahaticket.model.BookingOrder
import com.kalpkrutinfotech.mahaticket.model.SeatItem
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
    
    private val _bookingOrder = MutableStateFlow<BookingOrder?>(null)
    val bookingOrder: StateFlow<BookingOrder?> = _bookingOrder.asStateFlow()
    
    var activeSessionId: Int = 1
    var activeEventId: Int = 1

    val isOnline: StateFlow<Boolean> = networkMonitor.isOnline
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), networkMonitor.isCurrentlyOnline())
    
    fun loadSeats(sessionId: Int, eventId: Int = 1) {
        activeSessionId = sessionId
        if (eventId > 0) activeEventId = eventId
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
            
            val seatIds = _selectedSeats.value.map { it.seatId }
            val result = repository.holdSeats(sessionId, seatIds, phoneNumber)
            
            _bookingState.value = result.fold(
                onSuccess = { holdResp ->
                    _holdResponse.value = holdResp
                    val token = (holdResp.hold?.holdToken ?: holdResp.holdToken).takeIf { !it.isNullOrBlank() }
                        ?: "hold_${sessionId}_${System.currentTimeMillis()}"
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
        razorpaySignature: String? = null,
        onSuccess: (String) -> Unit = {},
        onError: (String) -> Unit = {}
    ) {
        viewModelScope.launch {
            _bookingState.value = BookingUiState.Loading
            
            val seatIds = _selectedSeats.value.map { it.seatId }
            val result = repository.confirmBooking(
                sessionId = sessionId,
                eventId = eventId,
                seatIds = seatIds,
                userName = customerName,
                userEmail = email ?: "customer@mahaticket.in",
                userPhone = phoneNumber,
                couponCode = couponCode,
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
        if (currentSeats.any { it.seatId == seat.seatId }) {
            currentSeats.removeAll { it.seatId == seat.seatId }
        } else {
            if (currentSeats.size >= 8) return // Limit to 8
            currentSeats.add(seat)
        }
        _selectedSeats.value = currentSeats
    }
    
    fun releaseHold() {
        _holdResponse.value = null
        _selectedSeats.value = emptyList()
    }
}
