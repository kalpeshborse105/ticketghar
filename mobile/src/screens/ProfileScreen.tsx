/**
 * ProfileScreen — MahaTicket Android (महाटिकिट)
 * Role-based user hub: USER / ORGANIZER / ADMIN with proper navigation links
 * English-first chrome with bilingual labels
 */
import React, { useState } from 'react';
import {
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../theme';
import { useAuthStore, useUIStore } from '../store';
import { Button, Divider, MTPopupModal } from '../components';
import { WEB_ADMIN_URL, openUrl, openPlayStoreListing } from '../lib/contact';
import { getGoogleAuthUrl } from '../lib/openGoogleAuth';
import { GoogleAuthWebView } from '../components/GoogleAuthWebView';

interface MenuItemProps {
  iconName: string;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}

function MenuItem({ iconName, label, onPress, right, danger }: MenuItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.75}
      style={styles.menuItem}
    >
      <View style={[styles.menuIconBox, danger && { backgroundColor: COLORS.dangerBg }]}>
        <Icon name={iconName} size={20} color={danger ? COLORS.danger : COLORS.primary} />
      </View>
      <Text style={[styles.menuLabel, danger && { color: COLORS.danger, fontWeight: '700' }]}>{label}</Text>
      {right !== undefined ? right : <Icon name="chevron-right" size={18} color={COLORS.textDim} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const { language, setLanguage } = useUIStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [googleAuthUrl, setGoogleAuthUrl] = useState('');
  const [googleAuthVisible, setGoogleAuthVisible] = useState(false);

  const userRole = (user?.role || 'customer').toLowerCase();
  const isOrganizer = userRole === 'organizer';
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isScannerStaff =
    userRole === 'scanner' ||
    userRole === 'manager' ||
    userRole === 'operations';
  const isOrganizerOrAdmin = isOrganizer || isAdmin || isScannerStaff;

  React.useEffect(() => {
    if (isAuthenticated) {
      useAuthStore.getState().syncUserProfile().catch(() => null);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (showLogoutModal) {
          setShowLogoutModal(false);
          return true;
        }
        navigation.navigate('Home');
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [showLogoutModal, navigation])
  );

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'mr' : 'en');
  };

  const openLink = (url: string) => {
    openUrl(url);
  };

  const handleGoogleLogin = async () => {
    try {
      const url = await getGoogleAuthUrl();
      setGoogleAuthUrl(url);
      setGoogleAuthVisible(true);
    } catch {
      navigation.navigate('Login');
    }
  };

  const handleEditProfile = () => navigation.navigate('EditProfile');

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header - English First */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Account</Text>
          <Text style={styles.headerSub}>माझे खाते • Profile & Settings</Text>
        </View>

        {/* Avatar & User info */}
        {isAuthenticated && user ? (
          <View style={styles.userCard}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                {user.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} resizeMode="cover" />
                ) : (
                  <Text style={styles.avatarText}>
                    {(user.name || user.email || 'U')[0].toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.avatarVerifiedBadge}>
                <Icon name="check-decagram" size={18} color="#16A34A" />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.userName}>{user.name || 'User'}</Text>
                <Icon name="check-decagram" size={15} color="#16A34A" />
              </View>
              {user.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
              {user.email && <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>}
              <View style={styles.memberStatusChip}>
                <Icon name="shield-check" size={11} color="#16A34A" />
                <Text style={styles.memberStatusText}>
                  {language === 'mr' ? 'प्रमाणित रसिक सदस्य' : 'Verified Rasik Member'}
                </Text>
              </View>
              {isOrganizerOrAdmin && (
                <View style={styles.roleBadge}>
                  <Icon 
                    name={isAdmin ? 'shield-star' : 'briefcase'} 
                    size={10} 
                    color={COLORS.primary} 
                  />
                  <Text style={styles.roleBadgeText}>
                    {isAdmin
                      ? 'ADMIN'
                      : userRole === 'scanner'
                        ? 'SCANNER'
                        : isOrganizer
                          ? 'ORGANIZER'
                          : 'STAFF'}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={handleEditProfile}
              style={styles.editBtn}
            >
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.authCard}>
            <View style={styles.authIconRing}>
              <Icon name="ticket-confirmation-outline" size={36} color={COLORS.primary} />
            </View>
            <Text style={styles.authTitle}>आपल्या खात्यामध्ये लॉगिन करा</Text>
            <Text style={styles.authSub}>आपले आरक्षित तिकीट, पासेस आणि बुकिंग तपशील सुरक्षितपणे पाहण्यासाठी साइन इन करा.</Text>
            
            <Button
              title="ईमेल द्वारे लॉगिन करा (Sign In with Email)"
              onPress={() => navigation.navigate('Login')}
              fullWidth
              style={{ marginTop: 18 }}
              icon={<Icon name="login" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />}
            />

            <TouchableOpacity
              onPress={handleGoogleLogin}
              style={styles.googleAuthBtn}
              activeOpacity={0.85}
            >
              <Icon name="google" size={18} color="#EA4335" style={{ marginRight: 8 }} />
              <Text style={styles.googleAuthBtnText}>Google ने साइन इन करा (Google Sign In)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* My Tickets - Only for authenticated users */}
        {isAuthenticated && (
          <View style={styles.section}>
            <View style={styles.menuCard}>
              <MenuItem
                iconName="ticket-confirmation"
                label="My Tickets (माझी तिकिटे)"
                onPress={() => navigation.navigate('Main', { screen: 'Tickets' })}
              />
            </View>
          </View>
        )}

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.menuCard}>
            <MenuItem
              iconName="translate"
              label="Language / भाषा"
              right={
                <View style={styles.langToggle}>
                  <TouchableOpacity
                    onPress={toggleLanguage}
                    style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
                  >
                    <Text style={[styles.langBtnText, language === 'en' && { color: COLORS.white }]}>EN</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={toggleLanguage}
                    style={[styles.langBtn, language === 'mr' && styles.langBtnActive]}
                  >
                    <Text style={[styles.langBtnText, language === 'mr' && { color: COLORS.white }]}>मराठी</Text>
                  </TouchableOpacity>
                </View>
              }
            />
            <Divider style={{ marginVertical: 0 }} />
            <MenuItem
              iconName="bell-outline"
              label="Notifications"
              right={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: COLORS.border, true: COLORS.primary + '88' }}
                  thumbColor={notificationsEnabled ? COLORS.primary : COLORS.textDim}
                />
              }
            />
          </View>
        </View>

        {/* ORGANIZER Tools Section */}
        {isOrganizer && !isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organizer Tools</Text>
            <View style={styles.menuCard}>
              <MenuItem
                iconName="qrcode-scan"
                label="Gate Ticket Scanner (तिकीट स्कॅनर)"
                onPress={() => navigation.navigate('TicketScanner')}
              />
              <Divider style={{ marginVertical: 0 }} />
              <MenuItem
                iconName="view-dashboard-outline"
                label="My Events Dashboard"
                onPress={() => openLink(WEB_ADMIN_URL)}
              />
              <Divider style={{ marginVertical: 0 }} />
              <MenuItem
                iconName="calendar-plus"
                label="Post New Event"
                onPress={() => openLink(WEB_ADMIN_URL)}
              />
              <Divider style={{ marginVertical: 0 }} />
              <MenuItem
                iconName="phone"
                label="Organizer Support"
                onPress={() => navigation.navigate('HelpSupport')}
              />
            </View>
          </View>
        )}

        {/* ADMIN Tools Section */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Tools</Text>
            <View style={styles.menuCard}>
              <MenuItem
                iconName="qrcode-scan"
                label="Gate Ticket Scanner (तिकीट स्कॅनर)"
                onPress={() => navigation.navigate('TicketScanner')}
              />
              <Divider style={{ marginVertical: 0 }} />
              <MenuItem
                iconName="shield-crown"
                label="Admin Portal"
                onPress={() => openLink(WEB_ADMIN_URL)}
              />
              <Divider style={{ marginVertical: 0 }} />
              <MenuItem
                iconName="account-supervisor"
                label="User Management"
                onPress={() => openLink(WEB_ADMIN_URL)}
              />
              <Divider style={{ marginVertical: 0 }} />
              <MenuItem
                iconName="chart-box"
                label="Analytics & Reports"
                onPress={() => openLink(WEB_ADMIN_URL)}
              />
            </View>
          </View>
        )}

        {/* Support & Policies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          <View style={styles.menuCard}>
            <MenuItem
              iconName="face-agent"
              label="Help & Support"
              onPress={() => navigation.navigate('HelpSupport')}
            />
            <Divider style={{ marginVertical: 0 }} />
            <MenuItem
              iconName="file-document-outline"
              label="Terms of Service"
              onPress={() => navigation.navigate('PolicyViewer', { type: 'terms' })}
            />
            <Divider style={{ marginVertical: 0 }} />
            <MenuItem
              iconName="shield-lock-outline"
              label="Privacy Policy"
              onPress={() => navigation.navigate('PolicyViewer', { type: 'privacy' })}
            />
            <Divider style={{ marginVertical: 0 }} />
            <MenuItem
              iconName="keyboard-return"
              label="Cancellation & Refund"
              onPress={() => navigation.navigate('PolicyViewer', { type: 'refund' })}
            />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.menuCard}>
            <MenuItem
              iconName="cellphone-information"
              label="App Version"
              right={<Text style={styles.versionText}>1.0.0</Text>}
            />
            <Divider style={{ marginVertical: 0 }} />
            <MenuItem
              iconName="star-outline"
              label="Rate the App"
              onPress={() => openPlayStoreListing()}
            />
          </View>
        </View>

        {/* Partner CTA - Only for non-organizers/admins */}
        {!isOrganizerOrAdmin && (
          <View style={styles.partnerCard}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="handshake-outline" size={18} color={COLORS.primary} />
                <Text style={styles.partnerTitle}>Organizing a show?</Text>
              </View>
              <Text style={styles.partnerSub}>List your play, concert or event on MahaTicket</Text>
            </View>
            <Button
              title="Post an Event"
              onPress={() => navigation.navigate('PostEvent')}
              size="sm"
            />
          </View>
        )}

        {/* Logout */}
        {isAuthenticated && (
          <View style={styles.section}>
            <View style={styles.menuCard}>
              <MenuItem iconName="logout" label="Sign Out" onPress={handleLogout} danger />
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>MAHATICKET • महाटिकिट</Text>
          <Text style={styles.footerSub}>Maharashtra's Premier Ticketing Platform</Text>
        </View>
      </ScrollView>

      <MTPopupModal
        visible={showLogoutModal}
        type="warning"
        title="बाहेर पडायचे आहे का? (Sign Out)"
        message="तुम्हाला तुमच्या खात्यातून बाहेर पडायचे आहे का? (Are you sure you want to sign out from MahaTicket?)"
        primaryButtonText="होय, बाहेर पडा (Sign Out)"
        onPrimaryPress={async () => {
          setShowLogoutModal(false);
          await clearAuth();
          navigation.replace('Login');
        }}
        secondaryButtonText="नाही (Cancel)"
        onSecondaryPress={() => setShowLogoutModal(false)}
        onRequestClose={() => setShowLogoutModal(false)}
      />
      <GoogleAuthWebView
        visible={googleAuthVisible}
        authUrl={googleAuthUrl}
        onClose={() => setGoogleAuthVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  headerTitle: { color: COLORS.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  headerSub: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginHorizontal: SPACING.base,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 60, height: 60, borderRadius: 30 },
  avatarText: { color: COLORS.white, fontSize: 24, fontWeight: '900' },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  avatarVerifiedBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 1,
  },
  userName: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  userPhone: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  userEmail: { color: COLORS.textDim, fontSize: 12, marginTop: 1 },
  memberStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  memberStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803D',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  roleBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  editBtn: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 13 },

  authCard: {
    marginHorizontal: SPACING.base,
    marginVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  googleAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    paddingHorizontal: 16,
    width: '100%',
    marginTop: 10,
    ...SHADOWS.sm,
  },
  googleAuthBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  authIconRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary + '20',
    borderWidth: 2,
    borderColor: COLORS.primary + '50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  authTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  authSub: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 18 },

  section: { marginHorizontal: SPACING.base, marginBottom: SPACING.md },
  sectionTitle: { 
    color: COLORS.textMuted, 
    fontSize: 12, 
    fontWeight: '800', 
    marginBottom: 8, 
    textTransform: 'uppercase', 
    letterSpacing: 0.8 
  },
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '600' },
  versionText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },

  langToggle: { flexDirection: 'row', gap: 4 },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  langBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12 },

  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.base,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.primary + '15',
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  partnerTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  partnerSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },

  footer: { alignItems: 'center', paddingTop: SPACING.md, paddingBottom: SPACING.base, gap: 4 },
  footerText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '700' },
  footerSub: { color: COLORS.textDim, fontSize: 11 },
});
