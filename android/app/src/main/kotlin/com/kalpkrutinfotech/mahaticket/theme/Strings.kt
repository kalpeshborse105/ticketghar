package com.kalpkrutinfotech.mahaticket.theme

enum class AppLanguage(val code: String, val label: String) {
    ENGLISH("en", "English"),
    MARATHI("mr", "मराठी")
}

enum class UserRole(val labelEn: String, val labelMr: String) {
    PUBLIC_USER("Customer", "ग्राहक"),
    ORGANIZER("Organizer", "आयोजक"),
    ADMIN("Company Admin", "प्रशासक")
}

object TicketStrings {
    fun appTitle(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "MahaTicket"
        AppLanguage.MARATHI -> "महाटिकिट"
    }

    fun controlCenter(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Kalpkrut Control Center"
        AppLanguage.MARATHI -> "कल्पकृत कंट्रोल सेंटर"
    }

    fun tagLine(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Plays, Cinema & Live Cultural Events"
        AppLanguage.MARATHI -> "नाट्यप्रयोग, चित्रपट आणि सांस्कृतिक महोत्सव"
    }

    // Tabs
    fun tabExplore(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Explore"
        AppLanguage.MARATHI -> "शोधा"
    }

    fun tabLiveBooking(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Live Booking"
        AppLanguage.MARATHI -> "थेट बुकिंग"
    }

    fun tabMyTickets(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "My Tickets"
        AppLanguage.MARATHI -> "माझी तिकिटे"
    }

    fun tabQrScan(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Gate Scanner"
        AppLanguage.MARATHI -> "प्रवेश स्कॅनर"
    }

    fun tabAdmin(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Admin"
        AppLanguage.MARATHI -> "प्रशासक"
    }

    // Categories
    fun categoryNatak(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Natak (Theatre)"
        AppLanguage.MARATHI -> "नाट्यप्रयोग"
    }

    fun categoryCinema(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Cinema"
        AppLanguage.MARATHI -> "चित्रपट"
    }

    fun categoryConcert(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Music & Live"
        AppLanguage.MARATHI -> "संगीत मैफील"
    }

    fun categoryComedy(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Comedy"
        AppLanguage.MARATHI -> "विनोदी शो"
    }

    // Roles
    fun rolePublic(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Customer"
        AppLanguage.MARATHI -> "ग्राहक"
    }

    fun roleOrganizer(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Organizer"
        AppLanguage.MARATHI -> "आयोजक"
    }

    fun roleAdmin(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Company Admin"
        AppLanguage.MARATHI -> "कंपनी ॲडमिन"
    }

    // Theater & Amenities
    fun screenOrientation(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "STAGE / SCREEN THIS WAY"
        AppLanguage.MARATHI -> "स्टेज / स्क्रीन या बाजूला आहे"
    }

    fun parking(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Parking Available"
        AppLanguage.MARATHI -> "पार्किंग सोय"
    }

    fun cafeteria(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Cafeteria & Snacks"
        AppLanguage.MARATHI -> "उपाहारगृह"
    }

    fun airConditioned(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Air Conditioned"
        AppLanguage.MARATHI -> "वातानुकूलित"
    }

    fun dolbyAtmos(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Dolby Sound"
        AppLanguage.MARATHI -> "डॉल्बी साऊंड"
    }

    fun wheelchair(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Wheelchair Access"
        AppLanguage.MARATHI -> "व्हीलचेअर सुविधा"
    }

    // Seats & Booking
    fun seatAvailable(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Available"
        AppLanguage.MARATHI -> "उपलब्ध"
    }

    fun seatSelected(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Selected"
        AppLanguage.MARATHI -> "निवडलेली"
    }

    fun seatBooked(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Booked"
        AppLanguage.MARATHI -> "आरक्षित"
    }

    fun groupBooking(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Group Booking"
        AppLanguage.MARATHI -> "गट बुकिंग"
    }

    fun selectSeatsPrompt(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Select number of seats together"
        AppLanguage.MARATHI -> "एकत्रित जागा निवडा"
    }

    fun seatLockCountdown(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Seat Hold Timer"
        AppLanguage.MARATHI -> "जागा राखीव वेळ"
    }

    fun bookNow(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Book Now"
        AppLanguage.MARATHI -> "तिकीट बुक करा"
    }

    fun watchTrailer(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Watch Trailer / Preview"
        AppLanguage.MARATHI -> "ट्रेलर / पूर्वदर्शन पहा"
    }

    fun theaterDetails(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Auditorium & Amenities"
        AppLanguage.MARATHI -> "नाट्यगृह आणि सुविधा"
    }

    fun convenienceFee(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Convenience Fee (incl. 18% GST)"
        AppLanguage.MARATHI -> "सुविधा शुल्क (१८% GST सह)"
    }

    fun totalAmount(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Total Amount"
        AppLanguage.MARATHI -> "एकूण रक्कम"
    }

    fun verifyOtp(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Verify Email OTP"
        AppLanguage.MARATHI -> "ईमेल OTP पडताळणी"
    }

    fun guestCheckoutDesc(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "No prior signup needed. Enter your email to instantly receive OTP and secure your ticket."
        AppLanguage.MARATHI -> "आधी लॉगिन करण्याची गरज नाही. ईमेल टाका, OTP पडताळा आणि तिकीट सुरक्षित करा."
    }

    fun instantRazorpayPay(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Pay via Razorpay"
        AppLanguage.MARATHI -> "रेझरपे द्वारे तात्काळ पेमेंट"
    }

    fun bookingSuccess(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Ticket Confirmed! 🎭"
        AppLanguage.MARATHI -> "तिकीट यशस्वीरित्या आरक्षित! 🎭"
    }

    fun scanQrPass(lang: AppLanguage) = when (lang) {
        AppLanguage.ENGLISH -> "Show QR at Entrance Gate"
        AppLanguage.MARATHI -> "प्रवेशद्वारावर QR कोड दाखवा"
    }
}
