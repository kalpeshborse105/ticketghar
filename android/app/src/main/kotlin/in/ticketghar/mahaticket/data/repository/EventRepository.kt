package `in`.ticketghar.mahaticket.data.repository

import `in`.ticketghar.mahaticket.data.api.*
import `in`.ticketghar.mahaticket.data.db.CachedEvent
import `in`.ticketghar.mahaticket.data.db.MahaDatabase
import `in`.ticketghar.mahaticket.model.EventItem
import `in`.ticketghar.mahaticket.model.SessionItem
import `in`.ticketghar.mahaticket.model.VenueItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class EventRepository(
    private val apiService: MahaTicketApiService,
    private val database: MahaDatabase
) {
    
    suspend fun getEvents(
        city: String? = null,
        category: String? = null,
        search: String? = null,
        isOnline: Boolean
    ): Result<List<EventItem>> = withContext(Dispatchers.IO) {
        try {
            if (isOnline) {
                val response = apiService.getEvents(city, category, search)
                if (response.isSuccessful && response.body()?.success == true) {
                    val events = response.body()?.data ?: emptyList()
                    
                    // Cache events in Room
                    val cachedEvents = events.map { it.toCachedEvent() }
                    database.eventDao().insertEvents(cachedEvents)
                    
                    Result.success(events.map { it.toEventItem() })
                } else {
                    Result.failure(Exception(response.body()?.error ?: "Failed to fetch events"))
                }
            } else {
                // Offline mode - return cached events
                val cachedEvents = if (category != null && category != "all") {
                    database.eventDao().getCachedEventsByCategory(category)
                } else {
                    database.eventDao().getAllCachedEvents()
                }
                Result.success(cachedEvents.map { it.toEventItem() })
            }
        } catch (e: Exception) {
            // Network error - fallback to cache
            try {
                val cachedEvents = database.eventDao().getAllCachedEvents()
                if (cachedEvents.isNotEmpty()) {
                    Result.success(cachedEvents.map { it.toEventItem() })
                } else {
                    Result.failure(e)
                }
            } catch (cacheError: Exception) {
                Result.failure(e)
            }
        }
    }
    
    suspend fun getEventDetails(eventId: Int, isOnline: Boolean): Result<EventItem> = 
        withContext(Dispatchers.IO) {
            try {
                if (isOnline) {
                    val response = apiService.getEventDetails(eventId)
                    if (response.isSuccessful && response.body()?.success == true) {
                        val event = response.body()?.data
                        if (event != null) {
                            database.eventDao().insertEvents(listOf(event.toCachedEvent()))
                            Result.success(event.toEventItem())
                        } else {
                            Result.failure(Exception("Event not found"))
                        }
                    } else {
                        Result.failure(Exception(response.body()?.error ?: "Failed to fetch event"))
                    }
                } else {
                    val cachedEvents = database.eventDao().getAllCachedEvents()
                    val cachedEvent = cachedEvents.find { it.id == eventId }
                    if (cachedEvent != null) {
                        Result.success(cachedEvent.toEventItem())
                    } else {
                        Result.failure(Exception("Event not available offline"))
                    }
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
}

// Mapper extensions
fun EventResponse.toCachedEvent() = CachedEvent(
    id = id,
    title = title,
    titleMr = titleMr,
    category = category,
    categoryMr = categoryMr,
    language = language,
    durationMinutes = durationMinutes,
    description = description,
    posterUrl = posterUrl,
    minPrice = minPrice,
    venueName = venue?.name,
    venueNameMr = venue?.nameMr,
    city = venue?.city
)

fun EventResponse.toEventItem() = EventItem(
    id = id,
    title = title,
    titleMr = titleMr,
    category = category,
    categoryMr = categoryMr,
    language = language,
    durationMinutes = durationMinutes,
    description = description,
    posterUrl = posterUrl,
    minPrice = minPrice,
    venue = venue?.let {
        VenueItem(it.id, it.name, it.nameMr, it.address, it.city)
    },
    sessions = sessions?.map {
        SessionItem(it.id, it.eventId, it.sessionStartTime, it.sessionEndTime, it.status)
    }
)

fun CachedEvent.toEventItem() = EventItem(
    id = id,
    title = title,
    titleMr = titleMr,
    category = category,
    categoryMr = categoryMr,
    language = language,
    durationMinutes = durationMinutes,
    description = description,
    posterUrl = posterUrl,
    minPrice = minPrice,
    venue = if (venueName != null) {
        VenueItem(0, venueName, venueNameMr ?: venueName, "", city ?: "")
    } else null,
    sessions = null
)
