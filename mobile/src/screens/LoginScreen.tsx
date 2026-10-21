/**
 * LoginScreen — MahaTicket Android (महाटिकिट)
 * Email-based authentication with OTP or Password
 */
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Linking,
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
import { api, resolveApiBase } from '../api';
import { useAuthStore } from '../store';

const { height } = Dimensions.get('window');

export default function LoginScreen({ navigation, route }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [mode, setMode] = useState<'otp' | 'password'>('otp');
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);

  const slideX = useRef(new Animated.Value(0)).current;
  const otpRef = useRef<TextInput>(null);

  const handleSendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('कृपया वैध ईमेल पत्ता प्रविष्ट करा (Enter a valid email address)');
      return;
    }
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const res = await api.sendEmailOtp(cleanEmail);
      setInfo(res.message || '६-अंकी OTP ईमेलवर पाठवला आहे.');
      Animated.timing(slideX, { toValue: -1, duration: 180, useNativeDriver: true }).start(() => {
        setStep('verify');
        slideX.setValue(1);
        Animated.timing(slideX, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
          otpRef.current?.focus();
        });
      });
    } catch (err: any) {
      setError(err?.message || 'OTP पाठवता आला नाही. कृपया ईमेल व नेटवर्क तपासा.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('कृपया ६-अंकी OTP प्रविष्ट करा');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.verifyEmailOtp(email, otp);
      if (res.success && res.user) {
        await setAuth(res.user, res.token || `mt-tok-${Date.now()}`);
        if (route.params?.onSuccess) {
          route.params.onSuccess();
          navigation.goBack();
        } else if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.replace('Main');
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

  const handlePasswordLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError('ईमेल आणि पासवर्ड आवश्यक आहे');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.loginWithEmailPassword(cleanEmail, password);
      if (res.success && res.user) {
        await setAuth(res.user, res.token || `mt-tok-${Date.now()}`);
        if (route.params?.onSuccess) {
          route.params.onSuccess();
          navigation.goBack();
        } else if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.replace('Main');
        }
      } else {
        setError(res.message || 'लॉगिन अयशस्वी झाले');
      }
    } catch (err: any) {
      setError(err?.message || 'चुकीचा ईमेल किंवा पासवर्ड');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      const base = await resolveApiBase();
      const targetUrl = `${base}/api/auth/google?direct=true&source=mobile`;
      await Linking.openURL(targetUrl);
    } catch (err: any) {
      setError(err?.message || 'Google लॉगिन सुरू करता आले नाही. कृपया ईमेल द्वारे प्रयत्न करा.');
    } finally {
      setLoading(false);
    }
  };

  const goBackToEmail = () => {
    Animated.timing(slideX, { toValue: 1, duration: 160, useNativeDriver: true }).start(() => {
      setStep('email');
      setOtp('');
      setError('');
      slideX.setValue(-1);
      Animated.timing(slideX, { toValue: 0, duration: 160, useNativeDriver: true }).start();
    });
  };

  const translateX = slideX.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-300, 0, 300],
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
            महाराष्ट्राचे अधिकृत तिकीट बुकिंग ॲप • Sign in
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <View style={styles.cardTopBar} />

          <Animated.View style={{ transform: [{ translateX }] }}>
            {step === 'email' ? (
              <View>
                <Text style={styles.stepTitle}>ईमेल द्वारे लॉगिन (Email Login)</Text>
                <Text style={styles.stepSub}>
                  आपल्या खात्यामध्ये सुरक्षित प्रवेश करण्यासाठी ईमेल प्रविष्ट करा
                </Text>

                {/* Mode Selector */}
                <View style={styles.modeTabs}>
                  <TouchableOpacity
                    style={[styles.modeTab, mode === 'otp' && styles.modeTabActive]}
                    onPress={() => { setMode('otp'); setError(''); }}
                  >
                    <Icon name="email-fast-outline" size={16} color={mode === 'otp' ? COLORS.primary : COLORS.textDim} />
                    <Text style={[styles.modeTabText, mode === 'otp' && styles.modeTabTextActive]}>
                      Email OTP
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeTab, mode === 'password' && styles.modeTabActive]}
                    onPress={() => { setMode('password'); setError(''); }}
                  >
                    <Icon name="lock-outline" size={16} color={mode === 'password' ? COLORS.primary : COLORS.textDim} />
                    <Text style={[styles.modeTabText, mode === 'password' && styles.modeTabTextActive]}>
                      Password
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Email Input */}
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
                    returnKeyType={mode === 'otp' ? 'done' : 'next'}
                    onSubmitEditing={mode === 'otp' ? handleSendOtp : undefined}
                  />
                </View>

                {/* Password Input (if password mode) */}
                {mode === 'password' && (
                  <View style={[styles.inputWrap, { marginTop: 12 }]}>
                    <Icon name="lock-outline" size={20} color={COLORS.textDim} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="आपला पासवर्ड (Password)"
                      placeholderTextColor={COLORS.textDim}
                      value={password}
                      onChangeText={(t) => { setPassword(t); setError(''); }}
                      secureTextEntry
                      returnKeyType="done"
                      onSubmitEditing={handlePasswordLogin}
                    />
                  </View>
                )}

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  style={[styles.cta, loading && { opacity: 0.6 }]}
                  onPress={mode === 'otp' ? handleSendOtp : handlePasswordLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.ctaText}>
                      {mode === 'otp' ? 'Send Email OTP →' : 'लॉगिन करा (Sign In) →'}
                    </Text>
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
            ) : (
              <View>
                <TouchableOpacity onPress={goBackToEmail} style={styles.backRow}>
                  <Icon name="arrow-left" size={16} color={COLORS.primary} />
                  <Text style={styles.backText}>ईमेल बदला (Change Email)</Text>
                </TouchableOpacity>

                <Text style={styles.stepTitle}>६-अंकी OTP प्रविष्ट करा</Text>
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
                  style={[styles.cta, (loading || otp.length !== 6) && { opacity: 0.5 }]}
                  onPress={handleVerifyOtp}
                  disabled={loading || otp.length !== 6}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.ctaText}>Verify & Continue ✓</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSendOtp} style={styles.resendRow}>
                  <Text style={styles.resendText}>पुन्हा कोड पाठवा (Resend OTP)</Text>
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
          <Text style={styles.guestText}>अतिथी म्हणून पुढे जा (Continue as Guest) →</Text>
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
    paddingTop: height * 0.06,
    paddingBottom: 32,
  },

  header: { alignItems: 'center', marginBottom: 28 },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brand: { color: COLORS.text, fontSize: 30, fontWeight: '900', letterSpacing: 0.5 },
  tagline: {
    color: COLORS.textDim,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: 24,
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

  stepTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  stepSub: { fontSize: 13, color: COLORS.textDim, marginBottom: 18, lineHeight: 18 },

  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDim,
  },
  modeTabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

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
    height: 50,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },

  otpInput: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFF7ED',
    height: 56,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 12,
    textAlign: 'center',
    color: COLORS.text,
    marginBottom: 14,
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
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...SHADOWS.md,
  },
  ctaText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },

  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
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
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 4,
  },
  backText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  resendRow: { marginTop: 16, alignItems: 'center' },
  resendText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },

  guestRow: { marginTop: 20, alignItems: 'center', padding: 8 },
  guestText: { color: COLORS.textDim, fontSize: 14, fontWeight: '600' },

  legal: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textDim,
    marginTop: 24,
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  legalLink: { color: COLORS.primary, fontWeight: '600' },
});
