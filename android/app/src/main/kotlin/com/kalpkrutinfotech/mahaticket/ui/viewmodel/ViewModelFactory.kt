package com.kalpkrutinfotech.mahaticket.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.kalpkrutinfotech.mahaticket.data.repository.BookingRepository
import com.kalpkrutinfotech.mahaticket.data.repository.EventRepository
import com.kalpkrutinfotech.mahaticket.util.NetworkMonitor

class EventViewModelFactory(
    private val repository: EventRepository,
    private val networkMonitor: NetworkMonitor
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(EventViewModel::class.java)) {
            return EventViewModel(repository, networkMonitor) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}

class BookingViewModelFactory(
    private val repository: BookingRepository,
    private val networkMonitor: NetworkMonitor
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(BookingViewModel::class.java)) {
            return BookingViewModel(repository, networkMonitor) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
