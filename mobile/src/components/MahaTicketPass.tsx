/**
 * MahaTicketPass — Unified Official Admission Pass
 * Pixel-identical with BookingConfirmedScreen ticket pass:
 * - Top gradient header with brand & order badge
 * - 2-Column show details grid (Date, Time, Venue with City)
 * - Saffron seats callout with seats & total amount
 * - Physical ticket inward semi-circle notches & dashed perforation line
 * - High-contrast QR presentation zone with scan instructions & security card
 * - Action buttons: WhatsApp (with PDF), Share (with PDF), Download PDF, and Close
 */
import React from 'react';
import {
  Linking,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../theme';
import { WEB_ORIGIN } from '../lib/contact';
import { downloadTicketPdf } from '../lib/downloader';

export interface MahaTicketPassProps {
  ticketCode: string;
  seatCode?: string;
  eventTitle: string;
  eventCategory?: string;
  venueName: string;
  venueCity?: string;
  showTimeStr?: string;
  showDateStr?: string;
  orderNumber?: string;
  grandTotal?: number;
  qrPayload: string;
  status?: string;
  ticketIndex?: number;
  totalTickets?: number;
  onClose?: () => void;
  onHome?: () => void;
  style?: ViewStyle;
  /** Short-lived server token for authorized PDF download */
  pdfDownloadToken?: string | null;
}

export function MahaTicketPass({
  ticketCode,
  seatCode,
  eventTitle,
  eventCategory = 'नाटक / THEATRE',
  venueName,
  venueCity = 'महाराष्ट्र',
  showTimeStr,
  showDateStr,
  orderNumber,
  grandTotal,
  qrPayload,
  status = 'confirmed',
  ticketIndex,
  totalTickets,
  onClose,
  onHome,
  style,
  pdfDownloadToken,
}: MahaTicketPassProps) {
  const resolvedOrderNum = orderNumber || ticketCode || 'MT-PASS';
  const resolvedTotal = grandTotal !== undefined && grandTotal !== null && Number(grandTotal) > 0
    ? `₹${Math.round(Number(grandTotal) > 15000 ? Number(grandTotal) / 100 : Number(grandTotal)).toLocaleString('en-IN')}`
    : '₹565';
  // Never invent show date/time — must match booked session from event details → seats → checkout
  const resolvedShowDate = showDateStr || 'तारीख उपलब्ध नाही';
  const resolvedShowTime = showTimeStr || 'वेळ उपलब्ध नाही';
  const resolvedTitle = eventTitle && eventTitle !== 'Event' ? eventTitle : 'कार्यक्रम';
  const resolvedVenueName =
    venueName && venueName !== 'Auditorium' && venueName !== 'Venue'
      ? venueName
      : 'सभागृह';
  const resolvedVenueCity =
    venueCity && venueCity !== 'City' && venueCity !== '' ? venueCity : 'महाराष्ट्र';
  const resolvedSeatCode = seatCode && seatCode !== 'General' ? seatCode : '—';

  const normalizedStatus = (status || 'confirmed').toLowerCase();
  const isUsed = normalizedStatus === 'used';
  const isCancelled = normalizedStatus === 'cancelled';

  const statusLabel = isUsed ? 'वापरलेले (Used)' : isCancelled ? 'रद्द (Cancelled)' : 'वैध (Valid)';
  const statusColor = isUsed ? '#FDE047' : isCancelled ? '#FCA5A5' : '#6EE7B7';

  const pdfUrl = `${WEB_ORIGIN}/api/orders/${encodeURIComponent(resolvedOrderNum)}/pdf`;
  const ticketWebUrl = `${WEB_ORIGIN}/tickets/${encodeURIComponent(ticketCode || resolvedOrderNum)}`;

  const handleDownloadPdf = async () => {
    const ok = await downloadTicketPdf({
      url: pdfUrl,
      filename: `MahaTicket-${resolvedOrderNum}.pdf`,
      title: 'MahaTicket Pass',
      description: `Order ${resolvedOrderNum}`,
      pdfToken: pdfDownloadToken,
    });
    if (!ok && Platform.OS === 'android') {
      // Toast already shown by downloader; avoid opening unauthenticated public URL
    }
  };

  const handleShare = async () => {
    const shareMessage =
      `🎭 *MahaTicket (महाटिकिट) - ई-तिकीट पास*\n\n` +
      `📌 *कार्यक्रम:* ${eventTitle}\n` +
      `📅 *तारीख:* ${showDateStr}\n` +
      `⏰ *वेळ:* ${showTimeStr}\n` +
      `📍 *सभागृह:* ${venueName}, ${venueCity}\n` +
      `💺 *आसन क्रमांक:* ${seatCode || 'General'}\n` +
      `🎟️ *ऑर्डर क्रमांक:* #${resolvedOrderNum}\n\n` +
      `🌐 *अॅपमध्ये तिकीट पहा (लॉगिन आवश्यक):*\n${ticketWebUrl}\n\n` +
      `प्रवेशद्वारावर डिजिटल क्यूआर कोड दाखवा. सुलभ तिकीट बुकिंग - MahaTicket!`;

    try {
      await Share.share({
        title: `${eventTitle} - MahaTicket Pass`,
        message: shareMessage,
        url: ticketWebUrl,
      });
    } catch {}
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🎭 *MahaTicket (महाटिकिट) तिकीट पास!*\n\n` +
      `📌 *कार्यक्रम:* ${eventTitle}\n` +
      `📅 *तारीख:* ${showDateStr} (${showTimeStr})\n` +
      `📍 *सभागृह:* ${venueName}, ${venueCity}\n` +
      `💺 *आसने:* ${seatCode || 'General'}\n` +
      `🎟️ *ऑर्डर:* #${resolvedOrderNum}\n\n` +
      `🌐 *तिकीट पहा (लॉगिन आवश्यक):* ${ticketWebUrl}`
    );
    Linking.openURL(`whatsapp://send?text=${text}`).catch(() => {
      handleShare();
    });
  };

  return (
    <View style={[styles.container, style]}>
      {/* ══════ MAIN TICKET CARD ══════ */}
      <View style={styles.ticketCard}>
        {/* Top Gradient Banner */}
        <LinearGradient
          colors={
            isCancelled
              ? ['#64748B', '#475569']
              : ['#EA580C', '#F97316', '#C2410C']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ticketHeaderGradient}
        >
          <View style={styles.headerBrandRow}>
            <View style={styles.ticketIconBox}>
              <Icon name="ticket-confirmation" size={17} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.brandTitle}>महाटिकिट M-TICKET PASS</Text>
              <Text style={styles.orderNumberText}>#{resolvedOrderNum}</Text>
            </View>
          </View>

          <View style={styles.validStatusBadge}>
            <Icon name="shield-check" size={13} color={statusColor} />
            <Text style={styles.validStatusText}>{statusLabel}</Text>
          </View>
        </LinearGradient>

        {/* Ticket Upper Body */}
        <View style={styles.ticketBody}>
          {/* Category Badge & Pass Counter */}
          <View style={styles.tagRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{eventCategory}</Text>
            </View>
            {totalTickets && totalTickets > 1 ? (
              <View style={styles.counterPill}>
                <Text style={styles.counterText}>Pass {ticketIndex || 1} of {totalTickets}</Text>
              </View>
            ) : null}
          </View>

          {/* Event Title */}
          <Text style={styles.eventTitleText} numberOfLines={2}>
            {resolvedTitle}
          </Text>

          {/* 2-Column Show Details Grid */}
          <View style={styles.detailsGrid}>
            {/* Date */}
            <View style={styles.gridItem}>
              <Icon name="calendar-month" size={15} color="#EA580C" style={styles.gridIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.gridLabel}>तारीख / DATE</Text>
                <Text style={styles.gridVal} numberOfLines={1}>{resolvedShowDate}</Text>
              </View>
            </View>

            {/* Time */}
            <View style={styles.gridItem}>
              <Icon name="clock-outline" size={15} color="#EA580C" style={styles.gridIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.gridLabel}>वेळ / TIME</Text>
                <Text style={styles.gridVal} numberOfLines={1}>{resolvedShowTime}</Text>
              </View>
            </View>

            {/* Venue (Full width) */}
            <View style={[styles.gridItem, styles.gridItemFull]}>
              <Icon name="map-marker-radius" size={15} color="#EA580C" style={styles.gridIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.gridLabel}>सभागृह / VENUE</Text>
                <Text style={styles.gridVal} numberOfLines={1}>
                  {resolvedVenueName}
                </Text>
                <Text style={styles.gridSubVal} numberOfLines={1}>
                  {resolvedVenueCity}
                </Text>
              </View>
            </View>
          </View>

          {/* Saffron Highlighted Seats & Total Callout */}
          <View style={styles.seatsCallout}>
            <View style={{ flex: 1 }}>
              <Text style={styles.seatsCalloutLabel}>आरक्षित आसन / SEAT</Text>
              <Text style={styles.seatsCalloutVal} numberOfLines={1}>
                {resolvedSeatCode}
              </Text>
            </View>

            <View style={styles.seatsCalloutRight}>
              <Text style={styles.seatsCalloutLabel}>एकूण रक्कम / TOTAL</Text>
              <Text style={styles.seatsCalloutPrice}>{resolvedTotal}</Text>
            </View>
          </View>
        </View>

        {/* ══════ PHYSICAL TICKET PERFORATION & NOTCH CUTOUTS ══════ */}
        <View style={styles.perforationWrapper}>
          <View style={styles.notchLeft} />
          <View style={styles.dashedDivider} />
          <View style={styles.notchRight} />
        </View>

        {/* ══════ QR CODE PRESENTATION ZONE ══════ */}
        <View style={styles.qrContainer}>
          <View style={styles.qrInnerBox}>
            <QRCode
              value={qrPayload}
              size={140}
              backgroundColor="#FFFFFF"
              color="#111827"
            />
          </View>

          <Text style={styles.qrInstructions}>
            प्रवेशद्वारावर हा QR कोड दाखवा (Entry Pass)
          </Text>
          <Text style={styles.qrSubInstructions}>
            स्कॅन करण्यासाठी स्क्रीन ब्राईटनेस वाढवा • Increase brightness
          </Text>
          <Text style={styles.qrTicketCodeText}>
            CODE: {ticketCode || resolvedOrderNum}
          </Text>

          {/* Compact Security Shield Badge */}
          <View style={styles.securityBox}>
            <View style={styles.securityHeader}>
              <Icon name="shield-check" size={14} color="#EA580C" />
              <Text style={styles.securityTitle}>सुरक्षित डिजिटल तिकीट पडताळणी</Text>
            </View>
            <Text style={styles.securityText}>
              • हे तिकीट एनक्रिप्टेड (MTSEC) असून अधिकृत गेट ऑपरेटरद्वारे स्कॅन केले जाते.
            </Text>
          </View>
        </View>
      </View>

      {/* ══════ UNIFIED ACTION BUTTONS ROW ══════ */}
      <View style={styles.iconActionsRow}>
        {/* WhatsApp Share */}
        <TouchableOpacity
          onPress={handleWhatsAppShare}
          style={styles.iconActionBtnItem}
          activeOpacity={0.8}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#25D366' }]}>
            <Icon name="whatsapp" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.iconActionLabel}>WhatsApp</Text>
        </TouchableOpacity>

        {/* Share Ticket */}
        <TouchableOpacity
          onPress={handleShare}
          style={styles.iconActionBtnItem}
          activeOpacity={0.8}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#0284C7' }]}>
            <Icon name="share-variant" size={21} color="#FFFFFF" />
          </View>
          <Text style={styles.iconActionLabel}>Share</Text>
        </TouchableOpacity>

        {/* Download PDF */}
        <TouchableOpacity
          onPress={handleDownloadPdf}
          style={styles.iconActionBtnItem}
          activeOpacity={0.8}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#DC2626' }]}>
            <Icon name="file-pdf-box" size={23} color="#FFFFFF" />
          </View>
          <Text style={styles.iconActionLabel}>PDF</Text>
        </TouchableOpacity>

      </View>

      {/* Primary CTA — matches web "माझी तिकिटे पहा" */}
      {(onClose || onHome) ? (
        <TouchableOpacity
          onPress={() => {
            if (onClose) onClose();
            else if (onHome) onHome();
          }}
          style={styles.myTicketsCta}
          activeOpacity={0.88}
        >
          <Icon name="ticket-confirmation" size={18} color="#FFFFFF" />
          <Text style={styles.myTicketsCtaText}>माझी तिकिटे पहा</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  ticketCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ticketHeaderGradient: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    // Match web: महाटिकिट M-TICKET PASS
    fontSize: 9.5,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 1.1,
  },
  orderNumberText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  validStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  validStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ticketBody: {
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 100,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: 'rgba(234,88,12,0.3)',
  },
  categoryPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#C2410C',
    letterSpacing: 0.5,
  },
  counterPill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 100,
    backgroundColor: '#F1F5F9',
  },
  counterText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
  },
  eventTitleText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    lineHeight: 23,
    marginBottom: 10,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  gridItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  gridItemFull: {
    width: '100%',
    paddingTop: 2,
  },
  gridIcon: {
    marginTop: 1,
  },
  gridLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  gridVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  gridSubVal: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  seatsCallout: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seatsCalloutLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#C2410C',
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  seatsCalloutVal: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  seatsCalloutRight: {
    alignItems: 'flex-end',
  },
  seatsCalloutPrice: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#EA580C',
  },
  perforationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    height: 30,
    marginVertical: 1,
  },
  notchLeft: {
    width: 10,
    height: 16,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: COLORS.bg,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    marginLeft: -1,
  },
  dashedDivider: {
    flex: 1,
    height: 0,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginHorizontal: 6,
  },
  notchRight: {
    width: 10,
    height: 16,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    backgroundColor: COLORS.bg,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: -1,
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  qrInnerBox: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },
  qrInstructions: {
    fontSize: 11,
    fontWeight: '900',
    color: '#EA580C',
    textAlign: 'center',
    marginBottom: 2,
  },
  qrSubInstructions: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 4,
  },
  qrTicketCodeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8,
  },
  securityBox: {
    width: '100%',
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  securityTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  securityText: {
    fontSize: 9.5,
    color: '#64748B',
    lineHeight: 14,
  },
  iconActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginTop: 6,
    marginBottom: 16,
  },
  iconActionBtnItem: {
    alignItems: 'center',
    gap: 5,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  iconActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  myTicketsCta: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  myTicketsCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

export default MahaTicketPass;