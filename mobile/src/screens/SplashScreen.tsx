/**
 * SplashScreen — MahaTicket Android
 * Clean, direct brand reveal matching native launch window (pure white, zero shadows)
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore, useUIStore } from '../store';
import { resolveApiBase } from '../api';

const LOGO = require('../assets/mahaticket-logo.png');

export default function SplashScreen({ navigation }: any) {
  const loadStoredAuth = useAuthStore((s) => s.loadStoredAuth);
  const loadUIPrefs = useUIStore((s) => s.loadUIPrefs);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Default language English on first launch if not set
    useUIStore.getState().setLanguage(useUIStore.getState().language || 'en');

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();

    Promise.all([
      loadStoredAuth(),
      loadUIPrefs(),
      resolveApiBase().catch(() => null),
    ]);

    const timer = setTimeout(async () => {
      let isDone = false;
      try {
        const stored = await AsyncStorage.getItem('@tg_onboarding');
        isDone = stored === '1' || useUIStore.getState().onboardingDone;
      } catch {
        isDone = useUIStore.getState().onboardingDone;
      }

      navigation.replace(isDone ? 'Main' : 'Onboarding');
    }, 280);

    return () => clearTimeout(timer);
  }, [fadeAnim, loadStoredAuth, loadUIPrefs, navigation]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.logoBox}>
          <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
        </View>

        <Text style={styles.brand}>MahaTicket</Text>
        <Text style={styles.brandMr}>महाटिकिट</Text>

        <View style={styles.taglineBox}>
          <Text style={styles.tagline}>Maharashtra's Stage & Cinema Booking Portal</Text>
        </View>
      </Animated.View>

      <Text style={styles.footerNote}>
        नाट्यगृह व सिनेमा अधिकृत बुकिंग प्लॅटफॉर्म
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: {
    width: 92,
    height: 92,
  },
  brand: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginTop: 14,
    lineHeight: 36,
    paddingBottom: 2,
  },
  brandMr: {
    color: '#EA580C',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
    lineHeight: 22,
    paddingBottom: 2,
  },
  taglineBox: {
    marginTop: 10,
    paddingHorizontal: 32,
  },
  tagline: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20,
    paddingBottom: 2,
  },
  footerNote: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 20,
    paddingBottom: 4,
  },
});

