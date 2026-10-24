/**
 * Shared UI Components — MahaTicket Android (महाटिकिट)
 * All reusable components for the app.
 */
export { MahaTicketPass } from './MahaTicketPass';
export type { MahaTicketPassProps } from './MahaTicketPass';
export { TicketCardFrame } from './TicketCardFrame';
export type { TicketCardFrameProps } from './TicketCardFrame';
export { MTPopupModal } from './MTPopupModal';
export type { MTPopupModalProps, MTPopupType } from './MTPopupModal';
export { TikitMitraModal } from './TikitMitraModal';

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  ViewStyle,
  TextStyle,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOWS, TYPOGRAPHY, ANIMATION } from '../theme';
import { absoluteMediaUrl, fallbackPosterUrl, getEventCardDateLabel } from '../api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TicketCardFrame } from './TicketCardFrame';
import { useUIStore } from '../store';
import { displayTitle, displayCity } from '../utils/display';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  const variantStyles: Record<string, { bg: string; text: string; border?: string }> = {
    primary: { bg: COLORS.primary, text: COLORS.white },
    secondary: { bg: COLORS.surface2, text: COLORS.text, border: COLORS.border },
    ghost: { bg: 'transparent', text: COLORS.primary, border: COLORS.primary },
    danger: { bg: COLORS.danger, text: COLORS.white },
  };

  const sizeStyles: Record<string, { pad: number; padH: number; font: number; radius: number }> = {
    sm: { pad: 6, padH: 12, font: 12, radius: RADIUS.md },
    md: { pad: 10, padH: 16, font: 14, radius: RADIUS.md },
    lg: { pad: 12, padH: 18, font: 15, radius: RADIUS.lg },
  };

  const vs = variantStyles[variant];
  const ss = sizeStyles[size];

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth && { width: '100%' }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[
          styles.btn,
          {
            backgroundColor: vs.bg,
            paddingVertical: ss.pad,
            paddingHorizontal: ss.padH,
            borderRadius: ss.radius,
            borderWidth: vs.border ? 1.5 : 0,
            borderColor: vs.border,
            opacity: disabled ? 0.45 : 1,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={vs.text} size="small" />
        ) : (
          <View style={styles.btnRow}>
            {icon}
            <Text style={[{ color: vs.text, fontSize: ss.font, fontWeight: '700' }, textStyle]}>
              {title}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

export function Badge({
  label,
  color = COLORS.primary,
  bg,
  size = 'md',
}: {
  label: string;
  color?: string;
  bg?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg || color + '22',
          paddingHorizontal: size === 'sm' ? 6 : 10,
          paddingVertical: size === 'sm' ? 2 : 4,
        },
      ]}
    >
      <Text style={{ color, fontSize: size === 'sm' ? 10 : 12, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
  onPress,
  elevated = false,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevated?: boolean;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.card,
        elevated && SHADOWS.md,
        style,
      ]}
    >
      {children}
    </Wrapper>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function Skeleton({ width, height, borderRadius = 8, style }: {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true, easing: Easing.linear }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });

  return (
    <Animated.View
      style={[
        {
          width: (width ?? '100%') as any,
          height: height ?? 16,
          borderRadius,
          backgroundColor: COLORS.surface2,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ─── MahaTicket Logo Skeleton & Watermark Placeholder ─────────────────────────

export function MahaTicketLogoSkeleton({
  width,
  height,
  borderRadius = RADIUS.lg,
  variant = 'poster',
  style,
}: {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  variant?: 'poster' | 'avatar' | 'banner' | 'rectangular';
  style?: ViewStyle;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.95] });
  const pulseScale = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.02] });

  if (variant === 'avatar') {
    const s = typeof width === 'number' ? width : 60;
    return (
      <View
        style={[
          {
            width: s,
            height: s,
            borderRadius: s / 2,
            backgroundColor: COLORS.surface2,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: COLORS.border,
            overflow: 'hidden',
          },
          style,
        ]}
      >
        <Animated.View style={{ transform: [{ scale: pulseScale }], opacity, alignItems: 'center' }}>
          <Icon name="drama-masks" size={s * 0.45} color={COLORS.primary} />
        </Animated.View>
      </View>
    );
  }

  return (
    <View
      style={[
        {
          width: (width ?? '100%') as any,
          height: height ?? (variant === 'poster' ? 220 : 120),
          borderRadius,
          backgroundColor: COLORS.surface2,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: COLORS.border,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: COLORS.surface3,
            opacity,
          },
        ]}
      />
      {/* Centered MahaTicket Branded Monogram */}
      <Animated.View
        style={{
          transform: [{ scale: pulseScale }],
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}
      >
        <View style={styles.skeletonLogoBadge}>
          <Icon name="theater" size={variant === 'poster' ? 36 : 24} color={COLORS.primary} />
        </View>
        <Text style={styles.skeletonBrandText}>
          <Text style={{ color: COLORS.primary }}>महा</Text>टिकिट
        </Text>
        <Text style={styles.skeletonSubText}>MAHATICKET</Text>
      </Animated.View>
    </View>
  );
}

// ─── MahaTicketAvatar (For Cast & Crew with branded skeleton fallback) ─────────

export function MahaTicketAvatar({
  uri,
  name,
  role,
  size = 62,
}: {
  uri?: string | null;
  name: string;
  role?: string;
  size?: number;
}) {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(!uri);
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  return (
    <View style={{ alignItems: 'center', width: size + 24, marginHorizontal: 4 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: COLORS.surface2,
          borderWidth: 1.5,
          borderColor: COLORS.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {uri && !error ? (
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        ) : null}

        {(!loaded || error || !uri) && (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(234,88,12,0.12)',
              },
            ]}
          >
            <Text style={{ color: COLORS.primary, fontSize: size * 0.36, fontWeight: '800' }}>
              {initial}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.avatarName, { color: COLORS.text }]} numberOfLines={1}>
        {name}
      </Text>
      {role ? (
        <Text style={[styles.avatarRole, { color: COLORS.primary }]} numberOfLines={1}>
          {role}
        </Text>
      ) : null}
    </View>
  );
}

// ─── EventCard (Screenshot 1 & TicketKhidakee Look) ───────────────────────────
// Features: Rounded corners, Top-left category tag, Top-right Promoted pill,
// Bottom-left Star rating with real count (e.g. ⭐ 4.8 (1.2k)),
// NO price on card face as requested, Bold Marathi title, Venue with pin, Date & time.

export function EventCard({
  event,
  onPress,
  width: cardWidth,
  showPromoted = false,
}: {
  event: any;
  onPress: () => void;
  width?: number;
  showPromoted?: boolean;
}) {
  const language = useUIStore((s) => s.language);
  const w = cardWidth || SCREEN_WIDTH * 0.445;
  const ratingNum = typeof event.rating === 'number' && event.rating > 0
    ? (event.rating > 5 ? event.rating / 2 : event.rating)
    : 4.8;
  const rating = ratingNum.toFixed(1);
  const ratingCount = event.ratingCountStr
    || (typeof event.ratingCount === 'number' && event.ratingCount > 0
      ? (event.ratingCount >= 1000 ? `${(event.ratingCount / 1000).toFixed(1)}k` : `${event.ratingCount}`)
      : '1.2k');
  const isPromoted = showPromoted || event.featured === 1 || event.isPromoted;

  // Category label based on language
  const categoryLabel = language === 'mr'
    ? (event.categoryMr || (event.category === 'music' ? 'संगीत' : 'नाटक'))
    : (event.category ? event.category.charAt(0).toUpperCase() + event.category.slice(1) : 'Event');

  const fallbackUri = fallbackPosterUrl(event?.id);
  const primaryUri =
    absoluteMediaUrl(event?.posterUrl) ||
    absoluteMediaUrl(event?.bannerUrl) ||
    fallbackUri;
  const [failedUri, setFailedUri] = React.useState<string | null>(null);
  const posterUri = failedUri === primaryUri ? fallbackUri : primaryUri;

  const venueTitle = language === 'mr'
    ? (event.venue?.nameMr || event.venue?.name || 'नाट्यगृह')
    : (event.venue?.name || event.venue?.nameMr || 'Auditorium');
  const cityTitle = displayCity(event.venue?.city, language);

  const dateStr = getEventCardDateLabel(event, language);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={{ width: w }}>
      <TicketCardFrame borderRadius={RADIUS.md} notchRadius={5} scalloped teethCount={5}>
        {/* Poster */}
        <View style={[styles.eventCardImg, { height: w * 1.38 }]}>
          <Image
            source={{ uri: posterUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            onError={() => setFailedUri(primaryUri)}
          />

          {/* Gradient dark overlay at bottom */}
          <View style={styles.eventCardGradient} />

          {/* Category tag pill (Top Left) */}
          <View style={styles.eventCardCatBadge}>
            <Text style={styles.eventCardCatText}>{categoryLabel}</Text>
          </View>

          {/* Promoted badge (Top Right) */}
          {isPromoted && (
            <View style={styles.promotedBadge}>
              <Text style={styles.promotedBadgeText}>
                {language === 'mr' ? 'विशेष' : 'Promoted'}
              </Text>
            </View>
          )}

          {/* Star Rating Badge (Bottom Left - matching golden star #FFB800) */}
          <View style={styles.cardRatingBadgeBottom}>
            <Icon name="star" size={12} color="#FFB800" />
            <Text style={styles.cardRatingScore}>{rating}</Text>
          </View>
        </View>

        {/* Info Section below poster */}
        <View style={styles.eventCardInfo}>
          {/* Title in bold according to language */}
          <Text style={styles.eventCardTitle} numberOfLines={1}>
            {displayTitle(event, language)}
          </Text>

          {/* Venue with Map Marker */}
          <View style={styles.venueRowInline}>
            <Icon name="map-marker" size={13} color={COLORS.primary} style={{ marginTop: 1 }} />
            <Text style={styles.eventCardVenue} numberOfLines={1}>
              {venueTitle}{cityTitle ? `, ${cityTitle}` : ''}
            </Text>
          </View>

          {/* Date & Time Row */}
          <View style={styles.dateRowInline}>
            <Icon name="clock-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.eventCardDate} numberOfLines={1}>
              {dateStr}
            </Text>
          </View>
        </View>
      </TicketCardFrame>
    </TouchableOpacity>
  );
}

// ─── EventListCard (Compact List Item - No Price, Stars + Real Count) ─────────

export function EventListCard({ event, onPress }: { event: any; onPress: () => void }) {
  const language = useUIStore((s) => s.language);
  const ratingNum = typeof event.rating === 'number' && event.rating > 0
    ? (event.rating > 5 ? event.rating / 2 : event.rating)
    : 4.8;
  const rating = ratingNum.toFixed(1);
  const ratingCount = event.ratingCountStr
    || (typeof event.ratingCount === 'number' && event.ratingCount > 0
      ? (event.ratingCount >= 1000 ? `${(event.ratingCount / 1000).toFixed(1)}k` : `${event.ratingCount}`)
      : '1.2k');
  const fallbackUri = fallbackPosterUrl(event?.id);
  const primaryUri =
    absoluteMediaUrl(event?.posterUrl) ||
    absoluteMediaUrl(event?.bannerUrl) ||
    fallbackUri;
  const [failedUri, setFailedUri] = React.useState<string | null>(null);
  const posterUri = failedUri === primaryUri ? fallbackUri : primaryUri;

  const categoryText = language === 'mr'
    ? `${event.categoryMr || (event.category === 'music' ? 'संगीत' : 'नाटक')} • ${event.language || 'मराठी'}`
    : `${event.category ? event.category.charAt(0).toUpperCase() + event.category.slice(1) : 'Play'} • ${event.language || 'Marathi'}`;

  const venueName = language === 'mr'
    ? (event.venue?.nameMr || event.venue?.name)
    : (event.venue?.name || event.venue?.nameMr);
  const cityName = displayCity(event.venue?.city, language);

  const dateStr = getEventCardDateLabel(event, language);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.listCard}>
      <TicketCardFrame
        borderRadius={RADIUS.md}
        notchRadius={4}
        style={styles.listCardPosterFrame}
        backgroundColor={COLORS.surface2}
      >
        <View style={styles.listCardImg}>
          <Image
            source={{ uri: posterUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            onError={() => setFailedUri(primaryUri)}
          />
        </View>
      </TicketCardFrame>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={styles.listCardTitle} numberOfLines={1}>
          {displayTitle(event, language)}
        </Text>

        <Text style={styles.listCardCategory}>
          {categoryText}
        </Text>

        {event.venue && (
          <View style={styles.cityRowInline}>
            <Icon name="map-marker" size={12} color={COLORS.primary} />
            <Text style={styles.listCardVenue} numberOfLines={1}>
              {venueName}{cityName ? ` • ${cityName}` : ''}
            </Text>
          </View>
        )}

        <View style={styles.dateRowInline}>
          <Icon name="calendar-clock" size={12} color={COLORS.textMuted} />
          <Text style={styles.eventCardDate} numberOfLines={1}>
            {dateStr}
          </Text>
        </View>
      </View>

      {/* Star rating pill with real count */}
      <View style={styles.listCardRating}>
        <View style={styles.listCardRatingBox}>
          <Icon name="star" size={13} color="#FFB800" />
          <Text style={styles.listCardRatingVal}>{rating}</Text>
        </View>
        <Text style={styles.listCardRatingCount}>({ratingCount})</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── CategoryPill ─────────────────────────────────────────────────────────────

export function CategoryPill({
  label,
  icon,
  iconName,
  active,
  onPress,
}: {
  label: string;
  icon?: string;
  iconName?: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.pill, active && styles.pillActive]}
    >
      {iconName ? (
        <Icon
          name={iconName}
          size={16}
          color={active ? COLORS.white : COLORS.primary}
          style={{ marginRight: 6 }}
        />
      ) : icon ? (
        <Text style={{ fontSize: 13, marginRight: 5 }}>{icon}</Text>
      ) : null}
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  subtitle,
  onSeeAll,
}: {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {subtitle && (
          <Text style={{ fontSize: 11, color: COLORS.textMuted, marginLeft: 10, marginTop: 1 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({
  emoji,
  iconName = 'theater',
  title,
  subtitle,
  action,
}: {
  emoji?: string;
  iconName?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconCircle}>
        {iconName ? (
          <Icon name={iconName} size={36} color={COLORS.primary} />
        ) : (
          <Text style={{ fontSize: 36 }}>{emoji || '🎭'}</Text>
        )}
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
      {action && (
        <Button title={action.label} onPress={action.onPress} style={{ marginTop: 18 }} />
      )}
    </View>
  );
}

// ─── Loading (centered logo + spinner) & Retry state ──────────────────────────

const LOADING_LOGO = require('../assets/mahaticket-logo.png');

export function LoadingLogo({ fill = false }: { fill?: boolean }) {
  return (
    <View style={[styles.loadingWrap, fill && { flex: 1 }]}>
      <Image source={LOADING_LOGO} style={styles.loadingLogo} resizeMode="contain" />
      <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 18 }} />
    </View>
  );
}

export function RetryState({
  title = 'Something went wrong',
  subtitle,
  onRetry,
  retryLabel = 'Retry',
}: {
  title?: string;
  subtitle?: string;
  onRetry: () => void;
  retryLabel?: string;
}) {
  return (
    <View style={styles.loadingWrap}>
      <Icon name="emoticon-sad-outline" size={56} color={COLORS.textMuted} />
      <Text style={[styles.emptyTitle, { marginTop: 12 }]}>{title}</Text>
      {!!subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
      <Button title={retryLabel} onPress={onRetry} style={{ marginTop: 18 }} />
    </View>
  );
}

// ─── Countdown Timer ──────────────────────────────────────────────────────────

export function CountdownTimer({ seconds, style }: { seconds: number; style?: TextStyle }) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const isUrgent = seconds <= 60;

  return (
    <Text
      style={[
        styles.countdown,
        isUrgent && { color: COLORS.danger },
        style,
      ]}
    >
      ⏱ {m}:{s.toString().padStart(2, '0')}
    </Text>
  );
}

// ─── Price Row ────────────────────────────────────────────────────────────────

export function PriceRow({
  label,
  value,
  highlight = false,
  strikethrough = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  strikethrough?: boolean;
}) {
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, highlight && { color: COLORS.text, fontWeight: '700' }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.priceValue,
          highlight && { color: COLORS.primary, fontWeight: '800', fontSize: 16 },
          strikethrough && { textDecorationLine: 'line-through', color: COLORS.textMuted },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Back Header ──────────────────────────────────────────────────────────────

export function BackHeader({
  title,
  onBack,
  right,
}: {
  title?: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.backHeader}>
      <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.backBtn}>
        <Icon name="arrow-left" size={22} color={COLORS.text} />
      </TouchableOpacity>
      {title && <Text style={styles.backTitle} numberOfLines={1}>{title}</Text>}
      <View style={{ width: 44, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

// ─── Stars ────────────────────────────────────────────────────────────────────

export function Stars({ rating, max = 5, size = 13 }: { rating: number; max?: number; size?: number }) {
  const normalized = rating > max ? parseFloat((rating / 2).toFixed(1)) : rating;
  return (
    <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: max }).map((_, i) => (
        <Icon
          key={i}
          name={i < Math.round(normalized) ? 'star' : 'star-outline'}
          size={size}
          color={i < Math.round(normalized) ? COLORS.accentGold : COLORS.textDim}
        />
      ))}
      <Text style={{ color: COLORS.textMuted, fontSize: size - 2, marginLeft: 4 }}>
        {normalized.toFixed(1)}
      </Text>
    </View>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { borderRadius: RADIUS.full, alignSelf: 'flex-start' },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  eventCardImg: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: COLORS.surface2,
  },
  eventCardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '38%',
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  eventCardCatBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    zIndex: 3,
  },
  eventCardCatText: { color: COLORS.white, fontSize: 10, fontWeight: '800' },
  promotedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#C01823', // Red Promoted badge matching TicketKhidakee
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    zIndex: 3,
  },
  promotedBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  cardRatingBadgeBottom: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 3,
  },
  cardRatingScore: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
  cardRatingCount: { color: 'rgba(255,255,255,0.75)', fontSize: 9, fontWeight: '600' },

  eventCardInfo: {
    padding: 10,
    gap: 3,
    backgroundColor: COLORS.surface,
  },
  eventCardTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: 20,
    paddingTop: 3,
  },
  venueRowInline: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  eventCardVenue: { color: '#64748B', fontSize: 11, fontWeight: '600', flex: 1 },
  dateRowInline: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  eventCardDate: { color: '#EA580C', fontSize: 11, fontWeight: '700' },

  listCard: {
    flexDirection: 'row',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listCardPosterFrame: {
    width: 72,
    height: 90,
  },
  listCardImg: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surface2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCardTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  listCardCategory: { color: COLORS.primary, fontSize: 11, fontWeight: '600', marginBottom: 3 },
  listCardVenue: { color: COLORS.textMuted, fontSize: 11, flex: 1 },
  listCardRating: { alignItems: 'center', justifyContent: 'center', paddingLeft: 4 },
  listCardRatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  listCardRatingVal: { color: COLORS.text, fontSize: 11, fontWeight: '800' },
  listCardRatingCount: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2 },

  skeletonLogoBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(234, 88, 12, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.25)',
  },
  skeletonBrandText: { color: COLORS.text, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  skeletonSubText: { color: COLORS.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1 },

  avatarName: { color: COLORS.text, fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 5 },
  avatarRole: { color: COLORS.primary, fontSize: 9, fontWeight: '600', textAlign: 'center', marginTop: 1 },

  cityRowInline: { flexDirection: 'row', alignItems: 'center', gap: 3 },

  pill: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    alignSelf: 'center',
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  pillTextActive: { color: COLORS.white },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.base,
  },
  sectionDot: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  sectionTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.lg,
    fontWeight: '800',
  },
  seeAll: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING['2xl'],
  },
  loadingLogo: { width: 96, height: 96, borderRadius: 20 },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  emptySub: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  countdown: { color: COLORS.warning, fontWeight: '800', fontSize: 16 },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  priceLabel: { color: COLORS.textMuted, fontSize: 14 },
  priceValue: { color: COLORS.text, fontSize: 14, fontWeight: '600' },

  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  backTitle: { flex: 1, color: COLORS.text, fontSize: 16, fontWeight: '700' },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
});
