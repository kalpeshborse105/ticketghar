import React from 'react';
import {
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
import Toast from 'react-native-toast-message';

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
  style?: ViewStyle;
}

export function MahaTicketPass({
  ticketCode,
  seatCode,
  eventTitle,
  eventCategory = 'नाटक / Theatre',
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
  style,
}: MahaTicketPassProps) {
  const normalizedStatus = (status || 'confirmed').toLowerCase();
  const isUsed = normalizedStatus === 'used';
  const isCancelled = normalizedStatus === 'cancelled';

  const statusConfig = isUsed
    ? {
      label: 'प्रवेश पूर्ण • USED',
      icon: 'check-all',
      badgeBg: 'rgba(15, 23, 42, 0.35)',
      dotColor: '#FDE047',
    }
    : isCancelled
      ? {
        label: 'रद्द • CANCELLED',
        icon: 'close-octagon',
        badgeBg: 'rgba(127, 29, 29, 0.5)',
        dotColor: '#FCA5A5',
      }
      : {
        label: 'वैध • VALID M-TICKET',
        icon: 'shield-check',
        badgeBg: 'rgba(0, 0, 0, 0.24)',
        dotColor: '#6EE7B7',
      };

  const handleSharePass = async () => {
    try {
      await Share.share({
        title: `${eventTitle} — M-Ticket`,
        message: `🎟️ महाटिकिट M-Ticket\nनाटक: ${eventTitle}\nस्थळ: ${venueName}\nतारीख: ${showDateStr || 'Upcoming'
          } • ${showTimeStr || ''}\nआसन (Seat): ${seatCode || 'General'
          }\nTicket Code: ${ticketCode}\nhttps://mahaticket.kalpkrutinfotech.com/tickets/${encodeURIComponent(
            ticketCode
          )}`,
      });
    } catch { }
  };

  const handleShowCodeToast = () => {
    Toast.show({
      type: 'success',
      text1: `Ticket Code: ${ticketCode}`,
      text2: `Seat ${seatCode || 'General'} • प्रवेशद्वारावर हा कोड दाखवा`,
    });
  };

  return (
    <View style={[styles.card, style]}>
      <LinearGradient
        colors={
          isCancelled
            ? ['#64748B', '#475569']
            : ['#EA580C', '#F97316', '#C2410C']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.banner}
      >
        <View style={styles.bannerLeft}>
          <View style={styles.bannerIcon}>
            <Icon name="ticket-confirmation" size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.bannerEyebrow}>महाटिकिट • OFFICIAL E-PASS</Text>
            <Text style={styles.bannerOrder}>
              {orderNumber ? `ORDER #${orderNumber}` : ticketCode}
            </Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusConfig.badgeBg }]}>
          <Icon name={statusConfig.icon} size={13} color={statusConfig.dotColor} />
          <Text style={styles.statusText}>{statusConfig.label}</Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.topTagRow}>
          <View style={styles.categoryPill}>
            <Icon name="drama-masks" size={12} color="#C2410C" />
            <Text style={styles.categoryText}>{eventCategory}</Text>
          </View>

          {totalTickets && totalTickets > 1 ? (
            <View style={styles.passCounterPill}>
              <Text style={styles.passCounterText}>
                Pass {ticketIndex || 1} of {totalTickets}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.title}>{eventTitle}</Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaCell}>
            <View style={styles.metaIconBox}>
              <Icon name="calendar-month" size={16} color="#EA580C" />
            </View>
            <View style={styles.metaTextWrap}>
              <Text style={styles.metaLabel}>तारीख / DATE</Text>
              <Text style={styles.metaValue}>{showDateStr || 'Upcoming'}</Text>
            </View>
          </View>

          <View style={styles.metaCell}>
            <View style={styles.metaIconBox}>
              <Icon name="clock-time-four-outline" size={16} color="#EA580C" />
            </View>
            <View style={styles.metaTextWrap}>
              <Text style={styles.metaLabel}>वेळ / SHOWTIME</Text>
              <Text style={styles.metaValue}>{showTimeStr || '7:00 PM'}</Text>
            </View>
          </View>

          <View style={[styles.metaCell, styles.metaFull]}>
            <View style={styles.metaIconBox}>
              <Icon name="theater" size={16} color="#EA580C" />
            </View>
            <View style={styles.metaTextWrap}>
              <Text style={styles.metaLabel}>नाट्यगृह / AUDITORIUM VENUE</Text>
              <Text style={styles.metaValue} numberOfLines={2}>
                {venueName}
              </Text>
              {!!venueCity && <Text style={styles.metaCity}>{venueCity}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.seatCallout}>
          <View style={styles.seatPrimaryCol}>
            <Text style={styles.seatLabel}>आरक्षित आसन / SEAT NO</Text>
            <View style={styles.seatBadgeRow}>
              <Icon name="seat-recline-extra" size={18} color="#EA580C" />
              <Text style={styles.seatValue}>{seatCode || 'General'}</Text>
            </View>
          </View>

          <View style={styles.seatVerticalDivider} />

          <View style={styles.seatRight}>
            <Text style={styles.seatRightLabel}>प्रवेश प्रकार / ADMISSION</Text>
            <Text style={styles.seatRightValue}>M-Ticket QR</Text>
          </View>

          {!!grandTotal && grandTotal > 0 && (
            <>
              <View style={styles.seatVerticalDivider} />
              <View style={styles.seatRight}>
                <Text style={styles.seatRightLabel}>एकूण रक्कम / PAID</Text>
                <Text style={styles.amountValue}>
                  ₹{Math.round(grandTotal / 100)}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.perforation}>
        <View style={[styles.notch, styles.notchLeft]} />
        <View style={styles.dashLine} />
        <View style={[styles.notch, styles.notchRight]} />
      </View>

      <View style={styles.qrZone}>
        <View style={styles.qrOuterFrame}>
          <View style={[styles.qrCorner, styles.qrCornerTL]} />
          <View style={[styles.qrCorner, styles.qrCornerTR]} />
          <View style={[styles.qrCorner, styles.qrCornerBL]} />
          <View style={[styles.qrCorner, styles.qrCornerBR]} />

          <View style={[(isUsed || isCancelled) && { opacity: 0.22 }]}>
            <QRCode
              value={qrPayload || ticketCode}
              size={164}
              backgroundColor="#FFFFFF"
              color="#0F172A"
            />
          </View>

          {(isUsed || isCancelled) && (
            <View
              style={[
                styles.stampOverlayBadge,
                isCancelled ? styles.stampCancelled : styles.stampUsed,
              ]}
            >
              <Icon
                name={isCancelled ? 'close-octagon' : 'check-decagram'}
                size={18}
                color={isCancelled ? '#DC2626' : '#15803D'}
              />
              <Text
                style={[
                  styles.stampOverlayText,
                  { color: isCancelled ? '#DC2626' : '#15803D' },
                ]}
              >
                {isCancelled ? 'CANCELLED' : 'SCANNED & ADMITTED'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.qrTitle}>
          प्रवेशद्वारावर हा QR कोड दाखवा (Scan at Gate)
        </Text>
        <Text style={styles.qrHint}>
          जलद स्कॅनसाठी स्क्रीन ब्राईटनेस १००% ठेवा • Keep screen brightness high
        </Text>

        <View style={styles.codeActionRow}>
          <TouchableOpacity
            onPress={handleShowCodeToast}
            activeOpacity={0.8}
            style={styles.codePillBtn}
          >
            <Icon name="barcode" size={15} color="#EA580C" />
            <Text style={styles.codePillText}>{ticketCode}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSharePass}
            activeOpacity={0.8}
            style={styles.sharePassBtn}
          >
            <Icon name="share-variant-outline" size={15} color="#0F172A" />
            <Text style={styles.sharePassBtnText}>Share</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.securityBox}>
          <View style={styles.securityRow}>
            <Icon name="shield-lock-outline" size={14} color="#EA580C" />
            <Text style={styles.securityTitle}>
              सुरक्षित डिजिटल तिकीट पडताळणी (MTSEC Verified)
            </Text>
          </View>
          <Text style={styles.securityText}>
            • हे तिकीट एनक्रिप्टेड असून केवळ अधिकृत आयोजक स्कॅनरद्वारेच सत्यापित केले जाते.
          </Text>
          <Text style={styles.securityText}>
            • नाट्यप्रयोग सुरू होण्यापूर्वी किमान २० मिनिटे आधी नाट्यगृहात उपस्थित राहावे.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
  },
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerEyebrow: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 1,
    color: 'rgba(255, 255, 255, 0.92)',
    textTransform: 'uppercase',
  },
  bannerOrder: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  body: {
    padding: 18,
    gap: 12,
  },
  topTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#C2410C',
    textTransform: 'uppercase',
  },
  passCounterPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  passCounterText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 25,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metaCell: {
    width: '47%',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  metaFull: {
    width: '100%',
    paddingTop: 4,
  },
  metaIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaTextWrap: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  metaValue: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 1,
  },
  metaCity: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '600',
  },
  seatCallout: {
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  seatPrimaryCol: {
    flex: 1.2,
  },
  seatLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#9A3412',
    letterSpacing: 0.4,
  },
  seatBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  seatValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    fontFamily: 'monospace',
  },
  seatVerticalDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#FED7AA',
    marginHorizontal: 10,
  },
  seatRight: {
    alignItems: 'flex-end',
  },
  seatRightLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
  },
  seatRightValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#EA580C',
    marginTop: 2,
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 1,
  },
  perforation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  notch: {
    width: 16,
    height: 28,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  notchLeft: {
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginLeft: -1,
  },
  notchRight: {
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginRight: -1,
  },
  dashLine: {
    flex: 1,
    height: 0,
    marginHorizontal: 8,
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
  },
  qrZone: {
    padding: 18,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  qrOuterFrame: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCorner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: '#EA580C',
  },
  qrCornerTL: {
    top: 6,
    left: 6,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 5,
  },
  qrCornerTR: {
    top: 6,
    right: 6,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 5,
  },
  qrCornerBL: {
    bottom: 6,
    left: 6,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 5,
  },
  qrCornerBR: {
    bottom: 6,
    right: 6,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 5,
  },
  stampOverlayBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    transform: [{ rotate: '-10deg' }],
  },
  stampUsed: {
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
  },
  stampCancelled: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  stampOverlayText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  qrTitle: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#EA580C',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  qrHint: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 3,
    fontWeight: '600',
  },
  codeActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  codePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  codePillText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#9A3412',
    fontFamily: 'monospace',
  },
  sharePassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  sharePassBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  securityBox: {
    width: '100%',
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  securityTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  securityText: {
    fontSize: 10.5,
    color: '#64748B',
    lineHeight: 15,
    fontWeight: '500',
  },
});

export default MahaTicketPass;