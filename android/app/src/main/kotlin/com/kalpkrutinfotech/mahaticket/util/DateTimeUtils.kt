package com.kalpkrutinfotech.mahaticket.util

import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.Locale

/**
 * Utility for accurate IST (Asia/Kolkata) Date & Time formatting with Marathi
 * period indicators (स., दु., सं., रा.) and Marathi numerals.
 *
 * Aligned with website src/lib/dateUtils.ts.
 */
object DateTimeUtils {

    val IST_ZONE: ZoneId = ZoneId.of("Asia/Kolkata")

    private val MARATHI_MONTHS_SHORT = listOf(
        "जाने", "फेब्रु", "मार्च", "एप्रिल", "मे", "जून",
        "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टो", "नोव्हें", "डिसें"
    )

    private val MARATHI_DAYS_SHORT = listOf(
        "सोम", "मंगळ", "बुध", "गुरु", "शुक्र", "शनि", "रवि"
    )

    private val MARATHI_DAYS_FULL = listOf(
        "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार", "रविवार"
    )

    /**
     * Converts western digits 0-9 to Marathi Devanagari digits ०-९.
     */
    fun toMarathiDigits(input: String): String {
        return input.map { char ->
            when (char) {
                '0' -> '०'
                '1' -> '१'
                '2' -> '२'
                '3' -> '३'
                '4' -> '४'
                '5' -> '५'
                '6' -> '६'
                '7' -> '७'
                '8' -> '८'
                '9' -> '९'
                else -> char
            }
        }.joinToString("")
    }

    fun toMarathiDigits(number: Int): String = toMarathiDigits(number.toString())

    /**
     * Safely parses any input timestamp string or epoch millis into an IST ZonedDateTime.
     */
    fun parseToIST(input: Any?): ZonedDateTime? {
        if (input == null) return null
        return try {
            when (input) {
                is ZonedDateTime -> input.withZoneSameInstant(IST_ZONE)
                is Instant -> input.atZone(IST_ZONE)
                is Long -> Instant.ofEpochMilli(input).atZone(IST_ZONE)
                is String -> {
                    val clean = input.trim()
                    if (clean.isBlank()) return null
                    
                    // If it is pure numeric epoch
                    val numericEpoch = clean.toLongOrNull()
                    if (numericEpoch != null) {
                        return Instant.ofEpochMilli(numericEpoch).atZone(IST_ZONE)
                    }

                    // Normalize space separator to ISO T
                    val isoCandidate = if (clean.contains(" ") && !clean.contains("T")) {
                        clean.replace(" ", "T")
                    } else clean

                    // Ensure timezone suffix
                    val hasOffset = isoCandidate.endsWith("Z") || 
                        isoCandidate.contains("+") || 
                        (isoCandidate.length > 10 && isoCandidate.indexOf('-', startIndex = 10) >= 0)
                    val withTz = if (!hasOffset) {
                        "$isoCandidate+05:30"
                    } else isoCandidate

                    try {
                        ZonedDateTime.parse(withTz).withZoneSameInstant(IST_ZONE)
                    } catch (e: DateTimeParseException) {
                        // Try fallback ISO instant
                        try {
                            Instant.parse(withTz).atZone(IST_ZONE)
                        } catch (_: Exception) {
                            null
                        }
                    }
                }
                else -> null
            }
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Returns Marathi time period prefix based on 24-hour hour in IST:
     * - Hours 00 to 11: स. (सकाळी / Morning)
     * - Hours 12 to 15: दु. (दुपारी / Afternoon)
     * - Hours 16 to 19: सं. (संध्याकाळी / Evening)
     * - Hours 20 to 23: रा. (रात्री / Night)
     */
    fun getMarathiTimePeriod(hour24: Int): String {
        return when (hour24) {
            in 0..11 -> "स."
            in 12..15 -> "दु."
            in 16..19 -> "सं."
            else -> "रा."
        }
    }

    /**
     * Formats time into Marathi IST convention with Marathi numerals and 'वा.' suffix:
     * Examples:
     *   10:30 -> "स. १०:३० वा."
     *   13:00 -> "दु. ०१:०० वा."
     *   17:30 -> "सं. ०५:३० वा."
     *   21:30 -> "रा. ०९:३० वा."
     */
    fun formatMarathiTime(input: Any?): String {
        val dt = parseToIST(input) ?: return "दु. १२:३० वा."
        val hour24 = dt.hour
        val minute = dt.minute
        val hour12 = if (hour24 % 12 == 0) 12 else hour24 % 12
        val period = getMarathiTimePeriod(hour24)

        val formattedDigits = toMarathiDigits(String.format(Locale.US, "%02d:%02d", hour12, minute))
        return "$period $formattedDigits वा."
    }

    /**
     * Formats time into standard English convention (e.g. "01:00 PM" or "10:30 AM").
     */
    fun formatEnglishTime(input: Any?): String {
        val dt = parseToIST(input) ?: return "12:30 PM"
        val hour24 = dt.hour
        val minute = dt.minute
        val hour12 = if (hour24 % 12 == 0) 12 else hour24 % 12
        val period = if (hour24 < 12) "AM" else "PM"
        return String.format(Locale.US, "%02d:%02d %s", hour12, minute, period)
    }

    /**
     * Formats date into Marathi short convention:
     * Example: "१५ ऑक्टो" or "रविवार, १५ ऑक्टो"
     */
    fun formatMarathiDate(input: Any?, includeDayOfWeek: Boolean = false): String {
        val dt = parseToIST(input) ?: return "१५ ऑक्टो"
        val dayNumber = toMarathiDigits(dt.dayOfMonth)
        val monthIdx = dt.monthValue - 1
        val monthName = MARATHI_MONTHS_SHORT.getOrElse(monthIdx) { "ऑक्टो" }

        return if (includeDayOfWeek) {
            // DayOfWeek.value: 1 = Monday ... 7 = Sunday
            val dayOfWeekIdx = dt.dayOfWeek.value - 1
            val dayName = MARATHI_DAYS_FULL.getOrElse(dayOfWeekIdx) { "रविवार" }
            "$dayName, $dayNumber $monthName"
        } else {
            "$dayNumber $monthName"
        }
    }

    /**
     * Formats date into English convention (e.g. "15 Oct" or "Sun, 15 Oct").
     */
    fun formatEnglishDate(input: Any?, includeDayOfWeek: Boolean = false): String {
        val dt = parseToIST(input) ?: return "15 Oct"
        val day = dt.dayOfMonth
        val month = dt.month.name.take(3).lowercase().replaceFirstChar { it.uppercase() }
        return if (includeDayOfWeek) {
            val dayOfWeek = dt.dayOfWeek.name.take(3).lowercase().replaceFirstChar { it.uppercase() }
            "$dayOfWeek, $day $month"
        } else {
            "$day $month"
        }
    }

    /**
     * Combined Event Card date & time string:
     * Marathi: "१५ ऑक्टो • दु. ०४:०० वा."
     * English: "15 Oct • 04:00 PM"
     */
    fun formatEventCardDateTime(input: Any?, isMarathi: Boolean = true): String {
        return if (isMarathi) {
            "${formatMarathiDate(input, includeDayOfWeek = false)} • ${formatMarathiTime(input)}"
        } else {
            "${formatEnglishDate(input, includeDayOfWeek = false)} • ${formatEnglishTime(input)}"
        }
    }

    /**
     * Full date and time for Ticket Pass:
     * Marathi: "रविवार, १५ ऑक्टो २०२६ • दु. ०४:०० वा."
     */
    fun formatTicketPassDateTime(input: Any?, isMarathi: Boolean = true): String {
        val dt = parseToIST(input) ?: return if (isMarathi) "रविवार, १५ ऑक्टो • दु. १२:३० वा." else "Sun, 15 Oct • 12:30 PM"
        val yearMarathi = toMarathiDigits(dt.year)
        return if (isMarathi) {
            "${formatMarathiDate(input, includeDayOfWeek = true)} $yearMarathi • ${formatMarathiTime(input)}"
        } else {
            "${formatEnglishDate(input, includeDayOfWeek = true)} ${dt.year} • ${formatEnglishTime(input)}"
        }
    }
}
