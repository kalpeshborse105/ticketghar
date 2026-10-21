/**
 * CheckoutScreen — compact checkout with a ticket-first layout and Razorpay payment.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, RADIUS, SPACING } from '../theme';
import { api, paise } from '../api';
import { useCartStore, useAuthStore } from '../store';
import RazorpayCheckout from 'react-native-razorpay';
import { BackHeader, CountdownTimer, Divider, PriceRow, TicketCardFrame } from '../components';

function digitsOnlyPhone(raw?: string | null) {
  return String(raw || '')
    .replace(/\D/g, '')
    .replace(/^91/, '')
    .slice(-10);
}

function formatPaymentErrorMessage(err: any): { title: string; message: string } {
  if (!err) {
    return {
      title: 'Payment Incomplete (व्यवहार अपूर्ण)',
      message: 'Payment could not be completed. Your seats are still held active. Please retry.\n\nपेमेंट पूर्ण होऊ शकले नाही. आपले सीट अजूनही सुरक्षित (hold) आहेत, कृपया पुन्हा प्रयत्न करा.',
    };
  }

  const rawStr = typeof err === 'string' ? err : JSON.stringify(err || {});
  let parsed: any = null;
  if (typeof err === 'string') {
    try {
      parsed = JSON.parse(err);
    } catch {}
  } else if (typeof err === 'object') {
    parsed = err;
  }

  const rzp = parsed?.error || parsed;
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

  const reason = rzp?.reason;
  const desc = rzp?.description;

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
    message: 'We were unable to complete the transaction. Your seats are reserved during this session. Please try again.\n\nव्यवहार पूर्ण होऊ शकला नाही. आपले सीट सुरक्षित आहेत, कृपया पुन्हा प्रयत्न करा.',
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
    venueName,
    platformFeeTotal: routePlatformFeeTotal,
    taxTotal: routeTaxTotal,
  } = route.params;

  const { user } = useAuthStore();
  const { setRazorpayOrder } = useCartStore();

  // Contact — BMS order: name → phone → email
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(digitsOnlyPhone(user?.phone));
  const [fieldError, setFieldError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const nameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  useEffect(() => {
    if (user?.name && !name) setName(user.name);
    if (user?.email && !email) setEmail(user.email);
    const p = digitsOnlyPhone(user?.phone);
    if (p && !phone) setPhone(p);
  }, [user]);

  // Coupons
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ valid: boolean; text: string } | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const [paying, setPaying] = useState(false);
  const displayedSeatCodes = useMemo(
    () => Array.from(new Set((Array.isArray(seatCodes) ? seatCodes : []).filter(Boolean))),
    [seatCodes]
  );

  // Authoritative hold countdown
  const [countdown, setCountdown] = useState(() => {
    if (!expiresAt) return 300;
    const diff = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
    return diff > 0 ? diff : 300;
  });

  const countdownRef = useRef<ReturnType<typeof setInterval>>();

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

  // Countdown timer ticking
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current);
          Alert.alert(
            'Seat Hold Expired',
            'Your temporary seat hold has expired. Please choose your seats again.',
            [{ text: 'OK', onPress: () => handleDiscardAndBack() }]
          );
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
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

  // Release hold on back
  const handleDiscardAndBack = async () => {
    try {
      if (sessionId && holdToken) {
        await api.releaseHold({ sessionId, holdToken, seatIds });
      }
    } catch {}
    navigation.goBack();
  };

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

  const focusField = (which: 'name' | 'phone' | 'email') => {
    scrollRef.current?.scrollTo({ y: 120, animated: true });
    requestAnimationFrame(() => {
      if (which === 'name') nameRef.current?.focus();
      if (which === 'phone') phoneRef.current?.focus();
      if (which === 'email') emailRef.current?.focus();
    });
  };

  const handlePayment = async () => {
    Keyboard.dismiss();
    const cleanPhone = digitsOnlyPhone(phone);
    setFieldError(null);

    if (!name.trim()) {
      setFieldError('Enter the ticket holder name.');
      focusField('name');
      return;
    }
    if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setFieldError('Enter a valid 10-digit mobile number.');
      focusField('phone');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFieldError('Enter a valid email for your e-ticket.');
      focusField('email');
      return;
    }
    if (countdown <= 0) {
      Alert.alert('Reservation Expired', 'Seat hold reservation has expired. Please select seats again.');
      return;
    }

    setPaying(true);
    try {
      // Step 1: Create backend Razorpay order (extends seat hold)
      const orderData = await api.createRazorpayOrder({
        sessionId,
        seatIds,
        couponCode: appliedCoupon || null,
        holdToken,
      });

      if (!orderData?.orderId || !orderData?.keyId) {
        throw new Error(orderData?.error || 'Could not create the payment order.');
      }

      setRazorpayOrder(orderData.orderId, 0);

      // Step 2: Open native Razorpay Checkout (parity with web CheckoutDrawer)
      const paymentSuccessData = await RazorpayCheckout.open({
        key: orderData.keyId,
        amount: String(orderData.amount ?? grandTotal),
        currency: orderData.currency || 'INR',
        name: 'MahaTicket',
        description: eventTitle || 'Event tickets',
        order_id: orderData.orderId,
        prefill: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          contact: `+91${cleanPhone}`,
        },
        theme: { color: '#EA580C' },
      });

      // Step 3: Server-side signature verify → confirm booking
      const payload: any = {
        sessionId,
        eventId: eventId || 1,
        seatIds,
        userName: name.trim(),
        userEmail: email.trim().toLowerCase(),
        userPhone: cleanPhone,
        couponCode: appliedCoupon || null,
        razorpay_order_id: paymentSuccessData.razorpay_order_id,
        razorpay_payment_id: paymentSuccessData.razorpay_payment_id,
        razorpay_signature: paymentSuccessData.razorpay_signature,
      };

      let verified: any = null;
      try {
        verified = await api.verifyPayment(payload);
      } catch {
        verified = await api.confirmBooking({
          ...payload,
          userPhone: `+91${cleanPhone}`,
          paymentDetails: { gateway: 'razorpay', status: 'authorized', ...payload },
        });
      }

      if (verified?.success || verified?.orderNumber || verified?.order) {
        // Leave checkout permanently — show pass, then My Tickets
        navigation.reset({
          index: 1,
          routes: [
            { name: 'Main', state: { routes: [{ name: 'Tickets' }], index: 0 } },
            {
              name: 'BookingConfirmed',
              params: {
                orderId: verified.orderId || verified.bookingId || verified?.order?.id || 1,
                orderNumber:
                  verified.orderNumber ||
                  verified?.order?.orderNumber ||
                  `MT-${Date.now().toString().slice(-6)}`,
                eventTitle:
                  verified?.order?.event?.titleMr ||
                  verified?.order?.event?.title ||
                  eventTitle,
                seatCodes:
                  verified?.order?.tickets?.map((t: any) => t.seatCode) || seatCodes,
                grandTotal: verified?.order?.grandTotal || grandTotal,
              },
            },
          ],
        });
      } else {
        throw new Error(verified?.message || verified?.error || 'Payment confirmation failed');
      }
    } catch (err: any) {
      const { title, message } = formatPaymentErrorMessage(err);
      Alert.alert(
        title,
        message,
        [
          {
            text: 'Go to Seats',
            onPress: () => navigation.goBack(),
          },
          {
            text: 'Retry',
            style: 'default',
          },
        ]
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 8}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <BackHeader title="Checkout" onBack={handleDiscardAndBack} />

      {/* Professional Session Active Banner */}
      <View style={styles.timerPillBanner}>
        <View style={styles.timerPillBox}>
          <Icon name="clock-outline" size={15} color="#D97706" style={{ marginRight: 6 }} />
          <Text style={styles.timerPillLabel}>Booking Session Active: </Text>
          <CountdownTimer seconds={countdown} />
        </View>
      </View>

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
              <Text style={styles.modernCardTitle}>Contact & Attendee Details</Text>
              <Text style={styles.modernCardSubtitle}>E-ticket & SMS will be sent to these details</Text>
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
            <Text style={styles.formFieldLabel}>FULL NAME</Text>
            <View style={styles.formFieldInputRow}>
              <Icon name="account-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                ref={nameRef}
                style={[styles.modernTextInput, paying && styles.inputLocked]}
                placeholder="Attendee full name"
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
            <Text style={styles.formFieldLabel}>MOBILE NUMBER</Text>
            <View style={styles.formFieldInputRow}>
              <View style={styles.countryCodeBadge}>
                <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
              </View>
              <TextInput
                ref={phoneRef}
                style={[styles.modernTextInput, paying && styles.inputLocked]}
                placeholder="10-digit mobile number"
                placeholderTextColor="#94A3B8"
                value={phone}
                onChangeText={(t) => {
                  setPhone(digitsOnlyPhone(t));
                  setFieldError(null);
                }}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!paying}
                returnKeyType="next"
                textContentType="telephoneNumber"
                autoComplete="tel"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Email Field */}
          <View style={styles.formFieldBox}>
            <Text style={styles.formFieldLabel}>EMAIL ADDRESS</Text>
            <View style={styles.formFieldInputRow}>
              <Icon name="email-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                ref={emailRef}
                style={[styles.modernTextInput, paying && styles.inputLocked]}
                placeholder="For PDF ticket & invoice"
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
              <Text style={styles.modernCardTitle}>Offers & Promo Code</Text>
              <Text style={styles.modernCardSubtitle}>Apply coupon code to save instantly</Text>
            </View>
          </View>

          {/* Quick One-Tap Coupon Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickCouponRow}>
            <TouchableOpacity onPress={() => applyCouponCode('MAHA50')} style={styles.quickCouponPill}>
              <Icon name="tag" size={13} color="#EA580C" style={{ marginRight: 4 }} />
              <Text style={styles.quickCouponCode}>MAHA50</Text>
              <Text style={styles.quickCouponSave}>• Save ₹50</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => applyCouponCode('NATAK10')} style={styles.quickCouponPill}>
              <Icon name="tag" size={13} color="#EA580C" style={{ marginRight: 4 }} />
              <Text style={styles.quickCouponCode}>NATAK10</Text>
              <Text style={styles.quickCouponSave}>• 10% Off</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => applyCouponCode('CINEMA20')} style={styles.quickCouponPill}>
              <Icon name="tag" size={13} color="#EA580C" style={{ marginRight: 4 }} />
              <Text style={styles.quickCouponCode}>CINEMA20</Text>
              <Text style={styles.quickCouponSave}>• Save ₹20</Text>
            </TouchableOpacity>
          </ScrollView>

          {appliedCoupon ? (
            <View style={styles.appliedCoupon}>
              <View style={{ flex: 1 }}>
                <Text style={styles.appliedCouponText}>{appliedCoupon}</Text>
                <Text style={styles.appliedCouponSub}>Saved {paise(appliedDiscount)}</Text>
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
                  placeholder="Enter coupon code"
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
                    <Text style={styles.offerApplyButtonText}>Apply</Text>
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
            <Text style={styles.modernCardTitle}>Price Details</Text>
          </View>
          <PriceRow label={`Tickets (${ticketCount})`} value={paise(faceValue)} />
          {addonTotal > 0 && <PriceRow label="Add-ons" value={paise(addonTotal)} />}
          {platformFee > 0 && <PriceRow label={`Convenience fee (${ticketCount})`} value={paise(platformFee)} />}
          {tax > 0 && <PriceRow label="GST" value={paise(tax)} />}
          {appliedDiscount > 0 && (
            <PriceRow label="Discount" value={`-${paise(appliedDiscount)}`} />
          )}
          <Divider />
          <PriceRow label="Grand Total" value={paise(grandTotal)} highlight />
        </View>

        {/* Security Trust Strip */}
        <View style={styles.securityTrustRow}>
          <Icon name="shield-check" size={16} color="#16A34A" style={{ marginRight: 6 }} />
          <Text style={styles.securityTrustText}>100% Secure Checkout • Powered by Razorpay</Text>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('PolicyViewer', { type: 'terms' })}
          style={styles.legalLink}
          activeOpacity={0.8}
        >
          <Text style={styles.legalLinkText}>
            By proceeding, you agree to the <Text style={styles.legalLinkTextStrong}>Terms & Conditions</Text>.
          </Text>
        </TouchableOpacity>

        {/* Clean bottom spacing without huge empty gap */}
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.ctaBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
        <View style={{ marginRight: 14 }}>
          <Text style={styles.totalLabel}>Grand Total</Text>
          <Text style={styles.totalVal}>{paise(grandTotal)}</Text>
        </View>
        <TouchableOpacity
          onPress={handlePayment}
          disabled={paying || countdown <= 0}
          activeOpacity={0.85}
          style={[
            styles.payBtn,
            (paying || countdown <= 0) && styles.payBtnDisabled,
          ]}
        >
          <Icon name="shield-lock-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.payBtnText}>
            Pay {paise(grandTotal)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Professional Centered Payment Processing Modal */}
      <Modal visible={paying} transparent animationType="fade">
        <View style={styles.paymentModalBackdrop}>
          <View style={styles.paymentModalCard}>
            <ActivityIndicator size="large" color="#EA580C" style={{ marginBottom: 16 }} />
            <Text style={styles.paymentModalTitle}>सुरक्षित पेमेंट प्रक्रिया सुरू आहे...</Text>
            <Text style={styles.paymentModalSub}>Processing Secure Payment</Text>
            <View style={styles.paymentModalSecurityBadge}>
              <Icon name="shield-check" size={16} color="#16A34A" />
              <Text style={styles.paymentModalSecurityText}>256-Bit SSL Encrypted • RBI Approved Gateway</Text>
            </View>
            <Text style={styles.paymentModalWarning}>
              कृपया बॅक बटण दाबू नका किंवा स्क्रीन बंद करू नका.
            </Text>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: SPACING.base, gap: SPACING.md, paddingBottom: 24 },

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
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  totalVal: { color: COLORS.primary, fontSize: 22, fontWeight: '900' },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    minHeight: 48,
  },
  payBtnDisabled: {
    opacity: 0.5,
  },
  payBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
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
