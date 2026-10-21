/**
 * HelpSupportScreen — MahaTicket
 * Mirrors web /contact: email, phone hours, address, FAQ + message form (opens email app)
 */
import React, { useState } from 'react';
import {
  Alert,
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
import { BackHeader, Button } from '../components';
import { CONTACT, WEB_CONTACT_URL, openMailto, openUrl } from '../lib/contact';

const FAQS = [
  {
    q: 'How do I download my ticket after booking?',
    a: 'Your ticket is sent to your email and WhatsApp right after successful payment. You can also open it any time from the My Tickets tab.',
  },
  {
    q: 'Can I cancel or reschedule my booking?',
    a: 'Cancellation rules vary by organizer. Check the event policy at checkout or read the Cancellation & Refund policy.',
    policy: 'refund',
  },
  {
    q: "I didn't receive my ticket. What should I do?",
    a: `Check your spam folder first, then open My Tickets and download it again. Still missing? Email ${CONTACT.emails.bookings} with your booking ID.`,
  },
  {
    q: 'How does QR scanning work at the venue?',
    a: 'Show the QR code on your ticket at the entrance. Each QR code can be scanned only once, so do not share screenshots publicly.',
  },
  {
    q: 'Is my payment information secure?',
    a: 'Yes. Payments are handled by trusted gateways (Razorpay) and we never store your card details.',
    policy: 'privacy',
  },
  {
    q: 'How can I list my event on MahaTicket?',
    a: `Use Post an Event in your profile, or email ${CONTACT.emails.partners} with your event details.`,
  },
];

function InfoRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      disabled={!onPress}
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.infoRow}
    >
      <Icon name={icon} size={18} color={COLORS.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, onPress && { color: COLORS.primary }]}>{value}</Text>
      </View>
      {onPress ? <Icon name="chevron-right" size={18} color={COLORS.textDim} /> : null}
    </TouchableOpacity>
  );
}

export default function HelpSupportScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState(user?.name && user.name !== 'App User' ? user.name : '');
  const [email, setEmail] = useState(user?.email || '');
  const [bookingId, setBookingId] = useState('');
  const [message, setMessage] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const send = () => {
    if (!message.trim()) {
      Alert.alert('Message required', 'Please describe how we can help.');
      return;
    }
    const body = [
      message.trim(),
      '',
      '— — —',
      `Name: ${name.trim() || '-'}`,
      `Email: ${email.trim() || '-'}`,
      `Phone: ${user?.phone || '-'}`,
      `Booking ID: ${bookingId.trim() || '-'}`,
      'Sent from MahaTicket Android app',
    ].join('\n');
    openMailto(CONTACT.emails.support, 'MahaTicket App Support Request', body);
  };

  const callPhone = CONTACT.phone ? () => openUrl(`tel:${CONTACT.phone.replace(/\s/g, '')}`) : undefined;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <BackHeader title="Help & Support" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>We're here to help</Text>
          <Text style={styles.sub}>आमच्याशी संपर्क साधा • Contact MahaTicket</Text>

          {/* Contact info */}
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.card}>
            <InfoRow
              icon="email-outline"
              label="General inquiries"
              value={CONTACT.emails.support}
              onPress={() => openUrl(`mailto:${CONTACT.emails.support}`)}
            />
            <View style={styles.sep} />
            <InfoRow
              icon="ticket-confirmation-outline"
              label="Booking issues"
              value={CONTACT.emails.bookings}
              onPress={() => openUrl(`mailto:${CONTACT.emails.bookings}`)}
            />
            <View style={styles.sep} />
            <InfoRow
              icon="handshake-outline"
              label="Partner / Organizer"
              value={CONTACT.emails.partners}
              onPress={() => openUrl(`mailto:${CONTACT.emails.partners}`)}
            />
            <View style={styles.sep} />
            <InfoRow
              icon="phone-outline"
              label="Customer care"
              value={CONTACT.phone || 'Reach us by email or the message form below'}
              onPress={callPhone}
            />
            <View style={styles.sep} />
            <InfoRow icon="clock-outline" label="Support hours" value={CONTACT.hours} />
            <View style={styles.sep} />
            <InfoRow
              icon="map-marker-outline"
              label="Office"
              value={CONTACT.address.join(', ')}
            />
          </View>
          <Text style={styles.note}>
            {CONTACT.closed}. {CONTACT.responseTime}.
          </Text>

          {/* Message form */}
          <Text style={styles.sectionTitle}>Send us a message</Text>
          <View style={styles.card}>
            <View style={styles.formPad}>
              <Text style={styles.label}>Your name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                placeholderTextColor={COLORS.textDim}
              />
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textDim}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.label}>Booking ID (optional)</Text>
              <TextInput
                style={styles.input}
                value={bookingId}
                onChangeText={setBookingId}
                placeholder="e.g. MT-2026-12345"
                placeholderTextColor={COLORS.textDim}
                autoCapitalize="characters"
              />
              <Text style={styles.label}>How can we help?</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Describe your question or issue"
                placeholderTextColor={COLORS.textDim}
                multiline
                textAlignVertical="top"
              />
              <Button
                title="Send via Email"
                onPress={send}
                fullWidth
                style={{ marginTop: SPACING.md }}
                icon={<Icon name="send" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />}
              />
            </View>
          </View>

          {/* FAQ */}
          <Text style={styles.sectionTitle}>Frequently asked questions</Text>
          <View style={styles.card}>
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <View key={f.q}>
                  {i > 0 && <View style={styles.sep} />}
                  <TouchableOpacity
                    style={styles.faqHead}
                    activeOpacity={0.7}
                    onPress={() => setOpenFaq(open ? null : i)}
                  >
                    <Text style={styles.faqQ}>{f.q}</Text>
                    <Icon
                      name={open ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={COLORS.textDim}
                    />
                  </TouchableOpacity>
                  {open && (
                    <View style={styles.faqBody}>
                      <Text style={styles.faqA}>{f.a}</Text>
                      {f.policy ? (
                        <TouchableOpacity
                          onPress={() => navigation.navigate('PolicyViewer', { type: f.policy })}
                        >
                          <Text style={styles.link}>
                            Read {f.policy === 'refund' ? 'Refund' : 'Privacy'} Policy
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <TouchableOpacity onPress={() => openUrl(WEB_CONTACT_URL)} style={styles.webLink}>
            <Icon name="open-in-new" size={14} color={COLORS.textMuted} />
            <Text style={styles.webLinkText}>View contact page on website</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.xl },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginTop: SPACING.xs },
  sub: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: SPACING.lg,
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  sep: { height: 1, backgroundColor: COLORS.border },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  infoValue: { color: COLORS.text, fontSize: 14, fontWeight: '600', marginTop: 1 },
  note: { color: COLORS.textMuted, fontSize: 12, marginTop: 8, lineHeight: 17 },
  formPad: { padding: 14 },
  label: { color: COLORS.text, fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 4 },
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
  faqHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  faqQ: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '600' },
  faqBody: { paddingHorizontal: 14, paddingBottom: 13 },
  faqA: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19 },
  link: { color: COLORS.primary, fontSize: 13, fontWeight: '700', marginTop: 6 },
  webLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.lg,
  },
  webLinkText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
});
