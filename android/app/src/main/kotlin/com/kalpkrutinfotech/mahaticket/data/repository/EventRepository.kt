package com.kalpkrutinfotech.mahaticket.data.repository

import com.kalpkrutinfotech.mahaticket.data.api.*
import com.kalpkrutinfotech.mahaticket.data.db.CachedCity
import com.kalpkrutinfotech.mahaticket.data.db.CachedEvent
import com.kalpkrutinfotech.mahaticket.data.db.MahaDatabase
import com.kalpkrutinfotech.mahaticket.model.EventItem
import com.kalpkrutinfotech.mahaticket.model.SessionItem
import com.kalpkrutinfotech.mahaticket.model.VenueItem
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
        isOnline: Boolean = true
    ): Result<List<EventItem>> = withContext(Dispatchers.IO) {
        try {
            if (isOnline) {
                val apiCity = if (city == "महाराष्ट्र (All)" || city == "all") null else city
                val apiCategory = if (category == "all" || category == "सर्व कार्यक्रम") null else category
                val response = apiService.getEvents(apiCity, apiCategory, search)
                
                if (response.isSuccessful && response.body() != null) {
                    val eventsList = response.body()?.events ?: emptyList()
                    
                    // Cache in Room
                    try {
                        val cachedEvents = eventsList.map { it.toCachedEvent() }
                        database.eventDao().insertEvents(cachedEvents)
                    } catch (e: Exception) {
                        // Caching failure shouldn't block network result
                    }
                    
                    Result.success(eventsList.map { it.toEventItem() })
                } else {
                    val errorMsg = response.body()?.error ?: "कार्यक्रमांची यादी लोड करण्यात त्रुटी (HTTP ${response.code()})"
                    Result.failure(Exception(errorMsg))
                }
            } else {
                // Live ticket booking system requires active internet for real-time inventory
                Result.failure(Exception("इंटरनेट कनेक्शन उपलब्ध नाही. थेट तिकीट बुकिंग आणि आसन स्थितीसाठी कृपया इंटरनेट सुरू करा."))
            }
        } catch (e: Exception) {
            Result.failure(Exception("इंटरनेट कनेक्शन उपलब्ध नाही. थेट तिकीट बुकिंगसाठी कृपया इंटरनेट सुरू करा."))
        }
    }
    
    suspend fun getEventDetails(eventId: Int, isOnline: Boolean = true): Result<EventItem> = 
        withContext(Dispatchers.IO) {
            try {
                if (isOnline) {
                    val response = apiService.getEventDetails(eventId)
                    if (response.isSuccessful && response.body()?.event != null) {
                        val event = response.body()!!.event!!
                        try {
                            database.eventDao().insertEvents(listOf(event.toCachedEvent()))
                        } catch (e: Exception) {}
                        Result.success(event.toEventItem())
                    } else {
                        Result.failure(Exception(response.body()?.error ?: "कार्यक्रम माहिती आढळली नाही"))
                    }
                } else {
                    Result.failure(Exception("थेट तिकीट आरक्षण आणि आसन स्थिती पाहण्यासाठी इंटरनेट कनेक्शन आवश्यक आहे."))
                }
            } catch (e: Exception) {
                Result.failure(Exception("इंटरनेट कनेक्शन उपलब्ध नाही. कृपया नेटवर्क तपासा."))
            }
        }

    suspend fun getCities(): Result<List<CityCatalogItem>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getCities()
            if (response.isSuccessful && response.body() != null) {
                val catalog = response.body()?.catalog ?: emptyList()
                Result.success(catalog)
            } else {
                Result.success(defaultCities())
            }
        } catch (e: Exception) {
            Result.success(defaultCities())
        }
    }

    suspend fun getCoupons(): Result<List<CouponResponse>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getCoupons()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()?.coupons ?: emptyList())
            } else {
                Result.failure(Exception("कूपन लोड करण्यात अयशस्वी"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getAnnouncements(city: String? = null): Result<List<AnnouncementResponse>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getAnnouncements(city)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()?.announcements ?: emptyList())
            } else {
                Result.failure(Exception("घोषणा लोड करण्यात अयशस्वी"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun defaultCities(): List<CityCatalogItem> = listOf(
        CityCatalogItem("Mumbai", "मुंबई"),
        CityCatalogItem("Pune", "पुणे"),
        CityCatalogItem("Nagpur", "नागपूर"),
        CityCatalogItem("Nashik", "नाशिक"),
        CityCatalogItem("Thane", "ठाणे"),
        CityCatalogItem("Kolhapur", "कोल्हापूर")
    )

    suspend fun getEventReviews(eventId: Int): Result<EventReviewsResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getEventReviews(eventId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("परीक्षणे लोड करता आली नाहीत."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun submitEventReview(
        eventId: Int,
        rating: Int,
        comment: String,
        userName: String,
        userEmail: String
    ): Result<SubmitReviewResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.submitEventReview(
                eventId = eventId,
                request = SubmitReviewRequest(
                    rating = rating,
                    comment = comment
                )
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorBody = response.errorBody()?.string() ?: ""
                val msg = if (errorBody.contains("already reviewed", ignoreCase = true) || response.code() == 409) {
                    "आपण या कार्यक्रमासाठी आधीच मत नोंदवले आहे."
                } else if (response.code() == 401) {
                    "मत नोंदवण्यासाठी कृपया आधी लॉगिन करा."
                } else {
                    "मत नोंदवण्यात त्रुटी आली. कृपया पुन्हा प्रयत्न करा."
                }
                Result.failure(Exception(msg))
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
    titleMr = titleMr ?: title,
    category = category,
    categoryMr = categoryMr ?: category,
    language = language ?: "मराठी",
    durationMinutes = durationMinutes ?: 120,
    description = description ?: "",
    posterUrl = posterUrl ?: "",
    minPrice = minPrice,
    venueName = venue?.name,
    venueNameMr = venue?.nameMr,
    city = venue?.city
)

fun EventResponse.toEventItem() = EventItem(
    id = id,
    title = title,
    titleMr = titleMr ?: title,
    category = category,
    categoryMr = categoryMr ?: category,
    language = language ?: "मराठी",
    durationMinutes = durationMinutes ?: 120,
    description = description ?: "",
    descriptionMr = descriptionMr ?: description ?: "",
    ageGuidance = ageGuidance ?: "U/A (सर्व वयोगटांसाठी)",
    cast = cast ?: "प्रसाद ओक, मुक्ता बर्वे, क्षिती जोग",
    director = director ?: "चंद्रकांत कुलकर्णी",
    posterUrl = posterUrl ?: "",
    bannerUrl = bannerUrl,
    minPrice = minPrice,
    featured = featured,
    venue = venue?.let {
        VenueItem(it.id, it.name, it.nameMr ?: it.name, it.address ?: "", it.city ?: "महाराष्ट्र")
    },
    sessions = sessions?.map {
        SessionItem(it.id, it.eventId, it.sessionStartTime, it.sessionEndTime ?: "", it.status)
    },
    trailerUrl = trailerUrl,
    galleryUrls = galleryUrls,
    rating = rating,
    ratingCount = ratingCount
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
