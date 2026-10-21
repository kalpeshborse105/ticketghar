import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../theme';

export type TicketCardFrameProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  borderRadius?: number;
  /** Semi-circle cutout radius; 0 hides notches */
  notchRadius?: number;
  /** Screen/card gutter color showing through the notch */
  notchColor?: string;
  borderColor?: string;
  backgroundColor?: string;
  /** Custom vertical position percentage for single notch (default: 50%) */
  notchPositionPercent?: number;
  /** Optional subtle dashed perforation line between the two notches */
  showPerforationLine?: boolean;
  /** Legacy props preserved for backward compatibility */
  scalloped?: boolean;
  teethCount?: number;
};

export function TicketCardFrame({
  children,
  style,
  borderRadius = RADIUS.lg,
  notchRadius = 8,
  notchColor = COLORS.bg || '#F8FAFC',
  borderColor = COLORS.border || '#E2E8F0',
  backgroundColor = COLORS.surface || '#FFFFFF',
  notchPositionPercent = 50,
  showPerforationLine = false,
}: TicketCardFrameProps) {
  const showNotches = notchRadius > 0;
  const notchSize = notchRadius * 2;

  return (
    <View style={[styles.frame, style]}>
      <View
        style={[
          styles.inner,
          {
            borderRadius,
            borderColor,
            backgroundColor,
          },
        ]}
      >
        {children}

        {showNotches && showPerforationLine ? (
          <View
            pointerEvents="none"
            style={[
              styles.perforationLine,
              {
                top: `${notchPositionPercent}%`,
                left: notchRadius + 4,
                right: notchRadius + 4,
                borderColor,
              },
            ]}
          />
        ) : null}
      </View>

      {showNotches ? (
        <>
          <View
            pointerEvents="none"
            style={[
              styles.notch,
              {
                top: `${notchPositionPercent}%`,
                width: notchSize,
                height: notchSize,
                borderRadius: notchRadius,
                backgroundColor: notchColor,
                borderColor,
                borderWidth: 1,
                left: -notchRadius,
                marginTop: -notchRadius,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.notch,
              {
                top: `${notchPositionPercent}%`,
                width: notchSize,
                height: notchSize,
                borderRadius: notchRadius,
                backgroundColor: notchColor,
                borderColor,
                borderWidth: 1,
                right: -notchRadius,
                marginTop: -notchRadius,
              },
            ]}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
    overflow: 'visible',
    ...SHADOWS.sm,
  },
  inner: {
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
    width: '100%',
    height: '100%',
    flex: 1,
  },
  perforationLine: {
    position: 'absolute',
    height: 0,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    zIndex: 1,
  },
  notch: {
    position: 'absolute',
    zIndex: 3,
  },
});

export default TicketCardFrame;