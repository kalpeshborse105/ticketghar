package com.kalpkrutinfotech.mahaticket

import com.google.gson.Gson
import com.kalpkrutinfotech.mahaticket.data.api.CreatePaymentOrderRequest
import com.kalpkrutinfotech.mahaticket.data.api.CreatePaymentOrderResponse
import com.kalpkrutinfotech.mahaticket.data.api.HoldResultData
import com.kalpkrutinfotech.mahaticket.data.api.HoldSeatsResponse
import com.kalpkrutinfotech.mahaticket.data.api.VerifyPaymentRequest
import com.kalpkrutinfotech.mahaticket.theme.AppLanguage
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class BookingWorkflowUnitTest {

    private val gson = Gson()

    @Test
    fun testCreatePaymentOrderRequestSerializationIncludesHoldToken() {
        val request = CreatePaymentOrderRequest(
            sessionId = 1,
            seatIds = listOf(101, 102),
            holdToken = "test-hold-token-xyz",
            userIdStr = "test-hold-token-xyz"
        )
        val json = gson.toJson(request)
        assertTrue(json.contains("\"holdToken\":\"test-hold-token-xyz\""))
        assertTrue(json.contains("\"userIdStr\":\"test-hold-token-xyz\""))
        assertTrue(json.contains("\"sessionId\":1"))
        assertTrue(json.contains("[101,102]"))
    }

    @Test
    fun testHoldResultDataDeserializesHoldExpiresAt() {
        val json = """
            {
                "success": true,
                "hold": {
                    "holdToken": "token-abc-123",
                    "holdExpiresAt": "2026-10-15T20:00:00.000Z",
                    "seatCount": 2,
                    "ticketFaceValueTotal": 50000
                },
                "pricing": {
                    "ticketFaceValueTotal": 50000,
                    "platformFeeTotal": 6000,
                    "taxTotal": 3000,
                    "discountTotal": 0
                }
            }
        """.trimIndent()
        val resp = gson.fromJson(json, HoldSeatsResponse::class.java)
        assertEquals("token-abc-123", resp.holdToken)
        assertEquals("token-abc-123", resp.hold?.holdToken)
        assertEquals("2026-10-15T20:00:00.000Z", resp.hold?.expiresAt)
        assertNotNull(resp.pricing)
        assertEquals(50000, resp.pricing?.faceValueTotal)
        assertEquals(6000, resp.pricing?.convenienceFee)
        assertEquals(3000, resp.pricing?.gst)
    }

    @Test
    fun testCreatePaymentOrderResponseDeserializesHoldExpiresAt() {
        val json = """
            {
                "orderId": "order_Rzp12345",
                "amount": 59000,
                "currency": "INR",
                "keyId": "rzp_test_12345",
                "holdExpiresAt": "2026-10-15T20:00:00.000Z"
            }
        """.trimIndent()
        val resp = gson.fromJson(json, CreatePaymentOrderResponse::class.java)
        assertEquals("order_Rzp12345", resp.orderId)
        assertEquals(59000, resp.amount)
        assertEquals("2026-10-15T20:00:00.000Z", resp.holdExpiresAt)
    }

    @Test
    fun testVerifyPaymentRequestSerialization() {
        val request = VerifyPaymentRequest(
            razorpayOrderId = "order_test_888",
            razorpayPaymentId = "pay_test_999",
            razorpaySignature = "sig_test_777",
            sessionId = 1,
            eventId = 42,
            seatIds = listOf(101, 102),
            userName = "Aniket Patil",
            userEmail = "aniket@example.com",
            userPhone = "9876543210"
        )
        val json = gson.toJson(request)
        assertTrue(json.contains("\"razorpay_payment_id\":\"pay_test_999\""))
        assertTrue(json.contains("\"razorpay_order_id\":\"order_test_888\""))
        assertTrue(json.contains("\"userName\":\"Aniket Patil\""))
        assertTrue(json.contains("\"sessionId\":1"))
        assertTrue(json.contains("\"eventId\":42"))
    }

    @Test
    fun testLanguageToggleLogic() {
        val mr = AppLanguage.MARATHI
        val en = AppLanguage.ENGLISH
        assertEquals("mr", mr.code)
        assertEquals("en", en.code)
        assertEquals("मराठी", mr.label)
        assertEquals("English", en.label)
    }
}
