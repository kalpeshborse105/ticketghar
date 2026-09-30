package com.kalpkrutinfotech.mahaticket

import android.app.Application
import com.kalpkrutinfotech.mahaticket.data.api.RetrofitClient
import com.kalpkrutinfotech.mahaticket.data.db.MahaDatabase
import com.kalpkrutinfotech.mahaticket.data.repository.BookingRepository
import com.kalpkrutinfotech.mahaticket.data.repository.EventRepository
import com.kalpkrutinfotech.mahaticket.util.NetworkMonitor

class MahaTicketApp : Application() {
    
    lateinit var database: MahaDatabase
        private set
    
    lateinit var eventRepository: EventRepository
        private set
    
    lateinit var bookingRepository: BookingRepository
        private set
    
    lateinit var networkMonitor: NetworkMonitor
        private set
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize database
        database = MahaDatabase.getDatabase(this)
        
        // Initialize network monitor
        networkMonitor = NetworkMonitor(this)
        
        // Initialize repositories
        val apiService = RetrofitClient.apiService
        eventRepository = EventRepository(apiService, database)
        bookingRepository = BookingRepository(apiService, database)
    }
}
