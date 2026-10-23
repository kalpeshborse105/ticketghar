/**
 * LoginScreen — MahaTicket Android (महाटिकिट)
 * Smart booking-aware authentication flow:
 * 1. User enters booking email
 * 2. Checks database:
 *    - If password exists -> Asks for Password (+ Forgot Password OTP option)
 *    - If no password / new booking -> Auto-sends OTP -> Verifies OTP -> Sets new password
 * 3. Supports Google Sign-In and Continue as Guest
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../theme';
import { api } from '../api';
import { useAuthStore } from '../store';
import { openGoogleAuthInApp } from '../lib/openGoogleAuth';

const { height } = Dimensions.get('window');

type Step = 'email' | 'password' | 'otp' | 'set_password';

export default function LoginScreen({ navigation, route }: any) {
  const [email, setEmail] = useState(route.params?.initialEmail || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  /** Session token from OTP verify — required before set-password (server rejects email-only). */
  const [verifiedSessionToken, setVerifiedSessionToken] = useState<string>('');

  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      if (route.params?.onSuccess) {
        route.params.onSuccess();
        navigation.goBack();
      } else if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace('Main', { screen: 'Tickets' });
      }
    }
  }, [isAuthenticated, navigation, route.params]);

  const slideX = useRef(new Animated.Value(0)).current;
  const otpRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);

  const transitionTo = (nextStep: Step) => {
    Animated.timing(slideX, { toValue: -1, duration: 140, useNativeDriver: true }).start(() => {
      setStep(nextStep);
      setError('');
      slideX.setValue(1);
      Animated.timing(slideX, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
        if (nextStep === 'otp') otpRef.current?.focus();
        if (nextStep === 'password') passRef.current?.focus();
      });
    });
  };

  const finishAuth = async (user: any, token?: string) => {
    const validToken = token && typeof token === 'string' && token.includes('.') ? token : '';
    await setAuth(user, validToken);
    if (route.params?.onSuccess) {
      route.params.onSuccess();
      navigation.goBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('Main', { screen: 'Tickets' });
    }
  };

  // Step 1: Check Email
  const handleEmailSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('कृपया वैध ईमेल पत्ता प्रविष्ट करा (Enter a valid email address)');
      return;
    }
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const res = await api.checkEmail(cleanEmail);
      if (res && res.hasPassword) {
        // User has a password in DB -> prompt for password
        transitionTo('password');
      } else {
        // User has previous booking or account without password -> send OTP
        const otpRes = await api.sendEmailOtp(cleanEmail);
        setInfo(otpRes.message || '६-अंकी पडताळणी कोड आपल्या ईमेलवर पाठवला आहे.');
        transitionTo('otp');
      }
    } catch (err: any) {
      const errMsg =
        err?.data?.error ||
        err?.message ||
        'हा ईमेल नोंदणीकृत नाही. कृपया तिकीट बुकिंग करताना वापरलेला ईमेल प्रविष्ट करा.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2A: Password Login
  const handlePasswordLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError('कृपया आपला पासवर्ड प्रविष्ट करा (Password required)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.loginWithEmailPassword(cleanEmail, password);
      if (res.success && res.user) {
        await finishAuth(res.user, res.token);
      } else {
        setError(res.message || 'चुकीचा पासवर्ड. कृपया पुन्हा प्रयत्न करा.');
      }
    } catch (err: any) {
      setError(err?.message || 'चुकीचा ईमेल किंवा पासवर्ड.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger Forgot Password (Send OTP)
  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);
    setError('');
    try {
      const res = await api.sendEmailOtp(cleanEmail);
      setInfo(res.message || 'पासवर्ड रीसेट करण्यासाठी OTP पाठवला आहे.');
      transitionTo('otp');
    } catch (err: any) {
      setError(err?.message || 'OTP पाठवता आला नाही.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2B: Verify OTP
  const handleVerifyOtp = async () => {
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setError('कृपया ६-अंकी पडताळणी कोड प्रविष्ट करा (Enter 6-digit OTP)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.verifyEmailOtp(email, cleanOtp);
      if (res.success && res.user) {
        if (res.needsPasswordSetup) {
          // Persist OTP session so set-password can authorize by Bearer (not email alone)
          if (res.token && res.token.includes('.')) {
            setVerifiedSessionToken(res.token);
            await setAuth(res.user, res.token);
          }
          setInfo('पडताळणी यशस्वी! आता कायमस्वरूपी पासवर्ड तयार करा.');
          transitionTo('set_password');
        } else {
          await finishAuth(res.user, res.token);
        }
      } else {
        setError(res.message || 'अवैध OTP कोड. कृपया पुन्हा प्रयत्न करा.');
      }
    } catch (err: any) {
      setError(err?.message || 'OTP पडताळणी अयशस्वी झाली.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set New Password
  const handleSetPassword = async () => {
    if (!password || password.length < 6) {
      setError('पासवर्ड किमान ६ अक्षरांचा असावा (Minimum 6 characters)');
      return;
    }
    if (password !== confirmPassword) {
      setError('दोन्ही पासवर्ड जुळत नाहीत (Passwords do not match)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.setEmailPassword(email, password, verifiedSessionToken || undefined);
      if (res.success && res.user) {
        await finishAuth(res.user, res.token || verifiedSessionToken);
      } else {
        setError(res.message || 'पासवर्ड जतन करता आला नाही.');
      }
    } catch (err: any) {
      setError(err?.message || 'पासवर्ड जतन करताना त्रुटी आली.');
    } finally {
      setLoading(false);
    }
  };

  // Google Sign In — Chrome Custom Tabs, returns via mahaticket://
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await openGoogleAuthInApp();
    } catch (err: any) {
      setError(err?.message || 'Google लॉगिन सुरू करता आले नाही.');
    } finally {
      setLoading(false);
    }
  };

  const goBackToEmail = () => {
    Animated.timing(slideX, { toValue: 1, duration: 140, useNativeDriver: true }).start(() => {
      setStep('email');
      setPassword('');
      setConfirmPassword('');
      setOtp('');
      setError('');
      setInfo('');
      slideX.setValue(-1);
      Animated.timing(slideX, { toValue: 0, duration: 140, useNativeDriver: true }).start();
    });
  };

  const translateX = slideX.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-240, 0, 240],
  });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Icon name="ticket-confirmation" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.brand}>
            <Text style={{ color: COLORS.primary }}>महा</Text>टिकिट
          </Text>
          <Text style={styles.tagline}>
            महाराष्ट्राचे अधिकृत तिकीट बुकिंग ॲप • MahaTicket
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <View style={styles.cardTopBar} />

          <Animated.View style={{ transform: [{ translateX }] }}>
            {/* ── STEP 1: EMAIL INPUT ────────────────────────────────────────── */}
            {step === 'email' && (
              <View>
                <Text style={styles.stepTitle}>आपले तिकीट पाहण्यासाठी लॉगिन करा</Text>
                <Text style={styles.stepSub}>
                  बुकिंग करताना वापरलेला ईमेल पत्ता प्रविष्ट करा. खात्याचा पासवर्ड असल्यास थेट पासवर्ड किंवा OTP द्वारे सुरक्षित प्रवेश मिळेल.
                </Text>

                <View style={styles.inputWrap}>
                  <Icon name="email-outline" size={20} color={COLORS.textDim} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="name@example.com"
                    placeholderTextColor={COLORS.textDim}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setError(''); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleEmailSubmit}
                  />
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  style={[styles.cta, loading && { opacity: 0.6 }]}
                  onPress={handleEmailSubmit}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.ctaText}>पुढे जा (Continue) →</Text>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.orDividerRow}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>किंवा (OR)</Text>
                  <View style={styles.orLine} />
                </View>

                {/* Google Sign In */}
                <TouchableOpacity
                  style={styles.googleBtn}
                  onPress={handleGoogleLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <Icon name="google" size={18} color="#EA4335" style={{ marginRight: 8 }} />
                  <Text style={styles.googleBtnText}>Google द्वारे पुढे जा (Google Sign In)</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── STEP 2A: PASSWORD LOGIN ───────────────────────────────────── */}
            {step === 'password' && (
              <View>
                <TouchableOpacity onPress={goBackToEmail} style={styles.backRow}>
                  <Icon name="arrow-left" size={16} color={COLORS.primary} />
                  <Text style={styles.backText}>{email} (बदला / Change)</Text>
                </TouchableOpacity>

                <Text style={styles.stepTitle}>आपला पासवर्ड प्रविष्ट करा</Text>
                <Text style={styles.stepSub}>
                  या ईमेलसाठी पासवर्ड सेट केलेला आहे. लॉगिन करण्यासाठी पासवर्ड टाका.
                </Text>

                <View style={styles.inputWrap}>
                  <Icon name="lock-outline" size={20} color={COLORS.textDim} style={styles.inputIcon} />
                  <TextInput
                    ref={passRef}
                    style={styles.input}
                    placeholder="आपला पासवर्ड (Password)"
                    placeholderTextColor={COLORS.textDim}
                    value={password}
                    onChangeText={(t) => { setPassword(t); setError(''); }}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handlePasswordLogin}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 6 }}>
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color={COLORS.textDim} />
                  </TouchableOpacity>
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  style={[styles.cta, loading && { opacity: 0.6 }]}
                  onPress={handlePasswordLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.ctaText}>लॉगिन करा (Sign In) ✓</Text>
                  )}
                </TouchableOpacity>

                {/* Forgot Password OTP fallback */}
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  disabled={loading}
                  style={styles.resendRow}
                >
                  <Text style={styles.resendText}>पासवर्ड विसरलात? OTP द्वारे लॉगिन करा →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── STEP 2B: OTP VERIFICATION ─────────────────────────────────── */}
            {step === 'otp' && (
              <View>
                <TouchableOpacity onPress={goBackToEmail} style={styles.backRow}>
                  <Icon name="arrow-left" size={16} color={COLORS.primary} />
                  <Text style={styles.backText}>{email} (बदला / Change)</Text>
                </TouchableOpacity>

                <Text style={styles.stepTitle}>६-अंकी पडताळणी OTP प्रविष्ट करा</Text>
                <Text style={styles.stepSub}>
                  पडताळणी कोड <Text style={{ fontWeight: '700', color: COLORS.text }}>{email}</Text> वर पाठवला आहे.
                </Text>

                {info ? <Text style={styles.infoBadge}>ℹ️ {info}</Text> : null}

                <TextInput
                  ref={otpRef}
                  style={styles.otpInput}
                  placeholder="• • • • • •"
                  placeholderTextColor={COLORS.textDim}
                  value={otp}
                  onChangeText={(t) => { setOtp(t); setError(''); }}
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyOtp}
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  style={[styles.cta, (loading || otp.trim().length !== 6) && { opacity: 0.5 }]}
                  onPress={handleVerifyOtp}
                  disabled={loading || otp.trim().length !== 6}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.ctaText}>OTP पडताळणी करा (Verify OTP) ✓</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleForgotPassword} style={styles.resendRow}>
                  <Text style={styles.resendText}>पुन्हा कोड पाठवा (Resend OTP)</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── STEP 3: SET NEW PASSWORD ───────────────────────────────────── */}
            {step === 'set_password' && (
              <View>
                <Text style={styles.stepTitle}>नवीन पासवर्ड तयार करा</Text>
                <Text style={styles.stepSub}>
                  भविष्यात थेट लॉगिन करण्यासाठी <Text style={{ fontWeight: '700', color: COLORS.text }}>{email}</Text> साठी पासवर्ड सेट करा.
                </Text>

                {info ? <Text style={styles.infoBadge}>ℹ️ {info}</Text> : null}

                <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                  <Icon name="lock-outline" size={20} color={COLORS.textDim} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="नवीन पासवर्ड (किमान ६ अक्षरे)"
                    placeholderTextColor={COLORS.textDim}
                    value={password}
                    onChangeText={(t) => { setPassword(t); setError(''); }}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 6 }}>
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color={COLORS.textDim} />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrap}>
                  <Icon name="lock-check-outline" size={20} color={COLORS.textDim} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="पासवर्डची खात्री करा (Confirm Password)"
                    placeholderTextColor={COLORS.textDim}
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                    secureTextEntry={!showConfirmPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSetPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 6 }}>
                    <Icon name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={COLORS.textDim} />
                  </TouchableOpacity>
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  style={[styles.cta, loading && { opacity: 0.6 }]}
                  onPress={handleSetPassword}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.ctaText}>पासवर्ड जतन करा व पुढे जा ✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>

        {/* Guest option */}
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.replace('Main');
          }}
          style={styles.guestRow}
        >
          <Text style={styles.guestText}>अतिथी म्हणून सुरू ठेवा (Continue as Guest) →</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          लॉगिन करून आपण आमच्या{' '}
          <Text style={styles.legalLink}>नियम व अटी</Text>
          {' आणि '}
          <Text style={styles.legalLink}>गोपनीयता धोरण</Text>
          {' यांशी सहमत आहात.'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: height * 0.05,
    paddingBottom: 32,
  },

  header: { alignItems: 'center', marginBottom: 24 },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  brand: { color: COLORS.text, fontSize: 28, fontWeight: '900', letterSpacing: 0.5 },
  tagline: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.lg,
    overflow: 'hidden',
  },
  cardTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: COLORS.primary,
  },

  stepTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  stepSub: { fontSize: 12.5, color: COLORS.textDim, marginBottom: 16, lineHeight: 18 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    height: 48,
    fontSize: 14.5,
    color: COLORS.text,
    fontWeight: '600',
  },

  otpInput: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFF7ED',
    height: 54,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 10,
    textAlign: 'center',
    color: COLORS.text,
    marginBottom: 12,
  },

  error: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  infoBadge: {
    fontSize: 12,
    color: '#0369A1',
    backgroundColor: '#F0F9FF',
    padding: 8,
    borderRadius: RADIUS.sm,
    marginBottom: 12,
    fontWeight: '500',
  },

  cta: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    ...SHADOWS.md,
  },
  ctaText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  orText: {
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
  },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  googleBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  backText: { color: COLORS.primary, fontSize: 12.5, fontWeight: '700' },
  resendRow: { marginTop: 14, alignItems: 'center' },
  resendText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },

  guestRow: { marginTop: 18, alignItems: 'center', padding: 6 },
  guestText: { color: COLORS.textDim, fontSize: 13.5, fontWeight: '600' },

  legal: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textDim,
    marginTop: 20,
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  legalLink: { color: COLORS.primary, fontWeight: '600' },
});
