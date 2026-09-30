package `in`.ticketghar.mahaticket.data.api

import retrofit2.Response
import retrofit2.http.*

interface MahaTicketApiService {
    
    @GET("/api/events")
    suspend fun getEvents(
        @Query("city") city: String? = null,
        @Query("category") category: String? = null,
        @Query("search") search: String? = null
    ): Response<ApiResponse<List<EventResponse>>>
    
    @GET("/api/events/{id}")
    suspend fun getEventDetails(
        @Path("id") eventId: Int
    ): Response<ApiResponse<EventResponse>>
    
    @GET("/api/cities")
    suspend fun getCities(): Response<ApiResponse<List<CityResponse>>>
    
    @GET("/api/sessions/{id}/seats")
    suspend fun getSessionSeats(
        @Path("id") sessionId: Int
    ): Response<ApiResponse<SeatsLayoutResponse>>
    
    @POST("/api/bookings/hold")
    suspend fun holdSeats(
        @Body request: HoldSeatsRequest
    ): Response<ApiResponse<HoldSeatsResponse>>
    
    @POST("/api/bookings/confirm")
    suspend fun confirmBooking(
        @Body request: ConfirmBookingRequest
    ): Response<ApiResponse<BookingConfirmationResponse>>
    
    @GET("/api/orders")
    suspend fun getMyOrders(
        @Query("phone") phone: String
    ): Response<ApiResponse<List<OrderResponse>>>
    
    @GET("/api/orders/{orderNumber}")
    suspend fun getOrderDetails(
        @Path("orderNumber") orderNumber: String
    ): Response<ApiResponse<OrderResponse>>
    
    @GET("/api/coupons/validate")
    suspend fun validateCoupon(
        @Query("code") couponCode: String,
        @Query("totalAmount") totalAmount: Int
    ): Response<ApiResponse<CouponValidationResponse>>
    
    @POST("/api/notifications/register-token")
    suspend fun registerFcmToken(
        @Body request: RegisterTokenRequest
    ): Response<ApiResponse<Unit>>
}

// API Response wrapper
data class ApiResponse<T>(
    val success: Boolean,
    val data: T?,
    val error: String?
)

// Request/Response DTOs
data class EventResponse(
    val id: Int,
    val title: String,
    val titleMr: String,
    val category: String,
    val categoryMr: String,
    val language: String,
    val durationMinutes: Int,
    val description: String,
    val posterUrl: String,
    val minPrice: Int?,
    val venue: VenueResponse?,
    val sessions: List<SessionResponse>?
)

data class VenueResponse(
    val id: Int,
    val name: String,
    val nameMr: String,
    val address: String,
    val city: String
)

data class SessionResponse(
    val id: Int,
    val eventId: Int,
    val sessionStartTime: String,
    val sessionEndTime: String,
    val status: String
)

data class CityResponse(
    val id: Int,
    val cityName: String,
    val cityNameMr: String
)

data class SeatsLayoutResponse(
    val sessionId: Int,
    val sections: List<SectionResponse>
)

data class SectionResponse(
    val sectionId: Int,
    val sectionName: String,
    val seats: List<SeatResponse>
)

data class SeatResponse(
    val seatId: Int,
    val sectionId: Int,
    val rowLabel: String,
    val seatNumber: Int,
    val seatCode: String,
    val price: Int,
    val status: String,
    val isAccessible: Boolean
)

data class HoldSeatsRequest(
    val sessionId: Int,
    val seatIds: List<Int>,
    val phoneNumber: String
)

data class HoldSeatsResponse(
    val holdToken: String,
    val expiresAt: String,
    val seats: List<SeatResponse>
)

data class ConfirmBookingRequest(
    val holdToken: String,
    val phoneNumber: String,
    val email: String?,
    val attendeeNames: Map<String, String>, // seatId -> name
    val razorpayPaymentId: String,
    val razorpaySignature: String
)

data class BookingConfirmationResponse(
    val orderNumber: String,
    val tickets: List<TicketResponse>,
    val grandTotal: Int
)

data class TicketResponse(
    val ticketCode: String,
    val seatCode: String,
    val qrPayload: String,
    val attendeeName: String,
    val status: String
)

data class OrderResponse(
    val orderNumber: String,
    val eventTitle: String,
    val venueName: String,
    val showtime: String,
    val grandTotal: Int,
    val status: String,
    val tickets: List<TicketResponse>
)

data class CouponValidationResponse(
    val valid: Boolean,
    val discountAmount: Int,
    val message: String?
)

data class RegisterTokenRequest(
    val token: String,
    val userId: String? = null,
    val platform: String = "android",
    val appVersion: String? = null
)
