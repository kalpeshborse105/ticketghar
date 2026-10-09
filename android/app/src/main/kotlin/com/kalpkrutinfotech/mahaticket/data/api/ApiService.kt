package com.kalpkrutinfotech.mahaticket.data.api

import com.google.gson.annotations.SerializedName
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

    @POST("/api/scanner/verify")
    suspend fun verifyTicketScan(
        @Body request: VerifyScanRequest
    ): Response<VerifyScanResponse>
    
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

    @POST("/api/tikitmitra/chat")
    suspend fun chatWithTikitMitra(
        @Body request: TikitMitraChatRequest
    ): Response<TikitMitraChatResponse>

    @POST("/api/payments/create-order")
    suspend fun createPaymentOrder(
        @Body request: CreatePaymentOrderRequest
    ): Response<CreatePaymentOrderResponse>

    @POST("/api/auth/flow/send-otp")
    suspend fun sendOtp(
        @Body request: SendOtpRequest
    ): Response<SendOtpResponse>

    @POST("/api/auth/flow/verify-otp")
    suspend fun verifyOtp(
        @Body request: VerifyOtpRequest
    ): Response<AuthFlowResponse>

    @POST("/api/auth/flow/login-password")
    suspend fun loginWithPassword(
        @Body request: LoginPasswordRequest
    ): Response<AuthFlowResponse>

    @GET("/api/announcements")
    suspend fun getAnnouncements(
        @Query("city") city: String? = null
    ): Response<AnnouncementsResponse>
    
    @POST("/api/notifications/register-token")
    suspend fun registerFcmToken(
        @Body request: RegisterTokenRequest
    ): Response<Unit>

    @POST("/api/bookings/release")
    suspend fun releaseSeats(
        @Body request: ReleaseSeatsRequest
    ): Response<ReleaseSeatsResponse>

    @GET("/api/events/{id}/reviews")
    suspend fun getEventReviews(
        @Path("id") eventId: Int
    ): Response<EventReviewsResponse>

    @POST("/api/events/{id}/reviews")
    suspend fun submitEventReview(
        @Path("id") eventId: Int,
        @Body request: SubmitReviewRequest
    ): Response<SubmitReviewResponse>
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
    val trailerUrl: String? = null,
    val galleryUrls: List<String>? = null,
    val minPrice: Int? = null,
    val featured: Int? = null,
    val ageGuidance: String? = null,
    val cast: String? = null,
    val director: String? = null,
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
    @SerializedName("holdToken")
    val rootHoldToken: String? = null,
    val pricing: PricingData? = null,
    val error: String? = null
) {
    val holdToken: String? get() = rootHoldToken?.takeIf { it.isNotBlank() } ?: hold?.holdToken
}

data class HoldResultData(
    val holdToken: String? = null,
    val expiresAt: String? = null,
    val seatCount: Int = 0,
    @SerializedName("ticketFaceValueTotal", alternate = ["faceValueTotal"])
    val faceValueTotal: Int = 0
)

data class PricingData(
    @SerializedName("ticketFaceValueTotal", alternate = ["faceValueTotal"])
    val faceValueTotal: Int = 0,
    @SerializedName("platformFeeTotal", alternate = ["convenienceFee"])
    val convenienceFee: Int = 0,
    @SerializedName("taxTotal", alternate = ["gst"])
    val gst: Int = 0,
    @SerializedName("discountTotal", alternate = ["discount"])
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

data class VerifyScanRequest(
    val ticketCodeOrPayload: String,
    val gateName: String = "Main Gate 1",
    val scannerUserId: String? = null,
    val scannerDevice: String = "Android CameraX Scanner"
)

data class VerifyScanResponse(
    val valid: Boolean = false,
    val scanResult: String = "INVALID_TICKET",
    val message: String = "",
    val ticketCode: String? = null,
    val alreadyScannedAt: String? = null,
    val previousGate: String? = null,
    val ticket: ScannedTicketDetails? = null,
    val scannedAt: String? = null,
    val error: String? = null
)

data class ScannedTicketDetails(
    val code: String? = null,
    val seat: String? = null,
    val attendee: String? = null,
    val event: String? = null,
    val eventMr: String? = null,
    val showtime: String? = null
)

data class CreatePaymentOrderRequest(
    val sessionId: Int,
    val seatIds: List<Int>,
    val couponCode: String? = null
)

data class CreatePaymentOrderResponse(
    val orderId: String? = null,
    val amount: Int = 0,
    val currency: String = "INR",
    val keyId: String? = null,
    val receipt: String? = null,
    val pricing: PricingData? = null,
    val error: String? = null
)

data class SendOtpRequest(
    val email: String
)

data class SendOtpResponse(
    val success: Boolean = false,
    val message: String? = null,
    val devOtp: String? = null,
    val emailSent: Boolean? = null,
    val error: String? = null
)

data class VerifyOtpRequest(
    val email: String,
    val otp: String
)

data class LoginPasswordRequest(
    val email: String,
    val password: String
)

data class AuthFlowResponse(
    val success: Boolean = false,
    val message: String? = null,
    val user: AuthUserData? = null,
    val needsPasswordSetup: Boolean = false,
    val needsOtp: Boolean = false,
    val error: String? = null
)

data class AuthUserData(
    val id: Int? = null,
    val uid: String? = null,
    val email: String? = null,
    val fullName: String? = null,
    val phoneNumber: String? = null,
    val role: String? = null
)

data class TikitMitraChatRequest(
    @SerializedName("message") val message: String,
    @SerializedName("language") val language: String = "mr"
)

data class TikitMitraAction(
    @SerializedName("type") val type: String,
    @SerializedName("label") val label: String,
    @SerializedName("payload") val payload: Map<String, Any>? = null
)

data class TikitMitraChatResponse(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("reply") val reply: String = "",
    @SerializedName("action") val action: TikitMitraAction? = null,
    @SerializedName("source") val source: String? = null,
    @SerializedName("error") val error: String? = null
)

data class ReleaseSeatsRequest(
    val sessionId: Int,
    val holdToken: String,
    val seatIds: List<Int>? = null
)

data class ReleaseSeatsResponse(
    val success: Boolean = false,
    val message: String? = null,
    val releasedCount: Int = 0,
    val error: String? = null
)

data class EventReviewsResponse(
    val reviews: List<ReviewItemResponse>? = null,
    val totalCount: Int = 0,
    val averageRating: Double = 4.8,
    val breakdown: ReviewBreakdownResponse? = null,
    val hasUserReviewed: Boolean = false,
    val error: String? = null
)

data class ReviewBreakdownResponse(
    val five: Int = 88,
    val four: Int = 9,
    val three: Int = 2,
    val two: Int = 1,
    val one: Int = 0
)

data class ReviewItemResponse(
    val id: Int,
    val author: String,
    val email: String? = null,
    val city: String? = null,
    val rating: Int = 5,
    val date: String? = null,
    val comment: String,
    val verified: Boolean = false
)

data class SubmitReviewRequest(
    val rating: Int,
    val comment: String,
    val city: String? = null
)

data class SubmitReviewResponse(
    val success: Boolean = false,
    val message: String? = null,
    val error: String? = null
)

