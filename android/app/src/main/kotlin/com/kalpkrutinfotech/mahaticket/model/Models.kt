package com.kalpkrutinfotech.mahaticket.model

import com.kalpkrutinfotech.mahaticket.theme.UserRole

data class EventItem(
    val id: Int,
    val title: String,
    val titleMr: String,
    val category: String,
    val categoryMr: String,
    val language: String,
    val durationMinutes: Int,
    val description: String,
    val descriptionMr: String? = null,
    val ageGuidance: String? = null,
    val cast: String? = null,
    val director: String? = null,
    val posterUrl: String,
    val minPrice: Int?,
    val venue: VenueItem?,
    val sessions: List<SessionItem>?,
    val trailerUrl: String? = null,
    val galleryUrls: List<String>? = null,
    val rating: Double? = 4.8,
    val ratingCount: Int? = 124
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
    val isAccessible: Boolean,
    val sectionName: String? = null
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

// UI Design Models from MahaTicket

enum class SeatTier(val labelEn: String, val labelMr: String, val price: Int) {
    VIP("VIP / रॉयल बॉक्स", "रॉयल बॉक्स", 750),
    BALCONY("Balcony / बाल्कनी", "बाल्कनी", 500),
    EXECUTIVE("Executive / मुख्य स्टॉल", "मुख्य स्टॉल", 350),
    STANDARD("Standard / सामान्य", "सामान्य", 200)
}

enum class SeatStatus {
    AVAILABLE,
    SELECTED,
    BOOKED,
    HELD
}

data class Seat(
    val id: String, // e.g. "A1", "B5"
    val row: String, // e.g. "A"
    val number: Int, // e.g. 1
    val tier: SeatTier,
    val price: Int,
    var status: SeatStatus = SeatStatus.AVAILABLE,
    val isAisle: Boolean = false,
    val seatId: Int = 0
)

data class SeatLayoutConfig(
    val rows: List<String>,
    val seatsPerRow: Int,
    val aisleAfterSeat: Int = 4,
    val stageDirection: String = "SCREEN / STAGE THIS WAY"
)

enum class BookingStatus {
    CONFIRMED,
    CHECKED_IN,
    CANCELLED
}

data class Booking(
    val bookingId: String,
    val eventId: String,
    val eventTitleEn: String,
    val eventTitleMr: String,
    val venueName: String,
    val venueAddress: String,
    val showDate: String,
    val showTime: String,
    val seatIds: List<String>,
    val seatTier: SeatTier = SeatTier.BALCONY,
    val ticketCount: Int,
    val baseAmount: Int,
    val convenienceFee: Int,
    val gstAmount: Int,
    val totalAmount: Int,
    val userEmail: String,
    val userPhone: String,
    val paymentId: String,
    val paymentMethod: String,
    val qrCodeData: String,
    val bookingStatus: BookingStatus = BookingStatus.CONFIRMED,
    val bookedAtTimestamp: Long = System.currentTimeMillis(),
    val isCheckedIn: Boolean = false,
    val checkedInAt: Long? = null,
    val checkedInByGateStaff: String? = null
)

enum class EventCategory(val displayEn: String, val displayMr: String) {
    NATAK("Natak (Theatre)", "नाट्यप्रयोग"),
    CINEMA("Cinema", "चित्रपट"),
    CONCERT("Concert & Music", "संगीत मैफील"),
    COMEDY("Stand-Up Comedy", "विनोदी कार्यक्रम")
}

data class Venue(
    val id: String,
    val nameEn: String,
    val nameMr: String,
    val city: String,
    val address: String,
    val totalSeats: Int = 240,
    val hasParking: Boolean = true,
    val hasCafeteria: Boolean = true,
    val hasAirConditioning: Boolean = true,
    val hasDolbySound: Boolean = true,
    val hasWheelchairAccess: Boolean = true,
    val screenDirection: String = "TOP"
)

data class Showtime(
    val id: String,
    val dateText: String,
    val timeText: String,
    val venueId: String,
    val venueName: String,
    val hallName: String = "Main Auditorium / मुख्य प्रेक्षागृह"
)

data class Event(
    val id: String,
    val titleEn: String,
    val titleMr: String,
    val category: EventCategory,
    val language: String,
    val durationText: String,
    val certification: String = "U",
    val rating: Double? = null,
    val totalVotes: String? = null,
    val posterUrl: String,
    val bannerUrl: String = "",
    val trailerTitle: String = "Official Natak Preview & Trailer",
    val trailerVideoSnippet: String = "A stellar presentation with witty dialogues and heartfelt emotions.",
    val trailerUrl: String? = null,
    val galleryUrls: List<String> = emptyList(),
    val synopsisEn: String,
    val synopsisMr: String,
    val cast: List<String> = emptyList(),
    val director: String = "Chandrakant Kulkarni",
    val writer: String = "Sankarshan Karhade",
    val producer: String = "Kalpkrut Productions",
    val basePrice: Int,
    val venue: Venue,
    val availableShowtimes: List<Showtime> = emptyList()
)

data class User(
    val id: String,
    val email: String,
    val name: String,
    val phone: String,
    val role: UserRole = UserRole.PUBLIC_USER,
    val isOtpVerified: Boolean = false,
    val registeredAt: Long = System.currentTimeMillis()
)

data class AuditLog(
    val id: String,
    val timestamp: Long = System.currentTimeMillis(),
    val actorEmail: String,
    val actorRole: UserRole,
    val actionType: String,
    val details: String,
    val resourceTarget: String,
    val ipAddress: String = "192.168.1.104"
)

data class NotificationItem(
    val id: String,
    val title: String,
    val message: String,
    val eventId: String? = null,
    val timestamp: Long = System.currentTimeMillis(),
    val isUrgent: Boolean = false,
    val isRead: Boolean = false
)

// Extension mappers
fun EventItem.toEvent(): Event {
    val categoryEnum = when (category.lowercase()) {
        "plays", "drama", "natak" -> EventCategory.NATAK
        "cinema", "movies", "movie" -> EventCategory.CINEMA
        "concert", "music" -> EventCategory.CONCERT
        else -> EventCategory.NATAK
    }
    val defaultVenue = Venue(
        id = venue?.id?.toString() ?: "v_1",
        nameEn = venue?.name ?: "Bal Gandharva Ranga Mandir",
        nameMr = venue?.nameMr ?: venue?.name ?: "बालगंधर्व रंगमंदिर",
        city = venue?.city ?: "Pune",
        address = venue?.address ?: "J.M. Road, Shivajinagar, Pune"
    )
    val stList = sessions?.map { s ->
        Showtime(
            id = s.id.toString(),
            dateText = s.sessionStartTime,
            timeText = s.sessionStartTime.substringAfter("T", s.sessionStartTime),
            venueId = defaultVenue.id,
            venueName = defaultVenue.nameMr
        )
    } ?: emptyList()

    return Event(
        id = id.toString(),
        titleEn = title,
        titleMr = if (titleMr.isNotBlank()) titleMr else title,
        category = categoryEnum,
        language = if (language.isNotBlank()) language else "मराठी",
        durationText = "${durationMinutes / 60} तास ${durationMinutes % 60} मि.",
        posterUrl = posterUrl,
        bannerUrl = posterUrl,
        trailerUrl = trailerUrl,
        galleryUrls = galleryUrls ?: emptyList(),
        synopsisEn = description,
        synopsisMr = description,
        basePrice = (minPrice ?: 30000) / 100,
        venue = defaultVenue,
        availableShowtimes = stList
    )
}

fun SeatItem.toSeat(): Seat {
    val tierEnum = when (sectionName?.lowercase()) {
        "vip", "royal" -> SeatTier.VIP
        "balcony" -> SeatTier.BALCONY
        "executive", "stall" -> SeatTier.EXECUTIVE
        else -> SeatTier.STANDARD
    }
    val statusEnum = when (status.lowercase()) {
        "available" -> SeatStatus.AVAILABLE
        "held" -> SeatStatus.HELD
        "booked", "blocked" -> SeatStatus.BOOKED
        else -> SeatStatus.AVAILABLE
    }
    return Seat(
        id = seatCode,
        row = rowLabel,
        number = seatNumber,
        tier = tierEnum,
        price = price / 100,
        status = statusEnum,
        isAisle = seatNumber == 6,
        seatId = seatId
    )
}

fun BookingOrder.toBooking(): Booking {
    val total = grandTotal / 100
    val seatList = tickets.map { it.seatCode }
    val qr = tickets.firstOrNull()?.qrPayload ?: "TICKETGHAR|$orderNumber"
    return Booking(
        bookingId = orderNumber,
        eventId = "1",
        eventTitleEn = eventTitle,
        eventTitleMr = eventTitle,
        venueName = venueName,
        venueAddress = "महाराष्ट्र",
        showDate = showtime,
        showTime = showtime,
        seatIds = seatList,
        ticketCount = tickets.size,
        baseAmount = total - (tickets.size * 35),
        convenienceFee = tickets.size * 35,
        gstAmount = 0,
        totalAmount = total,
        userEmail = "guest@mahaticket.in",
        userPhone = "9822000000",
        paymentId = "pay_rzp_$orderNumber",
        paymentMethod = "MahaUPI / NetBanking",
        qrCodeData = qr
    )
}

data class QrValidationResult(
    val isValid: Boolean,
    val isAlreadyCheckedIn: Boolean,
    val booking: Booking? = null,
    val messageEn: String = "",
    val messageMr: String = ""
)

enum class AppTab {
    EXPLORE,
    LIVE_BOOKING,
    MY_TICKETS,
    ORGANIZER_DASHBOARD,
    QR_SCANNER,
    CONTROL_CENTER,
    NOTIFICATIONS,
    CHATBOT,
    PROFILE
}
