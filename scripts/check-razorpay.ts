import 'dotenv/config';
import { getRazorpayMode, getRazorpayConfigDiagnostic } from '../src/lib/payments/razorpay';

function main() {
  console.log('Razorpay mode:', getRazorpayMode());
  console.log('Razorpay diagnostic:', getRazorpayConfigDiagnostic());
}

main();
