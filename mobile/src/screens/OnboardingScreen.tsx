/**
 * OnboardingScreen — MahaTicket Android (महाटिकिट)
 * 3-slide intro with swipe gestures, brand story & CTA
 */
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, RADIUS, SPACING } from '../theme';
import { useUIStore } from '../store';

const { width, height } = Dimensions.get('window');
const LOGO = require('../assets/mahaticket-logo.png');

const SLIDES = [
  {
    id: '1',
    emoji: 'logo',
    title: 'Welcome to MahaTicket',
    titleMr: 'महाटिकिट मध्ये आपले स्वागत आहे',
    subtitle: 'Maharashtra\'s premier platform for live events. Discover plays, concerts, comedy, sports & more — all in one place.',
    bg: COLORS.surface,
    accent: COLORS.primary,
  },
  {
    id: '2',
    emoji: '💺',
    title: 'Pick Your Seat',
    titleMr: 'आपले आसन निवडा',
    subtitle: 'Interactive seat maps with real-time availability. See exactly where you\'ll be sitting before you pay.',
    bg: COLORS.surface,
    accent: '#E94560',
  },
  {
    id: '3',
    emoji: '🎟️',
    title: 'Instant Tickets',
    titleMr: 'तात्काळ तिकिट',
    subtitle: 'Secure QR tickets delivered instantly. Show at venue entry — no printing needed. Book in 60 seconds.',
    bg: COLORS.surface,
    accent: '#00D9A3',
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const setOnboardingDone = useUIStore((s) => s.setOnboardingDone);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatRef = useRef<FlatList>(null);

  const finish = () => {
    AsyncStorage.setItem('@tg_onboarding', '1').catch(() => null);
    setOnboardingDone();
    navigation.replace('Main');
  };

  const next = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
      setActiveIndex(activeIndex + 1);
    } else {
      finish();
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar hidden />

      {/* Slides */}
      <Animated.FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item, index }) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.8, 1, 0.8],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1, 0.6],
            extrapolate: 'clamp',
          });

          return (
            <View style={styles.slide}>
              {/* Emoji or Logo graphic */}
              <Animated.View style={[styles.emojiWrap, { transform: [{ scale }], opacity, borderColor: item.accent + '44' }]}>
                <View style={[styles.emojiInner, { backgroundColor: item.accent + '18' }]}>
                  {item.emoji === 'logo' ? (
                    <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
                  ) : (
                    <Text style={styles.emoji}>{item.emoji}</Text>
                  )}
                </View>
                {/* Orbiting dots */}
                <View style={[styles.orbit, { borderColor: item.accent + '30' }]} />
                <View style={[styles.orbit2, { borderColor: item.accent + '20' }]} />
              </Animated.View>

              {/* Text */}
              <View style={styles.textBlock}>
                <Text style={[styles.mrTitle, { color: item.accent }]}>{item.titleMr}</Text>
                <Text style={styles.enTitle}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* Dots indicator */}
      <View style={styles.dotsRow}>
        {SLIDES.map((s, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });
          const dotColor = scrollX.interpolate({
            inputRange,
            outputRange: [COLORS.border, s.accent, COLORS.border],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={s.id}
              style={[styles.dot, { width: dotWidth, backgroundColor: dotColor }]}
            />
          );
        })}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={finish} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={next}
          style={[styles.nextBtn, { backgroundColor: SLIDES[activeIndex].accent }]}
          activeOpacity={0.85}
        >
          <Text style={styles.nextText}>
            {activeIndex === SLIDES.length - 1 ? 'Get Started 🚀' : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: height * 0.08,
  },
  emojiWrap: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    position: 'relative',
  },
  emojiInner: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 64 },
  logoImg: { width: 96, height: 96 },
  orbit: {
    position: 'absolute',
    width: 164,
    height: 164,
    borderRadius: 82,
    borderWidth: 1,
  },
  orbit2: {
    position: 'absolute',
    width: 196,
    height: 196,
    borderRadius: 98,
    borderWidth: 0.5,
  },
  textBlock: { alignItems: 'center', gap: 8 },
  mrTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    lineHeight: 30,
    paddingBottom: 4,
    textAlign: 'center',
  },
  enTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 36,
    paddingBottom: 2,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 24,
  },
  dot: { height: 8, borderRadius: 4 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  skipBtn: { padding: 12 },
  skipText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  nextBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  nextText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
});
