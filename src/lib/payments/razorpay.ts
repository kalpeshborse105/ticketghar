import Razorpay from 'razorpay';
import * as crypto from 'crypto';

/**
 * Check if Razorpay is properly configured with real credentials
 * @returns true if both key ID and secret are set and not placeholder values
 */
export function isRazorpayConfigured(): boolean {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return false;
  }

  // Check for placeholder values that indicate unconfigured state
  const placeholderPatterns = [
    'YourKeyIdHere',
    'your_razorpay',
    'rzp_test_YOUR',
    'rzp_live_YOUR',
    'placeholder',
    'change_me',
  ];

  const keyIdLower = keyId.toLowerCase();
  const keySecretLower = keySecret.toLowerCase();

  for (const pattern of placeholderPatterns) {
    if (keyIdLower.includes(pattern.toLowerCase()) || keySecretLower.includes(pattern.toLowerCase())) {
      return false;
    }
  }

  // Basic format validation for Razorpay keys
  // Test keys: rzp_test_xxxxx, Live keys: rzp_live_xxxxx
  if (!keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_')) {
    return false;
  }

  return true;
}

/**
 * Get configured Razorpay client instance
 * @throws Error if Razorpay is not configured
 * @returns Razorpay instance
 */
export function getRazorpayClient(): Razorpay {
  if (!isRazorpayConfigured()) {
    throw new Error('Razorpay payment gateway is not configured. Please contact support.');
  }

  const keyId = process.env.RAZORPAY_KEY_ID!;
  const keySecret = process.env.RAZORPAY_KEY_SECRET!;

  // Never log secrets - only log that client is being initialized
  console.log('Initializing Razorpay client');

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Verify Razorpay payment signature
 * @param orderId Razorpay order ID
 * @param paymentId Razorpay payment ID
 * @param signature Signature received from Razorpay
 * @returns true if signature is valid
 */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!isRazorpayConfigured()) {
    throw new Error('Razorpay is not configured');
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET!;

  // Generate expected signature: HMAC SHA256 of "order_id|payment_id"
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSignature, 'utf8');
  const actualBuf = Buffer.from(signature, 'utf8');

  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Verify webhook signature from Razorpay
 * @param body Raw webhook body
 * @param signature Signature from x-razorpay-signature header
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret || webhookSecret.toLowerCase().includes('placeholder')) {
    console.warn('Webhook secret not configured - skipping signature verification');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  try {
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const actualBuf = Buffer.from(signature, 'utf8');
    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}
