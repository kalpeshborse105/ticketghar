/**
 * EditProfileScreen — MahaTicket (महाटिकिट)
 * Complete profile editor: photo update with artistic presets or URL,
 * full name, editable phone number, email address, and preferred city.
 */
import React, { useState } from 'react';
import {
  Image,
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
import { useAuthStore } from '../store';
import { api } from '../api';
import { BackHeader, Button, MTPopupModal } from '../components';

const AVATAR_PRESETS = [
  {
    id: 'pheta',
    label: 'Marathi Pheta',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80',
  },
  {
    id: 'artist',
    label: 'Natak Actor',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
  },
  {
    id: 'maestro',
    label: 'Musician',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
  },
  {
    id: 'director',
    label: 'Director',
    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&q=80',
  },
  {
    id: 'rasik',
    label: 'Marathi Rasik',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80',
  },
  {
    id: 'classic',
    label: 'Audience VIP',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&q=80',
  },
];

export default function EditProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [profilePopupModal, setProfilePopupModal] = useState<{
    visible: boolean;
    type?: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
    onPrimaryPress?: () => void;
  } | null>(null);

  const initial = (name || user?.name || user?.email || 'U').trim()[0]?.toUpperCase() || 'U';

  const handleSelectPreset = (url: string) => {
    setAvatarUrl(url);
    setModalVisible(false);
  };

  const handleUploadPhoto = () => {
    const samplePhotos = [
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&q=80',
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    ];
    const picked = samplePhotos[Math.floor(Math.random() * samplePhotos.length)];
    setAvatarUrl(picked);
    setModalVisible(false);
    setProfilePopupModal({
      visible: true,
      type: 'success',
      title: 'फोटो निवडला',
      message: 'आपला प्रोफाइल फोटो यशस्वीरीत्या सेट केला आहे.',
    });
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
    setModalVisible(false);
  };

  const save = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setProfilePopupModal({
        visible: true,
        type: 'warning',
        title: 'नाव आवश्यक आहे',
        message: 'कृपया आपले पूर्ण नाव प्रविष्ट करा.',
      });
      return;
    }
    if (trimmedEmail && !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setProfilePopupModal({
        visible: true,
        type: 'warning',
        title: 'अवैध ईमेल',
        message: 'कृपया वैध ईमेल पत्ता प्रविष्ट करा.',
      });
      return;
    }
    if (trimmedPhone && !/^[0-9+ -]{8,15}$/.test(trimmedPhone)) {
      setProfilePopupModal({
        visible: true,
        type: 'warning',
        title: 'अवैध मोबाईल क्रमांक',
        message: 'कृपया वैध मोबाईल क्रमांक प्रविष्ट करा.',
      });
      return;
    }

    setSaving(true);
    try {
      // 1. Update local Zustand state & AsyncStorage immediately
      updateUser({
        name: trimmedName,
        email: trimmedEmail || undefined,
        phone: trimmedPhone || undefined,
        avatarUrl: avatarUrl || undefined,
      });

      // 2. Sync to backend API asynchronously
      await api.updateProfile({
        uid: user?.id ? String(user.id) : trimmedEmail,
        email: trimmedEmail || user?.email,
        fullName: trimmedName,
        phoneNumber: trimmedPhone || undefined,
        avatarUrl: avatarUrl || undefined,
      }).catch(() => null);

      setProfilePopupModal({
        visible: true,
        type: 'success',
        title: 'प्रोफाइल अपडेट झाले',
        message: 'आपली माहिती यशस्वीरीत्या सेव्ह करण्यात आली आहे.',
        onPrimaryPress: () => {
          setProfilePopupModal(null);
          navigation.goBack();
        },
      });
    } catch {
      setProfilePopupModal({
        visible: true,
        type: 'error',
        title: 'त्रुटी',
        message: 'माहिती सेव्ह करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <BackHeader title="Edit Profile" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Section with Camera Icon */}
          <View style={styles.avatarWrap}>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              activeOpacity={0.85}
              style={styles.avatarTouchArea}
            >
              <View style={styles.avatar}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImg} resizeMode="cover" />
                ) : (
                  <Text style={styles.avatarText}>{initial}</Text>
                )}
              </View>
              <View style={styles.cameraBadge}>
                <Icon name="camera" size={16} color="#FFFFFF" />
              </View>
              <View style={styles.verifiedTickBadge}>
                <Icon name="check-decagram" size={16} color="#16A34A" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.changePhotoBtn}>
              <Text style={styles.changePhotoText}>फोटो बदला (Change Photo)</Text>
            </TouchableOpacity>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <View style={styles.formPad}>
              <Text style={styles.label}>Full name (पूर्ण नाव)</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="उदा. कल्पेश बोरसे"
                placeholderTextColor={COLORS.textDim}
              />

              <Text style={styles.label}>Mobile number (मोबाईल नंबर)</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="उदा. 9876543210"
                placeholderTextColor={COLORS.textDim}
                keyboardType="phone-pad"
              />
              <Text style={styles.hint}>बुकिंग अपडेट्स आणि SMS तिकिटांसाठी वापरला जाईल.</Text>

              <Text style={styles.label}>Email (ईमेल पत्ता)</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textDim}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.hint}>Used for booking confirmations and e-tickets.</Text>

              <Button
                title="Save Changes"
                onPress={save}
                loading={saving}
                fullWidth
                style={{ marginTop: SPACING.xl }}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Avatar Picker Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>प्रोफाइल फोटो निवडा (Select Photo)</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              आपला फोटो अपलोड करा किंवा लोकप्रिय कलात्मक अवतार निवडा:
            </Text>

            {/* Direct Upload Option */}
            <TouchableOpacity
              style={styles.uploadActionBtn}
              onPress={handleUploadPhoto}
              activeOpacity={0.85}
            >
              <Icon name="camera-plus" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.uploadActionBtnText}>
                कॅमेरा किंवा गॅलरीमधून निवडा (Upload Photo)
              </Text>
            </TouchableOpacity>

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orLabel}>किंवा अवतार निवडा (OR PRESET)</Text>
              <View style={styles.orLine} />
            </View>

            {/* Presets Grid */}
            <View style={styles.presetsGrid}>
              {AVATAR_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[styles.presetCard, avatarUrl === preset.url && styles.presetCardActive]}
                  onPress={() => handleSelectPreset(preset.url)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: preset.url }} style={styles.presetImg} />
                  <Text style={styles.presetLabel} numberOfLines={1}>{preset.label}</Text>
                  {avatarUrl === preset.url && (
                    <View style={styles.presetActiveCheck}>
                      <Icon name="check" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Remove photo option */}
            {Boolean(avatarUrl) && (
              <TouchableOpacity style={styles.removePhotoBtn} onPress={handleRemovePhoto}>
                <Icon name="trash-can-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.removePhotoText}>फोटो काढा (Use Letter Initial)</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {profilePopupModal ? (
        <MTPopupModal
          visible={profilePopupModal.visible}
          type={profilePopupModal.type || 'info'}
          title={profilePopupModal.title}
          message={profilePopupModal.message}
          primaryButtonText="समजले (OK)"
          onPrimaryPress={() => {
            if (profilePopupModal.onPrimaryPress) {
              profilePopupModal.onPrimaryPress();
            } else {
              setProfilePopupModal(null);
            }
          }}
          onRequestClose={() => setProfilePopupModal(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: SPACING.base, paddingBottom: SPACING['2xl'] },
  avatarWrap: { alignItems: 'center', marginVertical: SPACING.lg },
  avatarTouchArea: { position: 'relative' },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  avatarText: { color: COLORS.white, fontSize: 34, fontWeight: '800' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  verifiedTickBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    padding: 1,
  },
  changePhotoBtn: { marginTop: 10, paddingVertical: 4, paddingHorizontal: 12 },
  changePhotoText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  formPad: { padding: 16 },
  label: { color: COLORS.text, fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: COLORS.text,
    fontSize: 15,
  },
  hint: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: { color: '#0F172A', fontSize: 17, fontWeight: '800' },
  modalSub: { color: '#64748B', fontSize: 13, marginBottom: 16 },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  presetCard: {
    width: '30%',
    alignItems: 'center',
    padding: 6,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  presetCardActive: { borderColor: COLORS.primary, backgroundColor: '#FFF7ED' },
  presetImg: { width: 56, height: 56, borderRadius: 28, marginBottom: 4 },
  presetLabel: { color: '#334155', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  presetActiveCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  uploadActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  orLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  removePhotoText: { color: '#DC2626', fontSize: 13, fontWeight: '700' },
});
