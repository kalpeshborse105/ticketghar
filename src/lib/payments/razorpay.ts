import Razorpay from 'razorpay';
import * as crypto from 'crypto';

/**
 * Determine the configured Razorpay mode: 'test' or 'live'
 */
export function getRazorpayMode(): 'test' | 'live' | 'unknown' {
  const explicitMode = process.env.RAZORPAY_MODE?.trim().toLowerCase();
  if (explicitMode === 'test' || explicitMode === 'live') {
    return explicitMode;
  }
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || '';
  if (keyId.startsWith('rzp_test_')) return 'test';
  if (keyId.startsWith('rzp_live_')) return 'live';
  return 'unknown';
}

/**
 * Diagnostic helper reporting status of Razorpay configuration safely without leaking secrets
 */
export function getRazorpayConfigDiagnostic(): {
  mode: 'test' | 'live' | 'unknown';
  isConfigured: boolean;
  isConsistent: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || '';
  const explicitMode = process.env.RAZORPAY_MODE?.trim().toLowerCase();

  const mode = getRazorpayMode();

  if (!keyId) issues.push('RAZORPAY_KEY_ID is missing');
  if (!keySecret) issues.push('RAZORPAY_KEY_SECRET is missing');

  // Check placeholder values
  const placeholderPatterns = [
    'YourKeyIdHere',
    'your_razorpay',
    'rzp_test_YOUR',
    'rzp_live_YOUR',
    'placeholder',
    'change_me',
  ];
  for (const pattern of placeholderPatterns) {
    if (
      keyId.toLowerCase().includes(pattern.toLowerCase()) ||
      keySecret.toLowerCase().includes(pattern.toLowerCase())
    ) {
      issues.push(`Credential contains placeholder pattern: "${pattern}"`);
    }
  }

  // Format validation
  if (keyId && !keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_')) {
    issues.push('RAZORPAY_KEY_ID does not match expected prefix (rzp_test_ or rzp_live_)');
  }

  // Consistency between RAZORPAY_MODE and RAZORPAY_KEY_ID
  let isConsistent = true;
  if (explicitMode) {
    if (explicitMode === 'test' && !keyId.startsWith('rzp_test_')) {
      issues.push('RAZORPAY_MODE is set to "test" but RAZORPAY_KEY_ID does not start with "rzp_test_"');
      isConsistent = false;
    } else if (explicitMode === 'live' && !keyId.startsWith('rzp_live_')) {
      issues.push('RAZORPAY_MODE is set to "live" but RAZORPAY_KEY_ID does not start with "rzp_live_"');
      isConsistent = false;
    }
  }

  const isConfigured = issues.length === 0;

  return {
    mode,
    isConfigured,
    isConsistent: isConsistent && (issues.length === 0 || !issues.some(i => i.includes('does not match expected prefix') || i.includes('RAZORPAY_MODE is set'))),
    issues,
  };
}

/**
 * Check if Razorpay is properly configured with real credentials and consistent mode
 * @returns true if both key ID and secret are set and not placeholder values
 */
export function isRazorpayConfigured(): boolean {
  const diag = getRazorpayConfigDiagnostic();
  return diag.isConfigured && diag.isConsistent;
}

/**
 * Get configured Razorpay client instance
 * @throws Error if Razorpay is not configured or inconsistent
 * @returns Razorpay instance
 */
export function getRazorpayClient(): Razorpay {
  const diag = getRazorpayConfigDiagnostic();
  if (!diag.isConfigured || !diag.isConsistent) {
    throw new Error(`Razorpay payment gateway configuration error: ${diag.issues.join('; ')}`);
  }

  const keyId = process.env.RAZORPAY_KEY_ID!;
  const keySecret = process.env.RAZORPAY_KEY_SECRET!;

  // Never log secrets - only log that client is being initialized with mode
  console.log(`Initializing Razorpay client in ${diag.mode} mode`);

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

  if (!orderId || !paymentId || !signature) {
    return false;
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
