/**
 * CheckoutScreen — compact checkout with a ticket-first layout and Razorpay payment.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../theme';
import { api, paise, formatDate, formatTime } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCartStore, useAuthStore, useUIStore } from '../store';
import RazorpayCheckout from 'react-native-razorpay';
import { CommonActions } from '@react-navigation/native';
import { BackHeader, CountdownTimer, Divider, PriceRow, TicketCardFrame, MTPopupModal } from '../components';
import { clearSessionSeatsCache } from './SeatSelectionScreen';

function cleanIndianMobile(raw?: string | null): string {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

function formatPaymentErrorMessage(err: any): { title: string; message: string } {
  if (!err) {
    return {
      title: 'Payment Incomplete (व्यवहार अपूर्ण)',
      message: 'Payment could not be completed. Your seats are still held active. Please retry.\n\nपेमेंट पूर्ण होऊ शकले नाही. आपले सीट अजूनही सुरक्षित (hold) आहेत, कृपया पुन्हा प्रयत्न करा.',
    };
  }

  const rawStr = typeof err === 'string' ? err : JSON.stringify(err || {});
  const plainMsg = typeof err?.message === 'string' ? err.message : '';
  let parsed: any = null;
  if (typeof err === 'string') {
    try {
      parsed = JSON.parse(err);
    } catch { }
  } else if (typeof err === 'object') {
    parsed = err;
  }

  const rzp = parsed?.error || parsed;
  const reason = rzp?.reason;
  const desc = rzp?.description || parsed?.data?.details;
  const isCancelled =
    rzp?.code === 2 ||
    /cancel|dismiss|back pressed|back_pressed/i.test(rawStr) ||
    rzp?.reason === 'payment_cancelled';

  if (isCancelled) {
    return {
      title: 'Payment Cancelled (पेमेंट रद्द झाले)',
      message: 'You cancelled the payment. Your seats are still held active! You can retry now.\n\nआपण पेमेंट रद्द केले आहे. आपले सीट अजूनही सुरक्षित आहेत, आपण पुन्हा प्रयत्न करू शकता.',
    };
  }

  if (/authenti|razorpay.*key|KEY_SECRET|KEY_ID/i.test(plainMsg + rawStr)) {
    return {
      title: 'Payment Gateway Error (गेटवे त्रुटी)',
      message:
        'Payment gateway connection is temporarily unavailable. Your seats are still held active. Please retry in a few moments.\n\nपेमेंट गेटवेशी जोडणी तात्पुरती उपलब्ध नाही. आपले सीट अजूनही सुरक्षित (hold) आहेत. कृपया पुन्हा प्रयत्न करा.',
    };
  }

  if (/timeout|timed out|network|slow|econnreset|aborterror/i.test(plainMsg + rawStr)) {
    return {
      title: 'नेटवर्क विलंबाची त्रुटी (Connection Timeout)',
      message:
        'नेटवर्क विलंबाने विनंती पूर्ण होऊ शकली नाही. आपले सीट अजूनही सुरक्षित (hold) आहेत. कृपया पुन्हा प्रयत्न करा.\n\n(Request timed out. Your seats are still held active. Please retry.)',
    };
  }

  if (plainMsg && plainMsg.length > 8 && !plainMsg.startsWith('{') && !/Network error/i.test(plainMsg)) {
    return {
      title: 'Payment Failed (पेमेंट अयशस्वी)',
      message: `${plainMsg}\n\nआपले सीट अजूनही सुरक्षित आहेत. कृपया पुन्हा प्रयत्न करा.`,
    };
  }

  if (desc && desc !== 'undefined' && typeof desc === 'string' && desc.length > 3 && !desc.startsWith('{')) {
    return {
      title: 'Payment Failed (पेमेंट अयशस्वी)',
      message: `${desc}\n\nआपले सीट अजूनही सुरक्षित आहेत. कृपया पुन्हा प्रयत्न करा.`,
    };
  }

  if (reason === 'payment_error' || rzp?.code === 'BAD_REQUEST_ERROR') {
    return {
      title: 'Payment Failed (पेमेंट अयशस्वी)',
      message: 'Bank authentication or payment processing was unsuccessful. Your seats are still held. Please retry with UPI, card, or net banking.\n\nबँक किंवा UPI व्यवहार यशस्वी झाला नाही. आपले सीट अजूनही सुरक्षित आहेत. कृपया पुन्हा प्रयत्न करा.',
    };
  }

  return {
    title: 'Payment Failed (पेमेंट अयशस्वी)',
    message:
      'We were unable to complete the transaction. Your seats are still held. Please retry.\n\nव्यवहार पूर्ण होऊ शकला नाही. आपले सीट अजूनही सुरक्षित (hold) आहेत — कृपया पुन्हा प्रयत्न करा.',
  };
}

export default function CheckoutScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const {
    holdToken,
    faceValue = 0,
    seatCodes = [],
    seatIds = [],
    expiresAt,
    addonTotal = 0,
    eventId,
    sessionId,
    eventTitle,
    posterUrl,
    sessionMeta,
    sessionStartTime: routeSessionStartTime,
    venueName,
    platformFeeTotal: routePlatformFeeTotal,
    taxTotal: routeTaxTotal,
  } = route.params;

  const { user, setAuth } = useAuthStore();
  const { setRazorpayOrder } = useCartStore();
  const language = useUIStore((s) => s.language);

  const sanitizeName = (rawName?: string, rawEmail?: string) => {
    if (!rawName) {
      if (rawEmail && rawEmail.includes('@')) {
        const prefix = rawEmail.split('@')[0];
        return prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : '';
      }
      return '';
    }
    if (rawName.includes('@')) {
      const prefix = rawName.split('@')[0];
      return prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : '';
    }
    return rawName;
  };

  // Contact — BMS order: name → phone → age → email
  const [name, setName] = useState(sanitizeName(user?.name || (user as any)?.fullName, user?.email));
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(cleanIndianMobile(user?.phone || (user as any)?.phoneNumber));
  const [age, setAge] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const nameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const ageRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  useEffect(() => {
    const cleanN = sanitizeName(user?.name || (user as any)?.fullName, user?.email);
    if (cleanN && !name) setName(cleanN);
    if (user?.email && !email) setEmail(user.email);
    const p = cleanIndianMobile(user?.phone || (user as any)?.phoneNumber);
    if (p && !phone) setPhone(p);
  }, [user]);

  const persistAuthUser = async (u: any, token?: string) => {
    if (!u?.id && !u?.email) return;
    await setAuth(
      {
        id: u.id,
        name: u.fullName || u.name || name.trim(),
        email: u.email || email.trim().toLowerCase(),
        phone: u.phoneNumber || u.phone || phone,
        avatarUrl: u.avatarUrl,
        role: u.role || 'customer',
      },
      // Empty string until server returns signed token (after auth deploy)
      token && token.includes('.') ? token : ''
    );
  };

  // Direct guest checkout - no inline auth verification blocking payment

  // Coupons
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ valid: boolean; text: string } | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  type CheckoutStage =
    | 'idle'
    | 'validating_hold'
    | 'creating_order'
    | 'opening_gateway'
    | 'verifying_payment'
    | 'confirming_booking'
    | 'reconciliation_pending';

  const [stage, setStage] = useState<CheckoutStage>('idle');
  const paying = stage !== 'idle' && stage !== 'reconciliation_pending';
  const paymentPhase =
    stage === 'verifying_payment' || stage === 'confirming_booking'
      ? 'verifying'
      : 'initiating';

  // Track successful payment so beforeRemove and countdown do NOT release booked seats
  const paymentDoneRef = useRef(false);

  const [checkoutModal, setCheckoutModal] = useState<{
    visible: boolean;
    type?: 'warning' | 'error' | 'success' | 'info';
    title: string;
    message: string;
    primaryButtonText?: string;
    onPrimaryPress?: () => void;
    secondaryButtonText?: string;
    onSecondaryPress?: () => void;
  } | null>(null);

  // Reject demo/fake holds — checkout only after real /api/bookings/hold
  useEffect(() => {
    const token = String(holdToken || '');
    const invalid =
      !token ||
      token.startsWith('ga_pass_') ||
      !Array.isArray(seatIds) ||
      seatIds.length === 0 ||
      !sessionId;
    if (!invalid) return;
    setCheckoutModal({
      visible: true,
      type: 'warning',
      title: 'Invalid booking session',
      message:
        'Please select seats again. Checkout requires a live seat hold from the server (web workflow).',
      primaryButtonText: 'Go back',
      onPrimaryPress: () => {
        setCheckoutModal(null);
        navigation.goBack();
      },
    });
  }, [holdToken, seatIds, sessionId, navigation]);

  const displayedSeatCodes = useMemo(
    () => Array.from(new Set((Array.isArray(seatCodes) ? seatCodes : []).filter(Boolean))),
    [seatCodes]
  );

  // Load available coupons
  useEffect(() => {
    api.getCoupons()
      .then((d) => {
        if (d.coupons?.length) {
          setAvailableCoupons(d.coupons);
        }
      })
      .catch(() => null);
  }, []);

  // Check pending payment reconciliation on mount
  useEffect(() => {
    (async () => {
      try {
        const pendingStr = await AsyncStorage.getItem('@tg_pending_payment_reconciliation');
        if (pendingStr) {
          const rec = JSON.parse(pendingStr);
          if (rec?.razorpay_payment_id) {
            paymentDoneRef.current = true;
            setCheckoutModal({
              visible: true,
              type: 'info',
              title: 'प्रलंबित पेमेंट पडताळणी (Pending Verification)',
              message: `तुमच्या मागील व्यवहाराची (ID: ${rec.razorpay_payment_id}) पडताळणी शिल्लक आहे. कृपया स्थिती तपासा.`,
              primaryButtonText: 'स्थिती तपासा (Check Status)',
              onPrimaryPress: () => {
                setCheckoutModal(null);
                checkPendingReconciliation(rec);
              },
              secondaryButtonText: 'रद्द करा (Dismiss)',
              onSecondaryPress: () => setCheckoutModal(null),
            });
          }
        }
      } catch {}
    })();
  }, []);

  const ticketMeta = useMemo(() => {
    const parts = String(sessionMeta || '')
      .split('•')
      .map((part) => part.trim())
      .filter(Boolean);

    return {
      dateTime: parts[0] || 'Showtime to be confirmed',
      venue: venueName || parts.slice(1).join(' • ') || 'Venue at booking confirmation',
    };
  }, [sessionMeta, venueName]);

  const ticketCount =
    displayedSeatCodes.length ||
    (Array.isArray(seatIds) && seatIds.length > 0 ? seatIds.length : 1);
  const platformFee =
    typeof routePlatformFeeTotal === 'number' ? routePlatformFeeTotal : 3000 * ticketCount;
  const tax =
    typeof routeTaxTotal === 'number' ? routeTaxTotal : Math.round(platformFee * 0.18);
  const grossSubtotal = faceValue + platformFee + tax + addonTotal;
  const grandTotal = Math.max(0, grossSubtotal - appliedDiscount);
  const seatSummary =
    displayedSeatCodes.length > 0
      ? `${displayedSeatCodes.length} seat${displayedSeatCodes.length === 1 ? '' : 's'} • ${displayedSeatCodes.join(', ')}`
      : `${ticketCount} seat${ticketCount === 1 ? '' : 's'} selected`;

  // Release hold on back — while paying, seats stay locked (no seat-map edit mid-payment)
  const handleDiscardAndBack = async () => {
    if (paying) {
      setCheckoutModal({
        visible: true,
        type: 'warning',
        title: 'Payment in progress',
        message: 'Please complete or cancel Razorpay first. Seats stay held until then.',
        primaryButtonText: 'OK',
        onPrimaryPress: () => setCheckoutModal(null),
      });
      return;
    }
    try {
      if (sessionId && holdToken && !String(holdToken).startsWith('app-hold-')) {
        await api.releaseHold({ sessionId, holdToken, seatIds });
      }
    } catch {
      // Hold TTL still frees seats server-side
    }
    try {
      useCartStore.getState().clearCart();
    } catch {}
    clearSessionSeatsCache(sessionId);
    navigation.goBack();
  };

  // Hardware / gesture back must also release server hold (cancel only)
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: any) => {
      if (paymentDoneRef.current) return;
      if (paying) {
        e.preventDefault();
        setCheckoutModal({
          visible: true,
          type: 'warning',
          title: 'Payment in progress',
          message: 'Please complete or cancel Razorpay first. Seats stay held until then.',
          primaryButtonText: 'OK',
          onPrimaryPress: () => setCheckoutModal(null),
        });
        return;
      }
      // Fire-and-forget release when cancelling checkout (idempotent on server)
      if (sessionId && holdToken && !String(holdToken).startsWith('app-hold-')) {
        api.releaseHold({ sessionId, holdToken, seatIds }).catch(() => null);
        clearSessionSeatsCache(sessionId);
      }
    });
    return unsub;
  }, [navigation, paying, sessionId, holdToken, seatIds]);

  // Hardware back press listener for Android
  useEffect(() => {
    const onHardwareBack = () => {
      if (checkoutModal) {
        setCheckoutModal(null);
        return true;
      }
      handleDiscardAndBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [checkoutModal, handleDiscardAndBack]);

  const applyCouponCode = async (codeToApply: string) => {
    const code = codeToApply.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await api.applyCoupon(code, grossSubtotal);
      if (res.valid && res.discountAmount !== undefined) {
        setAppliedDiscount(res.discountAmount);
        setAppliedCoupon(res.couponCode || code);
        setCouponMsg({ valid: true, text: `✓ ${res.message || 'Coupon applied successfully!'}` });
      } else {
        setCouponMsg({ valid: false, text: res.message || 'Invalid or expired coupon' });
        setAppliedDiscount(0);
        setAppliedCoupon(null);
      }
    } catch (err: any) {
      setCouponMsg({ valid: false, text: err?.message || 'Failed to apply coupon' });
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedDiscount(0);
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponMsg(null);
  };

  const focusField = (which: 'name' | 'phone' | 'age' | 'email') => {
    scrollRef.current?.scrollTo({ y: 120, animated: true });
    requestAnimationFrame(() => {
      if (which === 'name') nameRef.current?.focus();
      if (which === 'phone') phoneRef.current?.focus();
      if (which === 'age') ageRef.current?.focus();
      if (which === 'email') emailRef.current?.focus();
    });
  };

  const handlePayment = async () => {
    Keyboard.dismiss();
    const cleanPhone = cleanIndianMobile(phone);
    setFieldError(null);

    if (!name.trim()) {
      setFieldError('कृपया नाव प्रविष्ट करा (Enter ticket holder name).');
      focusField('name');
      return;
    }
    if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setFieldError('कृपया वैध १०-अंकी मोबाईल नंबर टाका (Valid 10-digit mobile).');
      focusField('phone');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFieldError('कृपया ई-तिकीटसाठी वैध ईमेल टाका (Valid email for ticket).');
      focusField('email');
      return;
    }

    setStage('validating_hold');
    try {
      // Step 1: Create backend Razorpay order (extends seat hold)
      setStage('creating_order');
      const orderData = await api.createRazorpayOrder({
        sessionId,
        seatIds,
        couponCode: appliedCoupon || null,
        holdToken,
        userEmail: email.trim().toLowerCase(),
        userName: name.trim(),
        userPhone: cleanPhone,
        idempotencyKey: holdToken ? `ord_${holdToken}` : undefined,
        correlationId: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      });

      if (!orderData?.orderId || !orderData?.keyId) {
        throw new Error(orderData?.error || 'Could not create the payment order.');
      }

      setRazorpayOrder(orderData.orderId, 0);

      // Step 2: Open native Razorpay Checkout
      setStage('opening_gateway');
      const paymentSuccessData = await RazorpayCheckout.open({
        key: orderData.keyId,
        amount: Number(orderData.amount ?? grandTotal),
        currency: orderData.currency || 'INR',
        name: 'MahaTicket',
        description: String(eventTitle || 'Event tickets').slice(0, 255),
        order_id: orderData.orderId,
        prefill: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          contact: cleanPhone,
        },
        theme: { color: '#EA580C' },
        retry: { enabled: true, max_count: 2 },
      });

      // CRITICAL: Customer money debited by Razorpay! Immediately mark paymentDoneRef so back/discard NEVER releases seats.
      paymentDoneRef.current = true;

      // Persist reconciliation snapshot to AsyncStorage
      const reconciliationRecord = {
        sessionId,
        eventId,
        seatIds,
        seatCodes: displayedSeatCodes,
        userName: name.trim(),
        userEmail: email.trim().toLowerCase(),
        userPhone: cleanPhone,
        couponCode: appliedCoupon || null,
        razorpay_order_id: paymentSuccessData.razorpay_order_id,
        razorpay_payment_id: paymentSuccessData.razorpay_payment_id,
        razorpay_signature: paymentSuccessData.razorpay_signature,
        amount: Number(orderData.amount ?? grandTotal),
        createdAt: new Date().toISOString(),
        eventTitle,
        venueName,
        sessionStartTime: routeSessionStartTime || null,
        sessionMeta,
      };
      await AsyncStorage.setItem(
        '@tg_pending_payment_reconciliation',
        JSON.stringify(reconciliationRecord)
      );

      // Step 3: Transition status to verifying
      setStage('verifying_payment');

      const payload: any = {
        sessionId,
        eventId,
        seatIds,
        userName: name.trim(),
        userEmail: email.trim().toLowerCase(),
        userPhone: cleanPhone,
        couponCode: appliedCoupon || null,
        razorpay_order_id: paymentSuccessData.razorpay_order_id,
        razorpay_payment_id: paymentSuccessData.razorpay_payment_id,
        razorpay_signature: paymentSuccessData.razorpay_signature,
      };

      // Server-side signature verify → confirm booking with retry loop
      let verified: any = null;
      let lastVerifyError: any = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          verified = await api.verifyPayment(payload);
          if (verified?.success || verified?.orderId || verified?.id || verified?.order) {
            break;
          }
        } catch (vErr: any) {
          lastVerifyError = vErr;
          console.warn(`Payment verify attempt ${attempt} failed:`, vErr?.message);
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
      }

      if (!verified && lastVerifyError) {
        throw lastVerifyError;
      }

      if (verified?.success || verified?.orderId || verified?.id || verified?.order) {
        setStage('confirming_booking');

        // Verification succeeded on server! Clear pending reconciliation
        await AsyncStorage.removeItem('@tg_pending_payment_reconciliation');

        useAuthStore.getState().updateUser({
          name: name.trim(),
          fullName: name.trim(),
          phone: cleanIndianMobile(phone),
          phoneNumber: cleanIndianMobile(phone),
          email: email.trim().toLowerCase(),
        });
        useAuthStore.getState().syncUserProfile().catch(() => null);

        const resolvedOrderNumber =
          verified?.orderNumber ||
          verified?.order?.orderNumber ||
          `MT-${Date.now().toString().slice(-6)}`;
        const resolvedOrderId = verified?.orderId || verified?.bookingId || verified?.order?.id;
        const resolvedEventTitle =
          verified?.order?.event?.titleMr ||
          verified?.order?.event?.title ||
          eventTitle ||
          'कार्यक्रम';
        const resolvedVenue =
          venueName ||
          verified?.order?.event?.venue?.nameMr ||
          verified?.order?.event?.venue?.name ||
          sessionMeta?.venue ||
          ticketMeta?.venue ||
          'सभागृह उपलब्ध नाही';
        const bookedSessionStart =
          verified?.session?.sessionStartTime ||
          verified?.order?.session?.sessionStartTime ||
          routeSessionStartTime ||
          null;
        const resolvedShowDate = bookedSessionStart
          ? `${formatDate(bookedSessionStart)} • ${formatTime(bookedSessionStart)}`
          : ticketMeta?.dateTime || sessionMeta?.dateTime || null;

        let resolvedTickets =
          verified?.order?.tickets ||
          verified?.tickets;

        if (!resolvedTickets || !resolvedTickets.length) {
          try {
            const lookup = await api.getOrder(resolvedOrderNumber || resolvedOrderId);
            if (lookup?.order?.tickets?.length) {
              resolvedTickets = lookup.order.tickets;
            }
          } catch {}
        }

        // Never synthesize fake tickets — use authoritative server tickets only
        const finalTickets = Array.isArray(resolvedTickets) ? resolvedTickets : [];

        // Cache rich order immediately for instant zero-lag rendering in MyTicketsScreen
        const fullOrderForCache = {
          ...verified?.order,
          id: resolvedOrderId,
          orderNumber: resolvedOrderNumber,
          eventId,
          sessionId,
          grandTotal: verified?.order?.grandTotal || grandTotal,
          paymentStatus: 'paid',
          orderStatus: 'confirmed',
          createdAt: new Date().toISOString(),
          event: verified?.order?.event || {
            id: eventId,
            title: resolvedEventTitle,
            titleMr: resolvedEventTitle,
            posterUrl,
            venue: {
              name: resolvedVenue,
              nameMr: resolvedVenue,
              city: 'Pune',
            },
          },
          session: {
            ...(verified?.session || verified?.order?.session || {}),
            id:
              verified?.session?.id ||
              verified?.order?.session?.id ||
              sessionId,
            sessionStartTime:
              bookedSessionStart ||
              verified?.session?.sessionStartTime ||
              verified?.order?.session?.sessionStartTime ||
              null,
          },
          tickets: finalTickets,
          pdfDownloadToken:
            verified?.pdfDownloadToken ||
            verified?.order?.pdfDownloadToken ||
            null,
        };

        try {
          const myStr = await AsyncStorage.getItem('@tg_my_orders');
          const myOrders = myStr ? JSON.parse(myStr) : [];
          const deduped = Array.isArray(myOrders)
            ? myOrders.filter((o: any) => o.orderNumber !== resolvedOrderNumber)
            : [];
          deduped.unshift(fullOrderForCache);
          await AsyncStorage.setItem('@tg_my_orders', JSON.stringify(deduped.slice(0, 30)));
        } catch {}

        // Clear session seats cache so refreshed map immediately shows booked seats
        clearSessionSeatsCache(sessionId);

        // Direct reset to BookingConfirmed so checkout is completely unmounted from the background
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: 'BookingConfirmed',
                params: {
                  orderId: resolvedOrderId,
                  orderNumber: resolvedOrderNumber,
                  eventTitle: resolvedEventTitle,
                  seatCodes:
                    finalTickets.map((t: any) => t.seatCode).filter(Boolean).length > 0
                      ? finalTickets.map((t: any) => t.seatCode)
                      : displayedSeatCodes,
                  grandTotal: verified?.order?.grandTotal || grandTotal,
                  venueName: resolvedVenue,
                  sessionMeta: sessionMeta || ticketMeta,
                  sessionStartTime: bookedSessionStart,
                  showDateStr: resolvedShowDate,
                  tickets: finalTickets,
                },
              },
            ],
          })
        );
      } else {
        throw new Error(verified?.message || verified?.error || 'Payment confirmation failed');
      }
    } catch (err: any) {
      if (paymentDoneRef.current) {
        // Customer was charged! Never display "Payment Failed"
        setStage('reconciliation_pending');
        setCheckoutModal({
          visible: true,
          type: 'warning',
          title: 'पेमेंट प्राप्त झाले — तिकीट पडताळणी प्रलंबित (Payment Received)',
          message:
            'तुमचे पेमेंट यशस्वीरित्या कापले गेले आहे. नेटवर्क विलंबाने सर्व्हरकडून तिकीट पुष्टी मिळणे बाकी आहे. तुमचे पैसे पूर्णपणे सुरक्षित आहेत.\n\nकृपया खालील बटण दाबून तिकीट पडताळणी पूर्ण करा.',
          primaryButtonText: 'स्थिती तपासा (Check Status)',
          onPrimaryPress: () => {
            setCheckoutModal(null);
            checkPendingReconciliation();
          },
          secondaryButtonText: 'माझी तिकिटे (My Tickets)',
          onSecondaryPress: () => {
            setCheckoutModal(null);
            navigation.navigate('MyTickets');
          },
        });
        return;
      }

      // Normal failure BEFORE customer was charged
      setStage('idle');
      const { title, message } = formatPaymentErrorMessage(err);
      setCheckoutModal({
        visible: true,
        type: 'error',
        title: title || 'पेमेंट त्रुटी (Payment Error)',
        message:
          message ||
          'पेमेंट पूर्ण करताना त्रुटी आली. आपले सीट सुरक्षित आहेत, कृपया पुन्हा प्रयत्न करा.',
        primaryButtonText: 'पुन्हा प्रयत्न करा (Retry)',
        onPrimaryPress: () => setCheckoutModal(null),
        secondaryButtonText: 'मागे जा (Go to Seats)',
        onSecondaryPress: () => {
          setCheckoutModal(null);
          navigation.goBack();
        },
      });
    } finally {
      if (!paymentDoneRef.current) {
        setStage('idle');
      }
    }
  };

  const checkPendingReconciliation = async (customRec?: any) => {
    let rec = customRec;
    if (!rec) {
      try {
        const raw = await AsyncStorage.getItem('@tg_pending_payment_reconciliation');
        if (raw) rec = JSON.parse(raw);
      } catch {}
    }
    if (!rec?.razorpay_payment_id) {
      setCheckoutModal({
        visible: true,
        type: 'info',
        title: 'माहिती उपलब्ध नाही',
        message: 'कोणतीही प्रलंबित पेमेंट नोंद आढळली नाही.',
        primaryButtonText: 'OK',
        onPrimaryPress: () => setCheckoutModal(null),
      });
      return;
    }

    setStage('verifying_payment');
    try {
      const verified = await api.verifyPayment({
        sessionId: rec.sessionId,
        eventId: rec.eventId,
        seatIds: rec.seatIds,
        userName: rec.userName,
        userEmail: rec.userEmail,
        userPhone: rec.userPhone,
        couponCode: rec.couponCode,
        razorpay_order_id: rec.razorpay_order_id,
        razorpay_payment_id: rec.razorpay_payment_id,
        razorpay_signature: rec.razorpay_signature,
      });

      if (verified?.success || verified?.orderId || verified?.id || verified?.order) {
        await AsyncStorage.removeItem('@tg_pending_payment_reconciliation');
        paymentDoneRef.current = true;
        clearSessionSeatsCache(rec.sessionId);

        let finalTickets = verified?.order?.tickets || verified?.tickets;
        let finalOrder = verified?.order || verified;
        const resolvedOrderId = verified?.orderId || verified?.bookingId || verified?.order?.id;
        const resolvedOrderNumber =
          verified?.orderNumber || verified?.order?.orderNumber || rec.razorpay_order_id;

        if (!finalTickets || !finalTickets.length) {
          try {
            const lookup = await api.getOrder(resolvedOrderNumber || resolvedOrderId);
            if (lookup?.order?.tickets?.length) {
              finalTickets = lookup.order.tickets;
              finalOrder = lookup.order;
            }
          } catch {}
        }

        const validTickets = Array.isArray(finalTickets) ? finalTickets : [];

        if (validTickets.length > 0) {
          const fullOrderForCache = {
            ...finalOrder,
            id: resolvedOrderId,
            orderNumber: resolvedOrderNumber,
            eventId: rec.eventId,
            sessionId: rec.sessionId,
            grandTotal: finalOrder?.grandTotal || rec.amount,
            paymentStatus: 'paid',
            orderStatus: 'confirmed',
            createdAt: finalOrder?.createdAt || new Date().toISOString(),
            tickets: validTickets,
          };
          try {
            const myStr = await AsyncStorage.getItem('@tg_my_orders');
            const myOrders = myStr ? JSON.parse(myStr) : [];
            const deduped = Array.isArray(myOrders)
              ? myOrders.filter((o: any) => o.orderNumber !== resolvedOrderNumber)
              : [];
            deduped.unshift(fullOrderForCache);
            await AsyncStorage.setItem('@tg_my_orders', JSON.stringify(deduped.slice(0, 30)));
          } catch {}
        }

        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: 'BookingConfirmed',
                params: {
                  orderId: resolvedOrderId,
                  orderNumber: resolvedOrderNumber,
                  eventTitle: rec.eventTitle,
                  seatCodes: rec.seatCodes,
                  grandTotal: rec.amount,
                  venueName: rec.venueName,
                  sessionMeta: rec.sessionMeta,
                  sessionStartTime: rec.sessionStartTime,
                  tickets: validTickets,
                },
              },
            ],
          })
        );
      } else {
        throw new Error(verified?.message || 'Verification incomplete');
      }
    } catch (vErr: any) {
      setStage('reconciliation_pending');
      setCheckoutModal({
        visible: true,
        type: 'warning',
        title: 'पडताळणी प्रलंबित (Verification Pending)',
        message:
          'सर्व्हरकडून अद्याप पुष्टी मिळालेली नाही. तुमचे पैसे सुरक्षित आहेत. काही क्षणात पुन्हा तपासा.',
        primaryButtonText: 'पुन्हा तपासा (Check Again)',
        onPrimaryPress: () => {
          setCheckoutModal(null);
          checkPendingReconciliation(rec);
        },
        secondaryButtonText: 'माझी तिकिटे (My Tickets)',
        onSecondaryPress: () => {
          setCheckoutModal(null);
          navigation.navigate('MyTickets');
        },
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 8}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <BackHeader title={language === 'mr' ? 'तिकीट बुकिंग' : 'Checkout'} onBack={handleDiscardAndBack} />


      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.scroll}
      >
        <TicketCardFrame
          notchRadius={6}
          borderRadius={RADIUS.lg}
          backgroundColor={COLORS.surface}
        >
          <View style={styles.ticketCard}>
            <View style={styles.ticketMain}>
              <View style={styles.ticketPosterWrap}>
                {posterUrl ? (
                  <Image source={{ uri: posterUrl }} style={styles.ticketPoster} resizeMode="cover" />
                ) : (
                  <View style={styles.ticketPosterFallback}>
                    <Icon name="ticket-confirmation-outline" size={22} color={COLORS.primary} />
                  </View>
                )}
              </View>

              <View style={styles.ticketCopy}>
                <Text style={styles.ticketEyebrow}>Ticket Pass</Text>
                <Text style={styles.ticketTitle} numberOfLines={2}>
                  {eventTitle || 'Selected event'}
                </Text>

                <View style={styles.ticketMetaRow}>
                  <Icon name="calendar-blank-outline" size={15} color={COLORS.primary} />
                  <Text style={styles.ticketMetaText} numberOfLines={1}>
                    {ticketMeta.dateTime}
                  </Text>
                </View>

                <View style={styles.ticketMetaRow}>
                  <Icon name="map-marker-outline" size={15} color={COLORS.primary} />
                  <Text style={styles.ticketMetaText} numberOfLines={1}>
                    {ticketMeta.venue}
                  </Text>
                </View>

                <View style={styles.ticketMetaRow}>
                  <Icon name="seat-outline" size={15} color={COLORS.primary} />
                  <Text style={styles.ticketMetaText} numberOfLines={1}>
                    {seatSummary}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.ticketStub}>
              <Text style={styles.ticketStubLabel}>Tickets</Text>
              <Text style={styles.ticketStubValue}>{ticketCount}</Text>
            </View>
          </View>
        </TicketCardFrame>

        {/* Modern Contact Details Form Card */}
        <View style={styles.modernCard}>
          <View style={styles.cardHeaderRow}>
            <Icon name="account-circle-outline" size={20} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.modernCardTitle}>
                {language === 'mr' ? '१. ग्राहक संपर्क माहिती' : '1. Contact & Attendee Details'}
              </Text>
              <Text style={styles.modernCardSubtitle}>
                {language === 'mr' ? 'तिकीट व एसएमएस या माहितीवर पाठवले जाईल' : 'E-ticket & SMS will be sent to these details'}
              </Text>
            </View>
          </View>

          {fieldError ? (
            <View style={styles.inlineError}>
              <Icon name="alert-circle-outline" size={16} color={COLORS.danger} />
              <Text style={styles.inlineErrorText}>{fieldError}</Text>
            </View>
          ) : null}

          {/* Form Fields */}

          {/* Name Field */}
          <View style={styles.formFieldBox}>
            <Text style={styles.formFieldLabel}>
              {language === 'mr' ? 'पूर्ण नाव' : 'FULL NAME'}
            </Text>
            <View style={styles.formFieldInputRow}>
              <Icon name="account-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                ref={nameRef}
                style={[styles.modernTextInput, paying && styles.inputLocked]}
                placeholder={language === 'mr' ? 'प्रेक्षकाचे पूर्ण नाव' : 'Attendee full name'}
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  setFieldError(null);
                }}
                editable={!paying}
                returnKeyType="next"
                textContentType="name"
                autoComplete="name"
                onSubmitEditing={() => phoneRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Phone Field with Country Code Badge */}
          <View style={styles.formFieldBox}>
            <Text style={styles.formFieldLabel}>
              {language === 'mr' ? 'मोबाईल नंबर' : 'MOBILE NUMBER'}
            </Text>
            <View style={styles.formFieldInputRow}>
              <View style={styles.countryCodeBadge}>
                <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
              </View>
              <TextInput
                ref={phoneRef}
                style={[styles.modernTextInput, paying && styles.inputLocked]}
                placeholder={language === 'mr' ? '१०-अंकी मोबाईल नंबर' : '10-digit mobile number'}
                placeholderTextColor="#94A3B8"
                value={phone}
                onChangeText={(t) => {
                  setPhone(cleanIndianMobile(t));
                  setFieldError(null);
                }}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!paying}
                returnKeyType="next"
                textContentType="telephoneNumber"
                autoComplete="tel"
                onSubmitEditing={() => ageRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Age Field */}
          <View style={styles.formFieldBox}>
            <Text style={styles.formFieldLabel}>
              {language === 'mr' ? 'वय' : 'AGE'}
            </Text>
            <View style={styles.formFieldInputRow}>
              <Icon name="calendar-account-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                ref={ageRef}
                style={[styles.modernTextInput, paying && styles.inputLocked]}
                placeholder={language === 'mr' ? 'वय (उदा. २८)' : 'Attendee age (e.g. 28)'}
                placeholderTextColor="#94A3B8"
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                maxLength={3}
                editable={!paying}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Email Field */}
          <View style={styles.formFieldBox}>
            <Text style={styles.formFieldLabel}>
              {language === 'mr' ? 'ईमेल पत्ता' : 'EMAIL ADDRESS'}
            </Text>
            <View style={styles.formFieldInputRow}>
              <Icon name="email-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                ref={emailRef}
                style={[styles.modernTextInput, paying && styles.inputLocked]}
                placeholder={language === 'mr' ? 'तिकीट व पावतीसाठी ईमेल' : 'For instant PDF pass & booking receipt'}
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={(t) => {
                  setEmail(t.trim());
                  setFieldError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!paying}
                returnKeyType="done"
                textContentType="emailAddress"
                autoComplete="email"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            </View>
          </View>
        </View>

        {/* Offers & Coupons Card */}
        <View style={styles.modernCard}>
          <View style={styles.cardHeaderRow}>
            <Icon name="ticket-percent-outline" size={20} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.modernCardTitle}>
                {language === 'mr' ? '२. उपलब्ध ऑफर्स व प्रोमो कोड' : '2. Offers & Promo Code'}
              </Text>
              <Text style={styles.modernCardSubtitle}>
                {language === 'mr' ? 'थेट सवलत मिळवण्यासाठी कूपनवर क्लिक करा किंवा कोड टाका' : 'Tap an offer or enter code to save instantly'}
              </Text>
            </View>
          </View>

          {/* Quick coupons - tap to apply directly */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickCouponRow}>
            {(availableCoupons.length > 0
              ? availableCoupons
              : [
                  { code: 'NATAK10', description: language === 'mr' ? '१०% सवलत' : '10% off' },
                  { code: 'MAHA20', description: language === 'mr' ? '२०% विशेष सवलत' : '20% special discount' },
                  { code: 'MAHA50', description: language === 'mr' ? '₹५० थेट सवलत' : 'Flat ₹50 off' },
                ]
            ).map((c: any) => {
              const isApplied = appliedCoupon === String(c.code);
              return (
                <TouchableOpacity
                  key={String(c.id || c.code)}
                  onPress={() => {
                    if (!isApplied) {
                      setCouponInput(String(c.code));
                      applyCouponCode(String(c.code));
                    }
                  }}
                  style={[styles.quickCouponPill, isApplied && styles.quickCouponPillActive]}
                  disabled={paying}
                  activeOpacity={0.75}
                >
                  <Icon
                    name={isApplied ? 'check-circle' : 'tag'}
                    size={13}
                    color={isApplied ? '#059669' : '#EA580C'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.quickCouponCode, isApplied && styles.quickCouponCodeActive]}>
                    {c.code}
                  </Text>
                  {c.description ? (
                    <Text
                      style={[styles.quickCouponSave, isApplied && styles.quickCouponSaveActive]}
                      numberOfLines={1}
                    >
                      • {c.description}
                    </Text>
                  ) : null}
                  {isApplied ? (
                    <Text style={styles.appliedPillBadge}>
                      {language === 'mr' ? 'लागू झाले' : 'Applied'}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {appliedCoupon ? (
            <View style={styles.appliedCoupon}>
              <View style={{ flex: 1 }}>
                <Text style={styles.appliedCouponText}>
                  ✓ {appliedCoupon} {language === 'mr' ? 'लागू झाले' : 'Applied'}
                </Text>
                <Text style={styles.appliedCouponSub}>
                  {language === 'mr' ? `बचत ${paise(appliedDiscount)}` : `Saved ${paise(appliedDiscount)}`}
                </Text>
              </View>
              <TouchableOpacity onPress={removeCoupon} style={styles.removeCouponChip} disabled={paying}>
                <Icon name="close-circle" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.couponRow}>
                <TextInput
                  style={[styles.textInput, styles.couponInput, paying && styles.inputLocked]}
                  placeholder={language === 'mr' ? 'कूपन कोड टाका' : 'Enter coupon code'}
                  placeholderTextColor={COLORS.textDim}
                  value={couponInput}
                  onChangeText={(t) => { setCouponInput(t.toUpperCase()); setCouponMsg(null); }}
                  autoCapitalize="characters"
                  editable={!paying}
                />
                <TouchableOpacity
                  onPress={() => applyCouponCode(couponInput)}
                  style={[
                    styles.offerApplyButton,
                    (!couponInput.trim() || paying || couponLoading) && styles.offerApplyButtonDisabled,
                  ]}
                  disabled={!couponInput.trim() || paying || couponLoading}
                >
                  {couponLoading ? (
                    <ActivityIndicator size="small" color={COLORS.surface} />
                  ) : (
                    <Text style={styles.offerApplyButtonText}>
                      {language === 'mr' ? 'लागू करा' : 'Apply'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              {couponMsg && (
                <Text style={[styles.couponMsg, { color: couponMsg.valid ? COLORS.success : COLORS.danger }]}>
                  {couponMsg.text}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Price Details Card */}
        <View style={styles.modernCard}>
          <View style={styles.cardHeaderRow}>
            <Icon name="receipt-text-outline" size={20} color={COLORS.primary} />
            <Text style={styles.modernCardTitle}>
              {language === 'mr' ? '३. तिकीट दर व आकार' : '3. Price Details'}
            </Text>
          </View>
          <PriceRow
            label={language === 'mr' ? `तिकिटे (${ticketCount})` : `Tickets (${ticketCount})`}
            value={paise(faceValue)}
          />
          {addonTotal > 0 && (
            <PriceRow
              label={language === 'mr' ? 'अतिरिक्त सेवा' : 'Add-ons'}
              value={paise(addonTotal)}
            />
          )}
          {platformFee > 0 && (
            <PriceRow
              label={language === 'mr' ? `प्लॅटफॉर्म फी (${ticketCount})` : `Convenience fee (${ticketCount})`}
              value={paise(platformFee)}
            />
          )}
          {tax > 0 && (
            <PriceRow
              label={language === 'mr' ? 'जीएसटी (१८%)' : 'GST (18%)'}
              value={paise(tax)}
            />
          )}
          {appliedDiscount > 0 && (
            <PriceRow
              label={language === 'mr' ? 'सवलत (Discount)' : 'Discount'}
              value={`-${paise(appliedDiscount)}`}
            />
          )}
          <Divider />
          <PriceRow
            label={language === 'mr' ? 'एकूण देय रक्कम' : 'Grand Total'}
            value={paise(grandTotal)}
            highlight
          />
        </View>

        {/* Security Trust Strip */}
        <View style={styles.securityTrustRow}>
          <Icon name="shield-check" size={16} color="#16A34A" style={{ marginRight: 6 }} />
          <Text style={styles.securityTrustText}>
            {language === 'mr'
              ? 'सुरक्षित व्यवहार • Razorpay'
              : 'Secure Payment • Powered by Razorpay'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('PolicyViewer', { type: 'terms' })}
          style={styles.legalLink}
          activeOpacity={0.8}
        >
          <Text style={styles.legalLinkText}>
            {language === 'mr' ? (
              <>पुढे जाऊन, आपण <Text style={styles.legalLinkTextStrong}>नियम व अटींशी</Text> सहमत आहात.</>
            ) : (
              <>By proceeding, you agree to the <Text style={styles.legalLinkTextStrong}>Terms & Conditions</Text>.</>
            )}
          </Text>
        </TouchableOpacity>

        {/* Clean bottom spacing without huge empty gap */}
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Sticky Bottom Bar with Live Payment Text */}
      <View style={[styles.ctaBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
        <View style={{ marginRight: 14 }}>
          <Text style={styles.totalLabel}>
            {language === 'mr' ? 'एकूण रक्कम' : 'Grand Total'}
          </Text>
          <Text style={styles.totalVal}>{paise(grandTotal)}</Text>
        </View>
        <TouchableOpacity
          onPress={handlePayment}
          disabled={paying}
          activeOpacity={0.85}
          style={[
            styles.payBtn,
            paying && styles.payBtnDisabled,
          ]}
        >
          {paying ? (
            <View style={styles.payBtnLiveRow}>
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.payBtnLiveText} numberOfLines={1}>
                {stage === 'verifying_payment' || stage === 'confirming_booking'
                  ? (language === 'mr' ? 'तिकीट तयार होत आहे...' : 'Confirming ticket...')
                  : stage === 'opening_gateway'
                  ? (language === 'mr' ? 'गेटवे उघडत आहे...' : 'Opening gateway...')
                  : (language === 'mr' ? 'पेमेंट प्रक्रिया सुरू आहे...' : 'Processing payment...')}
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="shield-lock-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.payBtnText}>
                {language === 'mr' ? `${paise(grandTotal)} भरा` : `Pay ${paise(grandTotal)}`}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Professional Centered Payment Processing Modal with Live Status Message */}
      <Modal visible={paying} transparent animationType="fade">
        <View style={styles.paymentModalBackdrop}>
          <View style={styles.paymentModalCard}>
            <ActivityIndicator size="large" color="#EA580C" style={{ marginBottom: 16 }} />
            <Text style={styles.paymentModalTitle}>
              {stage === 'verifying_payment' || stage === 'confirming_booking'
                ? 'तिकीट कन्फर्म केले जात आहे...'
                : stage === 'opening_gateway'
                ? 'पेमेंट गेटवे उघडत आहे...'
                : 'सुरक्षित पेमेंट प्रक्रिया सुरू आहे...'}
            </Text>
            <Text style={styles.paymentModalSub}>
              {stage === 'verifying_payment' || stage === 'confirming_booking'
                ? 'Generating Confirmed Ticket Pass'
                : stage === 'opening_gateway'
                ? 'Connecting to Secure Gateway'
                : 'Processing Payment...'}
            </Text>
            <Text style={styles.paymentModalWarning}>
              कृपया बॅक बटण दाबू नका किंवा स्क्रीन बंद करू नका.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Modern In-App Popup Modal for errors & alerts */}
      {checkoutModal ? (
        <MTPopupModal
          visible={checkoutModal.visible}
          type={checkoutModal.type || 'warning'}
          title={checkoutModal.title}
          message={checkoutModal.message}
          primaryButtonText={checkoutModal.primaryButtonText}
          onPrimaryPress={checkoutModal.onPrimaryPress}
          secondaryButtonText={checkoutModal.secondaryButtonText}
          onSecondaryPress={checkoutModal.onSecondaryPress}
          onRequestClose={() => setCheckoutModal(null)}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: SPACING.base, gap: SPACING.md, paddingBottom: 110 },

  timerPillBanner: {
    paddingHorizontal: SPACING.base,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  timerPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerPillLabel: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: 12,
  },
  timerPillLock: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: 11,
  },

  modernCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  modernCardTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  modernCardSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },

  formFieldBox: {
    gap: 5,
  },
  verifyEmailBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  verifyEmailBtnText: {
    color: '#EA580C',
    fontWeight: '800',
    fontSize: 12,
  },
  authOkText: {
    marginTop: 6,
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  authErrText: {
    marginTop: 6,
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  authBox: {
    marginTop: 8,
    gap: 8,
  },
  authInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: '#0F172A',
    fontWeight: '600',
  },
  authPrimaryBtn: {
    backgroundColor: '#EA580C',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  authPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  authLinkText: {
    color: '#EA580C',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  formFieldLabel: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  formFieldInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  modernTextInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
  },
  countryCodeBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 10,
  },
  countryCodeText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },

  quickCouponRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  quickCouponPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quickCouponCode: {
    color: '#EA580C',
    fontSize: 12,
    fontWeight: '900',
  },
  quickCouponSave: {
    color: '#9A3412',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  quickCouponPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  quickCouponCodeActive: {
    color: '#059669',
  },
  quickCouponSaveActive: {
    color: '#047857',
  },
  appliedPillBadge: {
    backgroundColor: '#059669',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  paymentMethodText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  secureGatewayNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  secureGatewayNoticeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },

  securityTrustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 4,
  },
  securityTrustText: {
    color: '#15803D',
    fontSize: 11.5,
    fontWeight: '700',
  },
  ticketCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  ticketMain: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    padding: SPACING.base,
  },
  ticketPosterWrap: {
    width: 64,
    height: 88,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ticketPoster: {
    width: '100%',
    height: '100%',
  },
  ticketPosterFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketCopy: {
    flex: 1,
    gap: 6,
  },
  ticketEyebrow: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ticketTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  ticketMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketMetaText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  ticketStub: {
    width: 72,
    backgroundColor: COLORS.surface2,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
  },
  ticketStubLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ticketStubValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
  },

  fieldLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 2,
  },
  textInput: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  inputLocked: { opacity: 0.6, backgroundColor: COLORS.surface2 },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.dangerBg,
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
  },
  inlineErrorText: { flex: 1, color: COLORS.danger, fontSize: 12, fontWeight: '700' },
  payingLock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(234,88,12,0.1)',
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(234,88,12,0.25)',
  },
  payingLockText: { flex: 1, fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  phoneRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 },
  phonePrefix: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  phonePrefixText: { color: COLORS.text, fontWeight: '700', fontSize: 14 },

  couponCarousel: { gap: 10, paddingVertical: 2, marginBottom: 2 },
  couponChip: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  couponChipCopy: { flex: 1, gap: 2 },
  couponChipCode: { color: COLORS.text, fontWeight: '800', fontSize: 13 },
  couponChipDesc: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  chipAction: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActionDisabled: { opacity: 0.5 },
  chipActionText: { color: COLORS.primary, fontWeight: '800', fontSize: 11 },

  couponRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  couponInput: { flex: 1, marginBottom: 0 },
  appliedCoupon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successBg,
    borderRadius: RADIUS.md,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.success + '33',
  },
  appliedCouponText: { color: COLORS.success, fontWeight: '800', fontSize: 13, textTransform: 'uppercase' },
  appliedCouponSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  removeCouponChip: { padding: 4 },
  couponMsg: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  offerApplyButton: {
    minWidth: 84,
    minHeight: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  offerApplyButtonDisabled: { opacity: 0.6 },
  offerApplyButtonText: { color: COLORS.surface, fontSize: 13, fontWeight: '800' },

  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.base,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    ...SHADOWS.sm,
    elevation: 12,
  },
  totalLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  totalVal: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    paddingBottom: 2,
  },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    minHeight: 52,
    maxWidth: '68%',
  },
  payBtnDisabled: {
    opacity: 0.5,
  },
  payBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
  },
  payBtnLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    maxWidth: '100%',
  },
  payBtnLiveText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
    flexShrink: 1,
  },
  legalLink: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  legalLinkText: {
    color: COLORS.textDim,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  legalLinkTextStrong: {
    color: COLORS.primary,
    fontWeight: '800',
  },

  paymentModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  paymentModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    elevation: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  paymentModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  paymentModalSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  paymentModalSecurityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    gap: 6,
    marginTop: 16,
    marginBottom: 12,
  },
  paymentModalSecurityText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '700',
  },
  paymentModalWarning: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
});
