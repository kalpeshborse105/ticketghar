package com.kalpkrutinfotech.mahaticket.util

import android.app.Activity
import android.util.Log
import com.razorpay.Checkout
import com.razorpay.PaymentData
import org.json.JSONObject

/**
 * Manages live Razorpay Android Checkout sessions for MahaTicket.
 * Decouples the checkout launch and callbacks from Jetpack Compose UI.
 */
object RazorpayPaymentManager {

    private const val TAG = "RazorpayManager"

    private var activeSuccessCallback: ((paymentId: String, orderId: String?, signature: String?) -> Unit)? = null
    private var activeErrorCallback: ((errorCode: Int, errorMessage: String?) -> Unit)? = null

    fun startPayment(
        activity: Activity,
        keyId: String,
        orderId: String,
        amountInPaise: Int,
        eventName: String,
        customerName: String,
        customerEmail: String,
        customerPhone: String,
        onSuccess: (paymentId: String, orderId: String?, signature: String?) -> Unit,
        onError: (errorCode: Int, errorMessage: String?) -> Unit
    ) {
        this.activeSuccessCallback = onSuccess
        this.activeErrorCallback = onError

        try {
            val checkout = Checkout()
            checkout.setKeyID(keyId)

            val options = JSONObject()
            options.put("name", "MahaTicket")
            options.put("description", eventName)
            options.put("currency", "INR")
            options.put("amount", amountInPaise)
            options.put("order_id", orderId)

            val prefill = JSONObject()
            prefill.put("name", customerName)
            prefill.put("email", customerEmail)
            prefill.put("contact", customerPhone)
            options.put("prefill", prefill)

            val theme = JSONObject()
            theme.put("color", "#EA580C") // MahaTicket Brand Orange
            options.put("theme", theme)

            val retry = JSONObject()
            retry.put("enabled", true)
            retry.put("max_count", 2)
            options.put("retry", retry)

            checkout.open(activity, options)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch Razorpay Checkout", e)
            onError(-1, e.localizedMessage ?: "पॉइंट ऑफ सेल उघडण्यात अडचण आली")
            clearCallbacks()
        }
    }

    fun handlePaymentSuccess(razorpayPaymentId: String?, paymentData: PaymentData?) {
        val paymentId = razorpayPaymentId?.takeIf { it.isNotBlank() }
            ?: paymentData?.paymentId
            ?: "pay_success"
        val orderId = paymentData?.orderId
        val signature = paymentData?.signature

        Log.i(TAG, "Payment success received: paymentId=$paymentId, orderId=$orderId")
        activeSuccessCallback?.invoke(paymentId, orderId, signature)
        clearCallbacks()
    }

    fun handlePaymentError(errorCode: Int, response: String?, paymentData: PaymentData?) {
        val rawMsg = response ?: "Payment cancelled or failed"
        Log.w(TAG, "Payment error received: code=$errorCode, msg=$rawMsg")
        val userFriendlyMessage = when (errorCode) {
            Checkout.NETWORK_ERROR -> "इंटरनेट कनेक्शन तपासा (Network Error)"
            Checkout.INVALID_OPTIONS -> "अवैध पेमेंट तपशील (Invalid Options)"
            Checkout.PAYMENT_CANCELED -> "पेमेंट रद्द केले (Payment Cancelled)"
            Checkout.TLS_ERROR -> "सुरक्षित कनेक्शन त्रुटी (TLS Error)"
            else -> rawMsg
        }
        activeErrorCallback?.invoke(errorCode, userFriendlyMessage)
        clearCallbacks()
    }

    private fun clearCallbacks() {
        activeSuccessCallback = null
        activeErrorCallback = null
    }
}
