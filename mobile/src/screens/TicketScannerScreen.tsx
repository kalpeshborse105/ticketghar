/**
 * Ticket scanner entry:
 * - Organizer / scanner / staff → FastGate (web parity)
 * - Guest → simple ticket lookup
 */
import React, { useState } from 'react';
import {
  Linking,
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
import Toast from 'react-native-toast-message';
import { canScanTickets } from '../api';
import { useAuthStore } from '../store';
import { extractTicketCode, resolveTicketUrl } from '../lib/ticketCode';
import OrganizerFastGateScreen from './OrganizerFastGateScreen';

export { extractTicketCode, resolveTicketUrl } from '../lib/ticketCode';

export default function TicketScannerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const isOrganizerOrAdmin = canScanTickets(user?.role);

  const [ticketInput, setTicketInput] = useState('');
  const extractedPreviewCode = extractTicketCode(ticketInput);
  const resolvedTicketUrl = resolveTicketUrl(ticketInput);

  if (isOrganizerOrAdmin) {
    return <OrganizerFastGateScreen navigation={navigation} />;
  }

  const handleOpenTicketLink = async (raw?: string) => {
    const url = resolveTicketUrl(raw || ticketInput);
    if (!url) {
      Toast.show({
        type: 'error',
        text1: 'अवैध लिंक',
        text2: 'कृपया वैध तिकीट कोड किंवा QR माहिती प्रविष्ट करा.',
      });
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      Toast.show({ type: 'error', text1: 'लिंक उघडता आली नाही' });
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.topHeaderBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnCircle}>
          <Icon name="arrow-left" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitleText}>QR Ticket Lookup</Text>
          <Text style={styles.headerSubText}>तिकीट पडताळणी व माहिती</Text>
        </View>
        <View style={styles.roleLockPill}>
          <Icon name="shield-lock-outline" size={13} color="#EA580C" />
          <Text style={styles.roleLockPillText}>GUEST VIEW</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>तिकीट कोड किंवा QR Payload</Text>
          <TextInput
            style={styles.input}
            placeholder="उदा. TG-TK-84920"
            placeholderTextColor="#94A3B8"
            value={ticketInput}
            onChangeText={setTicketInput}
            autoCapitalize="none"
          />
          {extractedPreviewCode ? (
            <Text style={styles.hint}>Detected: {extractedPreviewCode}</Text>
          ) : null}
          {resolvedTicketUrl ? (
            <Text style={styles.hint} numberOfLines={1}>
              {resolvedTicketUrl}
            </Text>
          ) : null}
          <TouchableOpacity style={styles.primaryBtn} onPress={() => handleOpenTicketLink()}>
            <Text style={styles.primaryBtnText}>डिजिटल तिकीट उघडा</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() =>
              user
                ? navigation.navigate('Main', { screen: 'Tickets' })
                : navigation.navigate('Login')
            }
          >
            <Text style={styles.secondaryBtnText}>
              {user ? 'माझी तिकिटे' : 'लॉगिन करा'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtnCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  headerSubText: { fontSize: 11, color: '#64748B', marginTop: 1 },
  roleLockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  roleLockPillText: { fontSize: 10, fontWeight: '900', color: '#C2410C' },
  scroll: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  label: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  hint: { fontSize: 11, color: '#64748B' },
  primaryBtn: {
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '900' },
  secondaryBtn: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  secondaryBtnText: { color: '#EA580C', fontWeight: '800' },
});
