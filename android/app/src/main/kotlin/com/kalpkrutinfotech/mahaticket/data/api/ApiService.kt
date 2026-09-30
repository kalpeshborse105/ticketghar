package com.kalpkrutinfotech.mahaticket.data.api

import retrofit2.Response
import retrofit2.http.*

interface MahaTicketApiService {
    
    @GET("/api/events")
    suspend fun getEvents(
        @Query("city") city: String? = null,
        @Query("category") category: String? = null,
        @Query("search") search: String? = null
    ): Response<EventsListResponse>
    
    @GET("/api/events/{id}")
    suspend fun getEventDetails(
        @Path("id") eventId: Int
    ): Response<EventDetailResponse>
    
    @GET("/api/cities")
    suspend fun getCities(): Response<CitiesResponse>
    
    @GET("/api/sessions/{id}/seats")
    suspend fun getSessionSeats(
        @Path("id") sessionId: Int
    ): Response<SeatsLayoutResponse>
    
    @POST("/api/bookings/hold")
    suspend fun holdSeats(
        @Body request: HoldSeatsRequest
    ): Response<HoldSeatsResponse>
    
    @POST("/api/bookings/confirm")
    suspend fun confirmBooking(
        @Body request: ConfirmBookingRequest
    ): Response<BookingConfirmationResponse>
    
    @GET("/api/orders")
    suspend fun getMyOrders(
        @Query("phone") phone: String
    ): Response<OrdersListResponse>
    
    @GET("/api/orders")
    suspend fun getOrderDetails(
        @Query("orderNumber") orderNumber: String
    ): Response<OrdersListResponse>
    
    @GET("/api/coupons")
    suspend fun getCoupons(): Response<CouponsResponse>

    @POST("/api/coupons")
    suspend fun validateCoupon(
        @Body request: ValidateCouponRequest
    ): Response<CouponValidationResponse>

    @GET("/api/announcements")
    suspend fun getAnnouncements(
        @Query("city") city: String? = null
    ): Response<AnnouncementsResponse>
    
    @POST("/api/notifications/register-token")
    suspend fun registerFcmToken(
        @Body request: RegisterTokenRequest
    ): Response<Unit>
}

// Request & Response DTOs matching Next.js API endpoints

data class EventsListResponse(
    val events: List<EventResponse>? = null,
    val error: String? = null
)

data class EventDetailResponse(
    val event: EventResponse? = null,
    val error: String? = null
)

data class EventResponse(
    val id: Int,
    val title: String,
    val titleMr: String? = null,
    val category: String,
    val categoryMr: String? = null,
    val language: String? = null,
    val durationMinutes: Int? = null,
    val description: String? = null,
    val descriptionMr: String? = null,
    val posterUrl: String? = null,
    val bannerUrl: String? = null,
    val minPrice: Int? = null,
    val featured: Int? = null,
    val venue: VenueResponse? = null,
    val sessions: List<SessionResponse>? = null
)

data class VenueResponse(
    val id: Int,
    val name: String,
    val nameMr: String? = null,
    val address: String? = null,
    val city: String? = null
)

data class SessionResponse(
    val id: Int,
    val eventId: Int,
    val sessionStartTime: String,
    val sessionEndTime: String? = null,
    val status: String = "active"
)

data class CitiesResponse(
    val cities: List<String>? = null,
    val catalog: List<CityCatalogItem>? = null,
    val error: String? = null
)

data class CityCatalogItem(
    val name: String,
    val nameMr: String? = null
)

data class SeatsLayoutResponse(
    val sessionId: Int? = null,
    val session: SessionResponse? = null,
    val event: EventResponse? = null,
    val venue: VenueResponse? = null,
    val sections: List<SectionResponse>? = null,
    val seats: List<SeatInventoryResponse>? = null,
    val ticketTypes: List<TicketTypeResponse>? = null,
    val error: String? = null
)

data class SectionResponse(
    val id: Int,
    val name: String,
    val nameMr: String? = null,
    val capacity: Int? = null
)

data class SeatInventoryResponse(
    val inventoryId: Int? = null,
    val seatId: Int,
    val sectionId: Int,
    val rowLabel: String,
    val seatNumber: Int,
    val seatCode: String,
    val tier: String? = null,
    val price: Int = 30000,
    val status: String = "available",
    val isAccessible: Int? = null,
    val heldByUserId: String? = null
)

data class TicketTypeResponse(
    val id: Int,
    val name: String,
    val nameMr: String? = null,
    val price: Int,
    val totalQuota: Int? = null,
    val availableQuota: Int? = null
)

data class HoldSeatsRequest(
    val sessionId: Int,
    val seatIds: List<Int>,
    val userIdStr: String? = null,
    val couponCode: String? = null
)

data class HoldSeatsResponse(
    val success: Boolean = false,
    val hold: HoldResultData? = null,
    val pricing: PricingData? = null,
    val error: String? = null
) {
    val holdToken: String? get() = hold?.holdToken
}

data class HoldResultData(
    val holdToken: String? = null,
    val expiresAt: String? = null,
    val seatCount: Int = 0,
    val faceValueTotal: Int = 0
)

data class PricingData(
    val faceValueTotal: Int = 0,
    val convenienceFee: Int = 0,
    val gst: Int = 0,
    val discount: Int = 0,
    val grandTotal: Int = 0
)

data class ConfirmBookingRequest(
    val sessionId: Int,
    val eventId: Int,
    val seatIds: List<Int>,
    val userName: String,
    val userEmail: String,
    val userPhone: String,
    val couponCode: String? = null,
    val paymentDetails: PaymentDetailsRequest? = null
)

data class PaymentDetailsRequest(
    val gateway: String = "direct_confirm",
    val paymentId: String? = null,
    val orderId: String? = null,
    val signature: String? = null
)

data class BookingConfirmationResponse(
    val success: Boolean = false,
    val order: OrderDataResponse? = null,
    val tickets: List<TicketResponse>? = null,
    val error: String? = null
)

data class OrderDataResponse(
    val id: Int? = null,
    val orderNumber: String,
    val grandTotal: Int,
    val status: String = "confirmed",
    val createdAt: String? = null
)

data class TicketResponse(
    val id: Int? = null,
    val ticketCode: String,
    val seatCode: String,
    val qrPayload: String? = null,
    val qrDataUrl: String? = null,
    val attendeeName: String? = null,
    val status: String = "valid"
)

data class OrdersListResponse(
    val orders: List<OrderResponse>? = null,
    val error: String? = null
)

data class OrderResponse(
    val id: Int? = null,
    val orderNumber: String,
    val grandTotal: Int,
    val status: String,
    val event: EventResponse? = null,
    val venue: VenueResponse? = null,
    val session: SessionResponse? = null,
    val tickets: List<TicketResponse>? = null,
    val createdAt: String? = null
)

data class CouponsResponse(
    val coupons: List<CouponResponse>? = null,
    val error: String? = null
)

data class CouponResponse(
    val id: Int,
    val code: String,
    val discountType: String = "percentage",
    val discountValue: Int = 0,
    val minOrderValue: Int = 0,
    val maxDiscount: Int = 10000,
    val active: Int = 1
)

data class ValidateCouponRequest(
    val code: String,
    val amount: Int
)

data class CouponValidationResponse(
    val valid: Boolean = false,
    val code: String? = null,
    val discount: Int = 0,
    val discountFormatted: String? = null,
    val message: String? = null,
    val error: String? = null
)

data class AnnouncementsResponse(
    val announcements: List<AnnouncementResponse>? = null,
    val error: String? = null
)

data class AnnouncementResponse(
    val id: Int,
    val title: String,
    val message: String,
    val imageUrl: String? = null,
    val ctaLabel: String? = null,
    val ctaUrl: String? = null,
    val city: String? = null,
    val category: String? = null
)

data class RegisterTokenRequest(
    val token: String,
    val userId: String? = null,
    val platform: String = "android",
    val city: String? = null,
    val deviceModel: String? = null
)
