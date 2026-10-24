/**
 * OnboardingScreen — MahaTicket Android (महाटिकिट)
 * Modern 3-slide introduction with pure white aesthetic, seamless logo container,
 * smooth swipe gestures, and hardware back button handling.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, RADIUS, SPACING } from '../theme';
import { useUIStore } from '../store';

const { width, height } = Dimensions.get('window');
const LOGO = require('../assets/mahaticket-logo.png');

const SLIDES = [
  {
    id: '1',
    type: 'logo',
    tag: 'महाराष्ट्राचे स्वतःचे टिकिटिंग व्यासपीठ',
    title: 'Welcome to MahaTicket',
    titleMr: 'महाटिकिट मध्ये आपले स्वागत आहे',
    subtitle:
      'Maharashtra\'s premier platform for live events. Discover plays, concerts, comedy, sports & more — all in one place.',
    accent: '#EA580C',
  },
  {
    id: '2',
    type: 'icon',
    icon: 'seat-recline-extra',
    tag: 'रिअल-टाइम सीट नकाशा',
    title: 'Pick Your Seat',
    titleMr: 'आपले आवडते आसन निवडा',
    subtitle:
      'Interactive theater seat maps with live real-time availability. Choose exactly where you sit before paying.',
    accent: '#EA580C',
  },
  {
    id: '3',
    type: 'icon',
    icon: 'qrcode-scan',
    tag: 'स्मार्ट व सुरक्षित ई-तिकीट',
    title: 'Instant QR Passes',
    titleMr: 'तात्काळ डिजिटल तिकीट',
    subtitle:
      'Zero waiting! Secure QR passes delivered instantly to your phone & WhatsApp. Verified entry at the venue.',
    accent: '#EA580C',
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
      const nextIndex = activeIndex + 1;
      flatRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveIndex(nextIndex);
    } else {
      finish();
    }
  };

  // Hardware back button: navigate back through slides before exiting
  useEffect(() => {
    const onBackPress = () => {
      if (activeIndex > 0) {
        const prevIndex = activeIndex - 1;
        flatRef.current?.scrollToIndex({ index: prevIndex, animated: true });
        setActiveIndex(prevIndex);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [activeIndex]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Brand Header */}
      <View style={styles.topHeader}>
        <View style={styles.brandPill}>
          <Text style={styles.brandPillText}>🎟️ MAHATICKET • महाटिकिट</Text>
        </View>
        <TouchableOpacity onPress={finish} style={styles.topSkipBtn} activeOpacity={0.7}>
          <Text style={styles.topSkipText}>Skip</Text>
        </TouchableOpacity>
      </View>

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
            outputRange: [0.88, 1, 0.88],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.5, 1, 0.5],
            extrapolate: 'clamp',
          });

          return (
            <View style={styles.slide}>
              {/* Graphic container with pure white background matching logo */}
              <Animated.View style={[styles.heroCardOuter, { transform: [{ scale }], opacity }]}>
                <View style={styles.heroCardRing}>
                  <View style={styles.heroCardInner}>
                    {item.type === 'logo' ? (
                      <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
                    ) : (
                      <View style={styles.iconCircle}>
                        <Icon name={item.icon as string} size={64} color="#EA580C" />
                      </View>
                    )}
                  </View>
                </View>
              </Animated.View>

              {/* Tag / Micro Badge */}
              <View style={styles.tagWrap}>
                <Text style={styles.tagText}>{item.tag}</Text>
              </View>

              {/* Titles & Description */}
              <View style={styles.textBlock}>
                <Text style={styles.mrTitle}>{item.titleMr}</Text>
                <Text style={styles.enTitle}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* Bottom Bar: Dots and Action CTA */}
      <View style={styles.bottomBar}>
        {/* Modern Dots indicator */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 28, 8],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.35, 1, 0.35],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: '#EA580C',
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity
          onPress={next}
          style={styles.nextBtn}
          activeOpacity={0.88}
        >
          <Text style={styles.nextText}>
            {activeIndex === SLIDES.length - 1 ? 'सुरू करा • Get Started' : 'Next'}
          </Text>
          <Icon
            name={activeIndex === SLIDES.length - 1 ? 'rocket-launch' : 'arrow-right'}
            size={18}
            color="#FFFFFF"
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  brandPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  brandPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  topSkipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  topSkipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  heroCardOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  heroCardRing: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  heroCardInner: {
    width: 154,
    height: 154,
    borderRadius: 77,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: {
    width: 124,
    height: 124,
    backgroundColor: '#FFFFFF',
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagWrap: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    marginBottom: 14,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  textBlock: {
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  mrTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#EA580C',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 4,
  },
  enTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    paddingHorizontal: 12,
  },
  bottomBar: {
    paddingHorizontal: 28,
    paddingBottom: 36,
    paddingTop: 12,
    gap: 20,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  nextBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EA580C',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
