package com.kalpkrutinfotech.mahaticket.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kalpkrutinfotech.mahaticket.data.api.AnnouncementResponse
import com.kalpkrutinfotech.mahaticket.data.api.CityCatalogItem
import com.kalpkrutinfotech.mahaticket.data.api.CouponResponse
import com.kalpkrutinfotech.mahaticket.data.api.EventReviewsResponse
import com.kalpkrutinfotech.mahaticket.data.repository.EventRepository
import com.kalpkrutinfotech.mahaticket.model.EventItem
import com.kalpkrutinfotech.mahaticket.util.NetworkMonitor
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

sealed class EventsUiState {
    data object Loading : EventsUiState()
    data class Success(val events: List<EventItem>, val isOfflineData: Boolean = false) : EventsUiState()
    data class Error(val message: String, val cachedEvents: List<EventItem>? = null) : EventsUiState()
}

sealed class EventDetailUiState {
    data object Loading : EventDetailUiState()
    data class Success(val event: EventItem) : EventDetailUiState()
    data class Error(val message: String) : EventDetailUiState()
}

sealed class OffersUiState {
    data object Loading : OffersUiState()
    data class Success(
        val coupons: List<CouponResponse>,
        val announcements: List<AnnouncementResponse>
    ) : OffersUiState()
    data class Error(val message: String) : OffersUiState()
}

class EventViewModel(
    private val repository: EventRepository,
    private val networkMonitor: NetworkMonitor
) : ViewModel() {
    
    private val _eventsState = MutableStateFlow<EventsUiState>(EventsUiState.Loading)
    val eventsState: StateFlow<EventsUiState> = _eventsState.asStateFlow()

    // Dedicated stable banner state separated from filter/category state
    private val _bannerEvents = MutableStateFlow<List<EventItem>>(emptyList())
    val bannerEvents: StateFlow<List<EventItem>> = _bannerEvents.asStateFlow()
    
    private val _eventDetailState = MutableStateFlow<EventDetailUiState>(EventDetailUiState.Loading)
    val eventDetailState: StateFlow<EventDetailUiState> = _eventDetailState.asStateFlow()

    private val _offersState = MutableStateFlow<OffersUiState>(OffersUiState.Loading)
    val offersState: StateFlow<OffersUiState> = _offersState.asStateFlow()

    val announcements: StateFlow<List<AnnouncementResponse>> = _offersState.map { state ->
        if (state is OffersUiState.Success) state.announcements else emptyList()
    }.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000),
        emptyList()
    )
    
    private val _selectedCategory = MutableStateFlow("all")
    val selectedCategory: StateFlow<String> = _selectedCategory.asStateFlow()

    private val _selectedCity = MutableStateFlow("महाराष्ट्र (All)")
    val selectedCity: StateFlow<String> = _selectedCity.asStateFlow()

    private val _cities = MutableStateFlow<List<CityCatalogItem>>(emptyList())
    val cities: StateFlow<List<CityCatalogItem>> = _cities.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()
    
    val isOnline: StateFlow<Boolean> = networkMonitor.isOnline
        .stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5000),
            networkMonitor.isCurrentlyOnline()
        )
    
    init {
        loadEvents()
        loadCities()
        loadOffers()
        
        // Auto-refresh when coming back online
        viewModelScope.launch {
            isOnline.collect { online ->
                if (online && (_eventsState.value is EventsUiState.Error || _eventsState.value is EventsUiState.Loading)) {
                    loadEvents()
                    loadOffers()
                }
            }
        }
    }
    
    fun loadEvents(
        category: String? = null,
        city: String? = null,
        search: String? = null
    ) {
        viewModelScope.launch {
            _eventsState.value = EventsUiState.Loading
            
            val activeCategory = category ?: _selectedCategory.value
            val activeCity = city ?: _selectedCity.value
            val activeSearch = search ?: _searchQuery.value.takeIf { it.isNotBlank() }
            
            val isCurrentlyOnline = networkMonitor.isCurrentlyOnline()
            val result = repository.getEvents(
                city = activeCity,
                category = activeCategory,
                search = activeSearch,
                isOnline = isCurrentlyOnline
            )
            
            _eventsState.value = result.fold(
                onSuccess = { events ->
                    if (_bannerEvents.value.isEmpty() && events.isNotEmpty()) {
                        val featuredList = events.filter {
                            (it.featured == 1 || it.category.equals("plays", true) || it.category.equals("natak", true) || it.category.equals("theatre", true)) &&
                            (!it.bannerUrl.isNullOrBlank() || !it.posterUrl.isNullOrBlank())
                        }
                        _bannerEvents.value = if (featuredList.isNotEmpty()) featuredList.take(6) else events.take(6)
                    }
                    EventsUiState.Success(events, isOfflineData = !isCurrentlyOnline)
                },
                onFailure = { error ->
                    EventsUiState.Error(
                        message = error.localizedMessage ?: "इव्हेंट्स लोड करता आले नाहीत. कृपया पुन्हा प्रयत्न करा."
                    )
                }
            )
        }
    }

    fun loadCities() {
        viewModelScope.launch {
            val result = repository.getCities()
            result.onSuccess {
                _cities.value = it
            }
        }
    }

    fun loadOffers() {
        viewModelScope.launch {
            _offersState.value = OffersUiState.Loading
            val couponsResult = repository.getCoupons()
            val announcementsResult = repository.getAnnouncements()
            
            val coupons = couponsResult.getOrDefault(emptyList())
            val announcements = announcementsResult.getOrDefault(emptyList())
            
            _offersState.value = OffersUiState.Success(coupons, announcements)
        }
    }
    
    fun selectCategory(category: String) {
        _selectedCategory.value = category
        loadEvents(category = if (category == "all" || category == "सर्व") null else category)
    }

    fun selectCity(city: String) {
        _selectedCity.value = city
        loadEvents(city = if (city == "महाराष्ट्र (All)" || city.contains("All")) null else city)
    }
    
    fun searchEvents(query: String) {
        _searchQuery.value = query
        loadEvents(search = query.takeIf { it.isNotBlank() })
    }
    
    fun loadEventDetails(eventId: Int) {
        viewModelScope.launch {
            _eventDetailState.value = EventDetailUiState.Loading
            
            val isCurrentlyOnline = networkMonitor.isCurrentlyOnline()
            val result = repository.getEventDetails(eventId, isCurrentlyOnline)
            
            _eventDetailState.value = result.fold(
                onSuccess = { event -> 
                    loadReviews(eventId)
                    EventDetailUiState.Success(event) 
                },
                onFailure = { error -> EventDetailUiState.Error(error.localizedMessage ?: "कार्यक्रमाची माहिती आढळली नाही") }
            )
        }
    }

    private val _reviewsResponse = MutableStateFlow<EventReviewsResponse?>(null)
    val reviewsResponse: StateFlow<EventReviewsResponse?> = _reviewsResponse.asStateFlow()

    fun loadReviews(eventId: Int) {
        viewModelScope.launch {
            val result = repository.getEventReviews(eventId)
            result.onSuccess {
                _reviewsResponse.value = it
            }
        }
    }

    fun submitReview(
        eventId: Int,
        rating: Int,
        comment: String,
        userName: String,
        userEmail: String,
        onSuccess: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        viewModelScope.launch {
            val result = repository.submitEventReview(eventId, rating, comment, userName, userEmail)
            result.fold(
                onSuccess = { res ->
                    loadReviews(eventId)
                    onSuccess(res.message ?: "आपले मत यशस्वीरीत्या नोंदवले गेले आहे!")
                },
                onFailure = { err ->
                    onError(err.message ?: "मत नोंदवण्यात अडचण आली")
                }
            )
        }
    }
}
