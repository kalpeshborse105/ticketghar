package com.kalpkrutinfotech.mahaticket.model

data class EventItem(
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
    val venue: VenueItem?,
    val sessions: List<SessionItem>?
)

data class VenueItem(
    val id: Int,
    val name: String,
    val nameMr: String,
    val address: String,
    val city: String
)

data class SessionItem(
    val id: Int,
    val eventId: Int,
    val sessionStartTime: String,
    val sessionEndTime: String,
    val status: String
)

data class SeatItem(
    val seatId: Int,
    val sectionId: Int,
    val rowLabel: String,
    val seatNumber: Int,
    val seatCode: String,
    val price: Int,
    val status: String, // available, held, booked, blocked
    val isAccessible: Boolean
)

data class BookingOrder(
    val orderNumber: String,
    val grandTotal: Int,
    val tickets: List<TicketItem>,
    val eventTitle: String,
    val venueName: String,
    val showtime: String
)

data class TicketItem(
    val ticketCode: String,
    val seatCode: String,
    val qrPayload: String,
    val attendeeName: String,
    val status: String
)
