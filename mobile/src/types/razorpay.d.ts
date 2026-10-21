declare module 'react-native-razorpay' {
  interface RazorpayOptions {
    key: string;
    amount: string | number;
    currency?: string;
    name?: string;
    description?: string;
    order_id?: string;
    prefill?: { name?: string; email?: string; contact?: string };
    theme?: { color?: string };
    [key: string]: any;
  }

  interface RazorpaySuccess {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  const RazorpayCheckout: {
    open: (options: RazorpayOptions) => Promise<RazorpaySuccess>;
  };

  export default RazorpayCheckout;
}
