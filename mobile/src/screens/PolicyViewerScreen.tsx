import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../theme';
import { BackHeader } from '../components';

export default function PolicyViewerScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { type = 'terms' } = route.params || {};

  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'refund'>(type);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <BackHeader
        title="Official Legal & Policies"
        onBack={() => navigation.goBack()}
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'terms' && styles.tabActive]}
          onPress={() => setActiveTab('terms')}
        >
          <Text style={[styles.tabText, activeTab === 'terms' && styles.tabTextActive]}>Terms</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'privacy' && styles.tabActive]}
          onPress={() => setActiveTab('privacy')}
        >
          <Text style={[styles.tabText, activeTab === 'privacy' && styles.tabTextActive]}>Privacy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'refund' && styles.tabActive]}
          onPress={() => setActiveTab('refund')}
        >
          <Text style={[styles.tabText, activeTab === 'refund' && styles.tabTextActive]}>Refund</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'terms' && (
          <View style={styles.card}>
            <Text style={styles.heading}>Terms of Use (नियम व अटी)</Text>
            <Text style={styles.meta}>Official Customer Service Policy • MahaTicket (महाटिकिट)</Text>

            <Text style={styles.sectionTitle}>1. Platform Acceptance</Text>
            <Text style={styles.paragraph}>
              Welcome to MahaTicket (महाटिकिट), Maharashtra's premier digital ticketing and theatre discovery platform for Marathi theatre plays, live musical concerts, and cultural performances. By booking through this mobile application, you agree to comply with all platform terms and individual auditorium house rules.
            </Text>

            <Text style={styles.sectionTitle}>2. Seat Reservation & Temporary Lock</Text>
            <Text style={styles.paragraph}>
              • Once selected, seats are reserved with a strict 10-minute temporary inventory lock.{'\n'}
              • If payment is not completed within 10 minutes, held seats are automatically released back to the general public inventory.{'\n'}
              • Maximum of 5 tickets allowed per customer transaction to prevent scalping and unauthorized hoarding.
            </Text>

            <Text style={styles.sectionTitle}>3. Pricing & Convenience Fees</Text>
            <Text style={styles.paragraph}>
              All ticket prices are listed in Indian Rupees (₹). MahaTicket applies a standard platform convenience fee of ₹30 per ticket plus 18% GST (Goods and Services Tax). Any add-ons (concessions, snacks, parking) are charged separately as chosen.
            </Text>

            <Text style={styles.sectionTitle}>4. Auditorium Entry & QR Verification</Text>
            <Text style={styles.paragraph}>
              Digital QR e-tickets generated on this app are cryptographically encrypted with AES-256-GCM. Present your digital ticket on your phone at the auditorium entry gate for contactless scanner verification. Physical printouts are not required.
            </Text>
          </View>
        )}

        {activeTab === 'privacy' && (
          <View style={styles.card}>
            <Text style={styles.heading}>Privacy Policy (गोपनीयता धोरण)</Text>
            <Text style={styles.meta}>Data Protection & Confidentiality • MahaTicket</Text>

            <Text style={styles.sectionTitle}>1. Information We Collect</Text>
            <Text style={styles.paragraph}>
              To process your ticket bookings and issue entry passes, we collect your name, 10-digit mobile phone number, and email address. We never store debit/credit card numbers or UPI PINs on our servers.
            </Text>

            <Text style={styles.sectionTitle}>2. Secure Gateway Processing</Text>
            <Text style={styles.paragraph}>
              All payment transactions are encrypted with 256-bit TLS encryption and processed directly via RBI-authorized payment aggregators (Razorpay / UPI).
            </Text>

            <Text style={styles.sectionTitle}>3. Communication & SMS/WhatsApp Updates</Text>
            <Text style={styles.paragraph}>
              Your mobile number and email are used exclusively for sending order confirmations, QR ticket links, venue notifications, and critical showtime updates. We never sell your data to third-party marketing brokers.
            </Text>
          </View>
        )}

        {activeTab === 'refund' && (
          <View style={styles.card}>
            <Text style={styles.heading}>Cancellation & Refund (परतावा धोरण)</Text>
            <Text style={styles.meta}>Fair & Transparent Ticketing Guidelines • MahaTicket</Text>

            <Text style={styles.sectionTitle}>1. Organizer Cancellation & Rescheduling</Text>
            <Text style={styles.paragraph}>
              If a theatre play or live concert is cancelled or postponed by the production house/organizer, customers receive an automatic 100% full refund directly to their original payment source within 5 to 7 business days.
            </Text>

            <Text style={styles.sectionTitle}>2. Customer Voluntary Cancellation</Text>
            <Text style={styles.paragraph}>
              Per standard theatrical and cinema booking guidelines across India, confirmed ticket bookings are generally non-refundable and cannot be exchanged once the show has commenced. If cancellation protection was active at checkout, cancellation requests must be submitted at least 4 hours before scheduled showtime.
            </Text>

            <Text style={styles.sectionTitle}>3. Support Escalations</Text>
            <Text style={styles.paragraph}>
              For booking assistance, payment reconciliation, or venue queries, contact our 24x7 customer support desk via WhatsApp or email at support@mahaticket.kalpkrutinfotech.com.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: SPACING.base,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: COLORS.white,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: SPACING.base,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heading: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  meta: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: SPACING.md,
    marginBottom: 6,
  },
  paragraph: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
});
