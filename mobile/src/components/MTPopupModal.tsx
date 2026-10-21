import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type MTPopupType = 'warning' | 'error' | 'success' | 'info' | 'help';

export interface MTPopupModalProps {
  visible: boolean;
  type?: MTPopupType;
  title: string;
  message: string;
  primaryButtonText?: string;
  onPrimaryPress?: () => void;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
  onRequestClose?: () => void;
}

export function MTPopupModal({
  visible,
  type = 'warning',
  title,
  message,
  primaryButtonText = 'समजले (OK)',
  onPrimaryPress,
  secondaryButtonText,
  onSecondaryPress,
  onRequestClose,
}: MTPopupModalProps) {
  const getIconConfig = () => {
    switch (type) {
      case 'error':
        return {
          icon: 'alert-circle-outline',
          iconColor: '#DC2626',
          bgColor: '#FEF2F2',
          borderColor: '#FECACA',
          btnBg: '#DC2626',
        };
      case 'success':
        return {
          icon: 'check-circle-outline',
          iconColor: '#16A34A',
          bgColor: '#F0FDF4',
          borderColor: '#BBF7D0',
          btnBg: '#16A34A',
        };
      case 'help':
        return {
          icon: 'help-circle-outline',
          iconColor: '#0284C7',
          bgColor: '#F0F9FF',
          borderColor: '#BAE6FD',
          btnBg: '#0284C7',
        };
      case 'info':
        return {
          icon: 'information-outline',
          iconColor: '#EA580C',
          bgColor: '#FFF7ED',
          borderColor: '#FED7AA',
          btnBg: '#EA580C',
        };
      case 'warning':
      default:
        return {
          icon: 'alert-outline',
          iconColor: '#EA580C',
          bgColor: '#FFF7ED',
          borderColor: '#FED7AA',
          btnBg: '#EA580C',
        };
    }
  };

  const config = getIconConfig();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose || onSecondaryPress || onPrimaryPress}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Icon Badge */}
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: config.bgColor, borderColor: config.borderColor },
            ]}
          >
            <Icon name={config.icon} size={30} color={config.iconColor} />
          </View>

          {/* Title with Devanagari safe line height & padding */}
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>

          {/* Description / Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Action Buttons Row */}
          <View style={styles.actionRow}>
            {secondaryButtonText && onSecondaryPress ? (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={onSecondaryPress}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryBtnText}>{secondaryButtonText}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: config.btnBg },
                !secondaryButtonText && { width: '100%' },
              ]}
              onPress={onPrimaryPress || onRequestClose}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>{primaryButtonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    zIndex: 9999,
  },
  card: {
    width: '100%',
    maxWidth: Math.min(SCREEN_WIDTH - 40, 380),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 28,
    paddingHorizontal: 4,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
    textAlign: 'center',
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default MTPopupModal;
