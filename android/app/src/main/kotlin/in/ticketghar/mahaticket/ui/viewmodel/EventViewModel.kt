package `in`.ticketghar.mahaticket.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import `in`.ticketghar.mahaticket.data.repository.EventRepository
import `in`.ticketghar.mahaticket.model.EventItem
import `in`.ticketghar.mahaticket.util.NetworkMonitor
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

sealed class EventsUiState {
    data object Loading : EventsUiState()
    data class Success(val events: List<EventItem>, val isOfflineData: Boolean = false) : EventsUiState()
    data class Error(val message: String, val cachedEvents: List<EventItem>? = null) : EventsUiState()
}

class EventViewModel(
    private val repository: EventRepository,
    private val networkMonitor: NetworkMonitor
) : ViewModel() {
    
    private val _eventsState = MutableStateFlow<EventsUiState>(EventsUiState.Loading)
    val eventsState: StateFlow<EventsUiState> = _eventsState.asStateFlow()
    
    private val _selectedCategory = MutableStateFlow("all")
    val selectedCategory: StateFlow<String> = _selectedCategory.asStateFlow()
    
    val isOnline: StateFlow<Boolean> = networkMonitor.isOnline
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)
    
    init {
        loadEvents()
        
        // Reload when coming back online
        viewModelScope.launch {
            isOnline.collect { online ->
                if (online && _eventsState.value is EventsUiState.Error) {
                    loadEvents()
                }
            }
        }
    }
    
    fun loadEvents(category: String? = null, search: String? = null) {
        viewModelScope.launch {
            _eventsState.value = EventsUiState.Loading
            
            val isCurrentlyOnline = isOnline.value
            val result = repository.getEvents(
                city = null,
                category = category ?: _selectedCategory.value.takeIf { it != "all" },
                search = search,
                isOnline = isCurrentlyOnline
            )
            
            _eventsState.value = result.fold(
                onSuccess = { events ->
                    EventsUiState.Success(events, isOfflineData = !isCurrentlyOnline)
                },
                onFailure = { error ->
                    EventsUiState.Error(
                        message = error.message ?: "Failed to load events",
                        cachedEvents = null
                    )
                }
            )
        }
    }
    
    fun selectCategory(category: String) {
        _selectedCategory.value = category
        loadEvents(category = category)
    }
    
    fun searchEvents(query: String) {
        loadEvents(search = query)
    }
}
