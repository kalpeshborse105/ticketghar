# Razorpay Payment - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### 1. Get Razorpay Test Credentials
1. Go to https://dashboard.razorpay.com/
2. Sign up / Sign in
3. Navigate to **Settings** → **API Keys**
4. Click **Generate Test Key**
5. Copy your `Key ID` and `Key Secret`

### 2. Update Environment Variables
Edit `.env` file:

```bash
# Replace these placeholder values:
RAZORPAY_KEY_ID="rzp_test_YOUR_KEY_ID_HERE"
RAZORPAY_KEY_SECRET="YOUR_SECRET_KEY_HERE"
PAYMENT_WEBHOOK_SECRET="YOUR_WEBHOOK_SECRET"

# For testing real payment flow:
ALLOW_DIRECT_CONFIRM="false"
NEXT_PUBLIC_ALLOW_DIRECT_CONFIRM="false"
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Test Payment Flow

1. **Open**: http://localhost:3000
2. **Select**: Choose event and seats
3. **Hold**: Seats are held for 8 minutes
4. **Fill**: Enter name, email, phone
5. **Pay**: Click pay button → Razorpay modal opens
6. **Test Card**: Use `4111 1111 1111 1111`
   - CVV: Any 3 digits (e.g., 123)
   - Expiry: Any future date (e.g., 12/25)
7. **Success**: Booking confirmed, tickets generated ✅

### 5. Test Alternative Payment Methods

**Test UPI**: `success@razorpay`  
**Test Card**: `4111 1111 1111 1111`  
**Failed Payment**: `fail@razorpay` (for testing failures)

---

## ⚠️ Testing Gateway Not Configured Error

To see the "Payment gateway not configured" error:

```bash
# In .env, use placeholder:
RAZORPAY_KEY_ID="rzp_test_YourKeyIdHere"
```

Restart server → Try to pay → Should show clear error message.

---

## 🔐 For Local QA Only (Skip Payments)

If you need to bypass payments temporarily for backend testing:

```bash
ALLOW_DIRECT_CONFIRM="true"
```

**WARNING**: Never use this in production!

---

## 📊 What to Check After Payment

1. **Browser Console**: Look for "Payment signature verified successfully"
2. **Database**: Check `orders` table → `paymentStatus` = 'captured'
3. **Tickets**: Check `tickets` table → status = 'valid', QR codes generated
4. **Success Page**: Should show QR tickets

---

## 🐛 Common Issues

### Issue: "Payment gateway not configured"
**Fix**: Check `.env` has valid `rzp_test_*` or `rzp_live_*` key, not placeholder.

### Issue: "Hold has expired"
**Fix**: Complete payment within 8 minutes or re-select seats.

### Issue: Razorpay modal doesn't open
**Fix**: Check browser console for script loading errors. Refresh page.

---

## 📚 Full Documentation

- **Complete Guide**: `RAZORPAY_IMPLEMENTATION.md`
- **Files Changed**: `RAZORPAY_FILES_CHANGED.md`
- **Admin Reference**: `ADMIN_QUICK_REF.md`

---

## 🚀 Production Deployment

When ready to go live:

1. Get **Live** credentials from Razorpay (rzp_live_*)
2. Update production `.env`
3. Set `ALLOW_DIRECT_CONFIRM="false"`
4. Set `NEXT_PUBLIC_ALLOW_DIRECT_CONFIRM="false"`
5. Configure webhook: `https://yourdomain.com/api/payments/webhook`
6. Test with small amount (₹1)
7. Monitor first transactions

---

**Need Help?** Check `RAZORPAY_IMPLEMENTATION.md` for detailed troubleshooting.
