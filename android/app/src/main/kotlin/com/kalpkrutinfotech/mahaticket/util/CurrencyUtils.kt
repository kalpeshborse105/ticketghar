package com.kalpkrutinfotech.mahaticket.util

import java.text.NumberFormat
import java.util.Locale

/**
 * Centralized Currency Utility for MahaTicket.
 * Ensures consistent paise-to-rupee conversions across Seat Selection, Checkout,
 * Ticket Pass, and Order History.
 *
 * All database and server API amounts are in paise (e.g. 50000 paise = ₹500.00).
 */
object CurrencyUtils {

    private val indianLocale = Locale("en", "IN")

    /**
     * Formats an amount in paise to a standard Indian rupee string.
     * Example:
     *   50000 -> "₹500" (or "₹500.00" if showDecimals = true)
     *   50050 -> "₹500.50"
     *   0 -> "₹0"
     */
    fun formatPaiseToRupees(paise: Int?, showDecimalsIfZero: Boolean = false): String {
        if (paise == null) return "₹0"
        return formatPaiseToRupees(paise.toLong(), showDecimalsIfZero)
    }

    fun formatPaiseToRupees(paise: Long?, showDecimalsIfZero: Boolean = false): String {
        if (paise == null) return "₹0"
        val rupees = paise / 100.0
        return formatRupees(rupees, showDecimalsIfZero)
    }

    /**
     * Formats an amount in rupees directly.
     */
    fun formatRupees(rupees: Double, showDecimalsIfZero: Boolean = false): String {
        val format = NumberFormat.getNumberInstance(indianLocale)
        return if (rupees % 1.0 == 0.0 && !showDecimalsIfZero) {
            "₹${format.format(rupees.toLong())}"
        } else {
            format.minimumFractionDigits = 2
            format.maximumFractionDigits = 2
            "₹${format.format(rupees)}"
        }
    }

    /**
     * Converts a rupee integer amount to paise integer (e.g., 500 -> 50000).
     */
    fun rupeesToPaise(rupees: Int): Int = rupees * 100

    /**
     * Converts a rupee double amount to paise integer with rounding.
     */
    fun rupeesToPaise(rupees: Double): Int = Math.round(rupees * 100).toInt()

    /**
     * Converts paise integer to rupee integer using integer division.
     */
    fun paiseToRupeesInt(paise: Int?): Int = if (paise != null) paise / 100 else 0
}
