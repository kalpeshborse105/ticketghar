/**
 * PostEventScreen — MahaTicket "Post an Event" / Partner with Us
 * Submits to the same endpoint as the web Partner With Us modal
 * (POST /api/partner-with-us). Falls back to an email draft if the request fails.
 */
import React, { useState } from 'react';
import {
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, RADIUS, SPACING } from '../theme';
import { useAuthStore } from '../store';
import { BackHeader, Button, MTPopupModal } from '../components';
import { CONTACT, PARTNER_API_URL, WEB_ORIGIN, openMailto, openUrl } from '../lib/contact';

const EVENT_TYPES = [
  { value: 'plays', label: 'Plays' },
  { value: 'music', label: 'Concert' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'workshops', label: 'Workshop' },
];

const CITIES = ['Pune', 'Mumbai', 'Thane', 'Nashik', 'Nagpur', 'Kolhapur'];

function Chips({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => onChange(o.value)}
            activeOpacity={0.8}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function PostEventScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState(user?.name && user.name !== 'App User' ? user.name : '');
  const [phone, setPhone] = useState((user?.phone || '').replace(/\D/g, '').slice(-10));
  const [email, setEmail] = useState(user?.email || '');
  const [eventName, setEventName] = useState('');
  const [category, setCategory] = useState('plays');
  const [city, setCity] = useState('Pune');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [popupModal, setPopupModal] = useState<{
    visible: boolean;
    type: 'warning' | 'error' | 'success' | 'info';
    title: string;
    message: string;
    primaryButtonText?: string;
    secondaryButtonText?: string;
    onPrimaryPress?: () => void;
    onSecondaryPress?: () => void;
  }>({
    visible: false,
    type: 'warning',
    title: '',
    message: '',
  });

  const mailFallback = () => {
    const typeLabel = EVENT_TYPES.find((t) => t.value === category)?.label || category;
    openMailto(
      CONTACT.emails.partners,
      `Post an Event — ${eventName.trim() || 'New event'}`,
      [
        `Organizer: ${name.trim()}`,
        `Phone: +91 ${phone}`,
        `Email: ${email.trim()}`,
        `Event: ${eventName.trim()}`,
        `Type: ${typeLabel}`,
        `City: ${city}`,
        '',
        message.trim(),
      ].join('\n')
    );
  };

  const validate = () => {
    if (!name.trim()) return 'कृपया आपले नाव टाका (Please enter your name).';
    if (phone.replace(/\D/g, '').length !== 10) return 'कृपया वैध १०-अंकी मोबाईल नंबर टाका (Enter a valid 10-digit mobile number).';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'कृपया वैध ईमेल पत्ता टाका (Enter a valid email address).';
    if (!eventName.trim()) return 'कृपया आपल्या कार्यक्रमाचे नाव टाका (Please enter your event name).';
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) {
      setPopupModal({
        visible: true,
        type: 'warning',
        title: 'माहिती तपासा (Check Details)',
        message: err,
        primaryButtonText: 'समजले (OK)',
        onPrimaryPress: () => setPopupModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }
    setSubmitting(true);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(PARTNER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          organizerName: name.trim(),
          mobile: `+91${phone}`,
          email: email.trim(),
          eventName: eventName.trim(),
          category,
          city,
          message: message.trim() || null,
        }),
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setDone(true);
    } catch (e: any) {
      clearTimeout(timer);
      setPopupModal({
        visible: true,
        type: 'error',
        title: 'सबमिट होऊ शकले नाही (Could Not Submit)',
        message: 'सर्व्हरशी संपर्क होऊ शकला नाही. आपण ईमेलद्वारे पाठवू इच्छिता का? (Could not reach server. Send details by email instead?)',
        primaryButtonText: 'ईमेल पाठवा (Email us)',
        secondaryButtonText: 'रद्द करा (Cancel)',
        onPrimaryPress: () => {
          setPopupModal((prev) => ({ ...prev, visible: false }));
          mailFallback();
        },
        onSecondaryPress: () => setPopupModal((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <BackHeader title="Post an Event" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {done ? (
            <View style={[styles.card, styles.doneCard]}>
              <Icon name="check-circle-outline" size={44} color={COLORS.success} />
              <Text style={styles.doneTitle}>Request received</Text>
              <Text style={styles.doneText}>
                Thank you! Our onboarding team will contact you within 24 hours.
              </Text>
              <Button
                title="Back to Profile"
                onPress={() => navigation.goBack()}
                fullWidth
                style={{ marginTop: SPACING.base }}
              />
            </View>
          ) : (
            <>
              <Text style={styles.title}>List your show on MahaTicket</Text>
              <Text style={styles.sub}>
                Theatre producers, concert organizers and venue managers — tell us about your event
                and we will get in touch.
              </Text>

              <View style={[styles.card, { marginTop: SPACING.base }]}>
                <View style={styles.formPad}>
                  <Text style={styles.label}>Your name *</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Organizer / producer name"
                    placeholderTextColor={COLORS.textDim}
                  />

                  <Text style={styles.label}>Mobile number *</Text>
                  <View style={styles.phoneRow}>
                    <Text style={styles.prefix}>+91</Text>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={phone}
                      onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit number"
                      placeholderTextColor={COLORS.textDim}
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                  </View>

                  <Text style={styles.label}>Email *</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={COLORS.textDim}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <Text style={styles.label}>Event name *</Text>
                  <TextInput
                    style={styles.input}
                    value={eventName}
                    onChangeText={setEventName}
                    placeholder="e.g. Natasamrat — Pune show"
                    placeholderTextColor={COLORS.textDim}
                  />

                  <Text style={styles.label}>Event type</Text>
                  <Chips options={EVENT_TYPES} value={category} onChange={setCategory} />

                  <Text style={styles.label}>City</Text>
                  <Chips
                    options={CITIES.map((c) => ({ value: c, label: c }))}
                    value={city}
                    onChange={setCity}
                  />

                  <Text style={styles.label}>Message (optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Dates, venue preference, expected audience..."
                    placeholderTextColor={COLORS.textDim}
                    multiline
                    textAlignVertical="top"
                  />

                  <Button
                    title="Submit Request"
                    onPress={submit}
                    loading={submitting}
                    fullWidth
                    style={{ marginTop: SPACING.base }}
                  />
                  <TouchableOpacity onPress={mailFallback} style={styles.altBtn}>
                    <Text style={styles.altText}>Or email {CONTACT.emails.partners}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity onPress={() => openUrl(WEB_ORIGIN)} style={styles.webLink}>
                <Icon name="open-in-new" size={14} color={COLORS.textMuted} />
                <Text style={styles.webLinkText}>Open MahaTicket website</Text>
              </TouchableOpacity>
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <MTPopupModal
        visible={popupModal.visible}
        type={popupModal.type}
        title={popupModal.title}
        message={popupModal.message}
        primaryButtonText={popupModal.primaryButtonText}
        secondaryButtonText={popupModal.secondaryButtonText}
        onPrimaryPress={popupModal.onPrimaryPress || (() => setPopupModal((prev) => ({ ...prev, visible: false })))}
        onSecondaryPress={popupModal.onSecondaryPress || (() => setPopupModal((prev) => ({ ...prev, visible: false })))}
        onRequestClose={() => setPopupModal((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.xl },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginTop: SPACING.xs },
  sub: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formPad: { padding: 14 },
  label: { color: COLORS.text, fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  textarea: { minHeight: 96 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prefix: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: COLORS.white },
  altBtn: { alignItems: 'center', paddingVertical: 12 },
  altText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  webLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.base,
  },
  webLinkText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  doneCard: { alignItems: 'center', padding: SPACING.xl, marginTop: SPACING.xl },
  doneTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginTop: 10 },
  doneText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
});
