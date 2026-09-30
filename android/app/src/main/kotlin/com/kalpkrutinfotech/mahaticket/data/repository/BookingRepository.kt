package com.kalpkrutinfotech.mahaticket.data.repository

import com.kalpkrutinfotech.mahaticket.data.api.*
import com.kalpkrutinfotech.mahaticket.data.db.CachedTicket
import com.kalpkrutinfotech.mahaticket.data.db.MahaDatabase
import com.kalpkrutinfotech.mahaticket.model.BookingOrder
import com.kalpkrutinfotech.mahaticket.model.SeatItem
import com.kalpkrutinfotech.mahaticket.model.TicketItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class BookingRepository(
    private val apiService: MahaTicketApiService,
    private val database: MahaDatabase
) {
    
    suspend fun getSessionSeats(sessionId: Int): Result<List<SeatItem>> = 
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.getSessionSeats(sessionId)
                if (response.isSuccessful && response.body() != null) {
                    val seatsList = response.body()?.seats ?: emptyList()
                    val seatItems = seatsList.map { seat ->
                        SeatItem(
                            seatId = seat.seatId,
                            sectionId = seat.sectionId,
                            rowLabel = seat.rowLabel,
                            seatNumber = seat.seatNumber,
                            seatCode = seat.seatCode,
                            price = seat.price,
                            status = seat.status,
                            isAccessible = (seat.isAccessible ?: 0) == 1
                        )
                    }
                    Result.success(seatItems)
                } else {
                    val err = response.body()?.error ?: "आसने लोड करण्यात अयशस्वी (HTTP ${response.code()})"
                    Result.failure(Exception(err))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    
    suspend fun holdSeats(
        sessionId: Int,
        seatIds: List<Int>,
        phoneNumber: String,
        couponCode: String? = null
    ): Result<HoldSeatsResponse> = withContext(Dispatchers.IO) {
        try {
            val request = HoldSeatsRequest(
                sessionId = sessionId,
                seatIds = seatIds,
                userIdStr = phoneNumber,
                couponCode = couponCode
            )
            val response = apiService.holdSeats(request)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.success && body.hold != null) {
                    Result.success(body)
                } else {
                    Result.failure(Exception(body.error ?: "सीट होल्ड करण्यात त्रुटी"))
                }
            } else {
                Result.failure(Exception("सीट होल्ड विनंती अयशस्वी (HTTP ${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun confirmBooking(
        sessionId: Int,
        eventId: Int,
        seatIds: List<Int>,
        userName: String,
        userEmail: String,
        userPhone: String,
        couponCode: String? = null,
        paymentId: String? = null
    ): Result<BookingConfirmationResponse> = withContext(Dispatchers.IO) {
        try {
            val request = ConfirmBookingRequest(
                sessionId = sessionId,
                eventId = eventId,
                seatIds = seatIds,
                userName = userName,
                userEmail = userEmail,
                userPhone = userPhone,
                couponCode = couponCode,
                paymentDetails = PaymentDetailsRequest(
                    gateway = if (paymentId != null) "razorpay" else "direct_confirm",
                    paymentId = paymentId
                )
            )
            val response = apiService.confirmBooking(request)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.success && body.order != null) {
                    // Cache confirmed tickets
                    try {
                        val cachedTickets = body.tickets?.map { tk ->
                            CachedTicket(
                                ticketCode = tk.ticketCode,
                                orderNumber = body.order?.orderNumber ?: "ORD",
                                eventTitle = "Confirmed Booking",
                                venueName = "Maharashtra Venue",
                                showtime = "",
                                seatCode = tk.seatCode,
                                qrPayload = tk.qrPayload ?: tk.ticketCode,
                                attendeeName = tk.attendeeName ?: userName,
                                status = tk.status,
                                grandTotal = body.order?.grandTotal ?: 0
                            )
                        } ?: emptyList()
                        database.ticketDao().insertTickets(cachedTickets)
                    } catch (e: Exception) {}
                    
                    Result.success(body)
                } else {
                    Result.failure(Exception(body.error ?: "बुकिंग निश्चित करण्यात अयशस्वी"))
                }
            } else {
                Result.failure(Exception("बुकिंग विनंती अयशस्वी (HTTP ${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getMyOrders(phone: String): Result<List<BookingOrder>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getMyOrders(phone)
            if (response.isSuccessful && response.body() != null) {
                val orderList = response.body()?.orders ?: emptyList()
                val mapped = orderList.map { ord ->
                    BookingOrder(
                        orderNumber = ord.orderNumber,
                        grandTotal = ord.grandTotal,
                        tickets = ord.tickets?.map { tk ->
                            TicketItem(
                                ticketCode = tk.ticketCode,
                                seatCode = tk.seatCode,
                                qrPayload = tk.qrPayload ?: tk.ticketCode,
                                attendeeName = tk.attendeeName ?: "",
                                status = tk.status
                            )
                        } ?: emptyList(),
                        eventTitle = ord.event?.titleMr ?: ord.event?.title ?: "MahaTicket Event",
                        venueName = ord.venue?.nameMr ?: ord.venue?.name ?: "Venue",
                        showtime = ord.session?.sessionStartTime ?: ""
                    )
                }
                Result.success(mapped)
            } else {
                Result.failure(Exception("तिकीट शोधण्यात त्रुटी"))
            }
        } catch (e: Exception) {
            // Offline fallback
            try {
                val cached = database.ticketDao().getAllTickets()
                if (cached.isNotEmpty()) {
                    val grouped = BookingOrder(
                        orderNumber = cached.first().orderNumber,
                        grandTotal = cached.first().grandTotal,
                        tickets = cached.map {
                            TicketItem(it.ticketCode, it.seatCode, it.qrPayload, it.attendeeName, it.status)
                        },
                        eventTitle = cached.first().eventTitle,
                        venueName = cached.first().venueName,
                        showtime = cached.first().showtime
                    )
                    Result.success(listOf(grouped))
                } else {
                    Result.failure(e)
                }
            } catch (err: Exception) {
                Result.failure(e)
            }
        }
    }
}
