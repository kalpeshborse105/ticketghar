package `in`.ticketghar.mahaticket.data.repository

import `in`.ticketghar.mahaticket.data.api.*
import `in`.ticketghar.mahaticket.data.db.CachedTicket
import `in`.ticketghar.mahaticket.data.db.MahaDatabase
import `in`.ticketghar.mahaticket.model.BookingOrder
import `in`.ticketghar.mahaticket.model.SeatItem
import `in`.ticketghar.mahaticket.model.TicketItem
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
                if (response.isSuccessful && response.body()?.success == true) {
                    val seatsLayout = response.body()?.data
                    val allSeats = seatsLayout?.sections?.flatMap { section ->
                        section.seats.map { seat ->
                            SeatItem(
                                seatId = seat.seatId,
                                sectionId = seat.sectionId,
                                rowLabel = seat.rowLabel,
                                seatNumber = seat.seatNumber,
                                seatCode = seat.seatCode,
                                price = seat.price,
                                status = seat.status,
                                isAccessible = seat.isAccessible
                            )
                        }
                    } ?: emptyList()
                    Result.success(allSeats)
                } else {
                    Result.failure(Exception(response.body()?.error ?: "Failed to fetch seats"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    
    suspend fun holdSeats(
        sessionId: Int,
        seatIds: List<Int>,
        phoneNumber: String
    ): Result<HoldSeatsResponse> = withContext(Dispatchers.IO) {
        try {
            val request = HoldSeatsRequest(sessionId, seatIds, phoneNumber)
            val response = apiService.holdSeats(request)
            if (response.isSuccessful && response.body()?.success == true) {
                val holdResponse = response.body()?.data
                if (holdResponse != null) {
                    Result.success(holdResponse)
                } else {
                    Result.failure(Exception("Failed to hold seats"))
                }
            } else {
                Result.failure(Exception(response.body()?.error ?: "Failed to hold seats"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun confirmBooking(
        holdToken: String,
        phoneNumber: String,
        email: String?,
        attendeeNames: Map<String, String>,
        razorpayPaymentId: String,
        razorpaySignature: String
    ): Result<BookingOrder> = withContext(Dispatchers.IO) {
        try {
            val request = ConfirmBookingRequest(
                holdToken = holdToken,
                phoneNumber = phoneNumber,
                email = email,
                attendeeNames = attendeeNames,
                razorpayPaymentId = razorpayPaymentId,
                razorpaySignature = razorpaySignature
            )
            val response = apiService.confirmBooking(request)
            if (response.isSuccessful && response.body()?.success == true) {
                val confirmation = response.body()?.data
                if (confirmation != null) {
                    // Cache tickets locally for offline viewing
                    val cachedTickets = confirmation.tickets.map {
                        CachedTicket(
                            ticketCode = it.ticketCode,
                            orderNumber = confirmation.orderNumber,
                            eventTitle = "Event", // Would come from session context
                            venueName = "Venue",
                            showtime = "TBD",
                            seatCode = it.seatCode,
                            qrPayload = it.qrPayload,
                            attendeeName = it.attendeeName,
                            status = it.status,
                            grandTotal = confirmation.grandTotal
                        )
                    }
                    database.ticketDao().insertTickets(cachedTickets)
                    
                    val bookingOrder = BookingOrder(
                        orderNumber = confirmation.orderNumber,
                        grandTotal = confirmation.grandTotal,
                        tickets = confirmation.tickets.map {
                            TicketItem(it.ticketCode, it.seatCode, it.qrPayload, it.attendeeName, it.status)
                        },
                        eventTitle = "Event",
                        venueName = "Venue",
                        showtime = "TBD"
                    )
                    Result.success(bookingOrder)
                } else {
                    Result.failure(Exception("Booking confirmation failed"))
                }
            } else {
                Result.failure(Exception(response.body()?.error ?: "Booking failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getMyTickets(isOnline: Boolean, phone: String? = null): Result<List<CachedTicket>> =
        withContext(Dispatchers.IO) {
            try {
                if (isOnline && phone != null) {
                    val response = apiService.getMyOrders(phone)
                    if (response.isSuccessful && response.body()?.success == true) {
                        val orders = response.body()?.data ?: emptyList()
                        val tickets = orders.flatMap { order ->
                            order.tickets.map {
                                CachedTicket(
                                    ticketCode = it.ticketCode,
                                    orderNumber = order.orderNumber,
                                    eventTitle = order.eventTitle,
                                    venueName = order.venueName,
                                    showtime = order.showtime,
                                    seatCode = it.seatCode,
                                    qrPayload = it.qrPayload,
                                    attendeeName = it.attendeeName,
                                    status = it.status,
                                    grandTotal = order.grandTotal
                                )
                            }
                        }
                        database.ticketDao().insertTickets(tickets)
                        Result.success(tickets)
                    } else {
                        Result.failure(Exception("Failed to fetch tickets"))
                    }
                } else {
                    // Offline - return cached tickets
                    val cachedTickets = database.ticketDao().getAllTickets()
                    Result.success(cachedTickets)
                }
            } catch (e: Exception) {
                // Fallback to cache
                val cachedTickets = database.ticketDao().getAllTickets()
                Result.success(cachedTickets)
            }
        }
}
