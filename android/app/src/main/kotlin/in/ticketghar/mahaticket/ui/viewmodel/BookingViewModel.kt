package `in`.ticketghar.mahaticket.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import `in`.ticketghar.mahaticket.data.api.HoldSeatsResponse
import `in`.ticketghar.mahaticket.data.db.CachedTicket
import `in`.ticketghar.mahaticket.data.repository.BookingRepository
import `in`.ticketghar.mahaticket.model.BookingOrder
import `in`.ticketghar.mahaticket.model.SeatItem
import `in`.ticketghar.mahaticket.util.NetworkMonitor
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
    data class Success(val tickets: List<CachedTicket>, val isOfflineData: Boolean = false) : TicketsUiState()
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
    
    val isOnline: StateFlow<Boolean> = networkMonitor.isOnline
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)
    
    fun loadSeats(sessionId: Int) {
        viewModelScope.launch {
            _seatsState.value = SeatsUiState.Loading
            
            val result = repository.getSessionSeats(sessionId)
            _seatsState.value = result.fold(
                onSuccess = { SeatsUiState.Success(it) },
                onFailure = { SeatsUiState.Error(it.message ?: "Failed to load seats") }
            )
        }
    }
    
    fun holdSeats(sessionId: Int, phoneNumber: String) {
        if (!isOnline.value) {
            _bookingState.value = BookingUiState.Error("बुकिंगसाठी इंटरनेट आवश्यक आहे")
            return
        }
        
        viewModelScope.launch {
            _bookingState.value = BookingUiState.Loading
            
            val seatIds = _selectedSeats.value.map { it.seatId }
            val result = repository.holdSeats(sessionId, seatIds, phoneNumber)
            _bookingState.value = result.fold(
                onSuccess = { 
                    _holdResponse.value = it
                    BookingUiState.HoldSuccess(it)
                },
                onFailure = { BookingUiState.Error(it.message ?: "Failed to hold seats") }
            )
        }
    }
    
    fun confirmBooking(
        holdToken: String,
        phoneNumber: String,
        email: String?,
        attendeeNames: Map<String, String>,
        razorpayPaymentId: String,
        razorpaySignature: String,
        onSuccess: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        if (!isOnline.value) {
            onError("बुकिंग पूर्ण करण्यासाठी इंटरनेट आवश्यक आहे")
            return
        }
        
        viewModelScope.launch {
            _bookingState.value = BookingUiState.Loading
            
            val result = repository.confirmBooking(
                holdToken, phoneNumber, email, attendeeNames, razorpayPaymentId, razorpaySignature
            )
            _bookingState.value = result.fold(
                onSuccess = { 
                    _bookingOrder.value = it
                    onSuccess(it.orderNumber)
                    BookingUiState.BookingSuccess(it)
                },
                onFailure = { 
                    onError(it.message ?: "Booking failed")
                    BookingUiState.Error(it.message ?: "Booking failed")
                }
            )
        }
    }
    
    fun loadMyTickets(phone: String? = null) {
        viewModelScope.launch {
            _ticketsState.value = TicketsUiState.Loading
            
            val isCurrentlyOnline = isOnline.value
            val result = repository.getMyTickets(isCurrentlyOnline, phone)
            
            _ticketsState.value = result.fold(
                onSuccess = { tickets ->
                    TicketsUiState.Success(tickets, isOfflineData = !isCurrentlyOnline)
                },
                onFailure = { error ->
                    TicketsUiState.Error(error.message ?: "Failed to load tickets")
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
            currentSeats.add(seat)
        }
        _selectedSeats.value = currentSeats
    }
    
    fun releaseHold() {
        _holdResponse.value = null
        _selectedSeats.value = emptyList()
    }
}
