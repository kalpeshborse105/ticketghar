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

    lateinit var sessionManager: com.kalpkrutinfotech.mahaticket.util.UserSessionManager
        private set

    lateinit var authRepository: com.kalpkrutinfotech.mahaticket.data.repository.AuthRepository
        private set
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize database
        database = MahaDatabase.getDatabase(this)
        
        // Initialize network monitor
        networkMonitor = NetworkMonitor(this)

        // Initialize user session
        sessionManager = com.kalpkrutinfotech.mahaticket.util.UserSessionManager.getInstance(this)
        RetrofitClient.init(sessionManager)
        
        // Initialize repositories
        val apiService = RetrofitClient.apiService
        eventRepository = EventRepository(apiService, database)
        bookingRepository = BookingRepository(apiService, database)
        authRepository = com.kalpkrutinfotech.mahaticket.data.repository.AuthRepository(apiService, sessionManager)
    }
}
