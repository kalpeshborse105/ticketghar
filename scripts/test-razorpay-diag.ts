import { getRazorpayConfigDiagnostic, isRazorpayConfigured, getRazorpayMode } from '../src/lib/payments/razorpay';

console.log('--- RAZORPAY CONFIG DIAGNOSTIC ---');
const diag = getRazorpayConfigDiagnostic();
console.log('Diagnostic result:', diag);
console.log('isRazorpayConfigured():', isRazorpayConfigured());
console.log('getRazorpayMode():', getRazorpayMode());

// Test with RAZORPAY_MODE=test
process.env.RAZORPAY_MODE = 'test';
console.log('\nWith RAZORPAY_MODE=test:');
console.log('Diagnostic:', getRazorpayConfigDiagnostic());

// Test inconsistency check
const realKey = process.env.RAZORPAY_KEY_ID;
process.env.RAZORPAY_KEY_ID = 'rzp_live_fake1234567890';
process.env.RAZORPAY_MODE = 'test';
console.log('\nWith Mismatched Mode (RAZORPAY_MODE=test with rzp_live key):');
const mismatchDiag = getRazorpayConfigDiagnostic();
console.log('isConfigured:', mismatchDiag.isConfigured, 'isConsistent:', mismatchDiag.isConsistent);
console.log('Issues:', mismatchDiag.issues);

// Restore
process.env.RAZORPAY_KEY_ID = realKey;
delete process.env.RAZORPAY_MODE;
