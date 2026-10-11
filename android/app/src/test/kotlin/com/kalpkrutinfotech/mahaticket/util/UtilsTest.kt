package com.kalpkrutinfotech.mahaticket.util

import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.ZonedDateTime

class UtilsTest {

    @Test
    fun testCurrencyFormatting() {
        assertEquals("₹500", CurrencyUtils.formatPaiseToRupees(50000))
        assertEquals("₹500.50", CurrencyUtils.formatPaiseToRupees(50050))
        assertEquals("₹0", CurrencyUtils.formatPaiseToRupees(0))
        assertEquals("₹1,040", CurrencyUtils.formatPaiseToRupees(104000))
        assertEquals(50000, CurrencyUtils.rupeesToPaise(500))
        assertEquals(500, CurrencyUtils.paiseToRupeesInt(50000))
    }

    @Test
    fun testMarathiTimePeriodsAndNumerals() {
        // Test examples specified in requirements:
        // 10:30 -> "स. १०:३० वा."
        val morningDt = ZonedDateTime.of(2026, 10, 15, 10, 30, 0, 0, DateTimeUtils.IST_ZONE)
        assertEquals("स. १०:३० वा.", DateTimeUtils.formatMarathiTime(morningDt))

        // 13:00 -> "दु. ०१:०० वा."
        val afternoonDt = ZonedDateTime.of(2026, 10, 15, 13, 0, 0, 0, DateTimeUtils.IST_ZONE)
        assertEquals("दु. ०१:०० वा.", DateTimeUtils.formatMarathiTime(afternoonDt))

        // 17:30 -> "सं. ०५:३० वा."
        val eveningDt = ZonedDateTime.of(2026, 10, 15, 17, 30, 0, 0, DateTimeUtils.IST_ZONE)
        assertEquals("सं. ०५:३० वा.", DateTimeUtils.formatMarathiTime(eveningDt))

        // 21:30 -> "रा. ०९:३० वा."
        val nightDt = ZonedDateTime.of(2026, 10, 15, 21, 30, 0, 0, DateTimeUtils.IST_ZONE)
        assertEquals("रा. ०९:३० वा.", DateTimeUtils.formatMarathiTime(nightDt))
    }

    @Test
    fun testMarathiDateFormatting() {
        // 15 Oct 2026
        val dt = ZonedDateTime.of(2026, 10, 15, 13, 0, 0, 0, DateTimeUtils.IST_ZONE)
        assertEquals("१५ ऑक्टो", DateTimeUtils.formatMarathiDate(dt, includeDayOfWeek = false))
        assertEquals("गुरुवार, १५ ऑक्टो", DateTimeUtils.formatMarathiDate(dt, includeDayOfWeek = true))
    }
}
