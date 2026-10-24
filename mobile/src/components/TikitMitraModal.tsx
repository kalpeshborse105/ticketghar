/**
 * TikitMitraModal — Native Conversational AI Booking Assistant for MahaTicket (महाटिकिट)
 * Complete parity with Web TikitMitraFloatingBot:
 * - Real conversational show discovery & booking
 * - Interactive showtime & seat selection chips inside chat bubbles
 * - Automatic real PostgreSQL seat reservation via /api/bookings/hold
 * - 1-tap "💳 आता पैसे भरा (Pay Now)" button that transitions straight to native Razorpay checkout
 * - Support for Marathi & English
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../theme';
import { api } from '../api';

const { width, height } = Dimensions.get('window');

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  action?: {
    type: string;
    label: string;
    payload?: Record<string, any>;
  };
  options?: Array<{
    label: string;
    value: string;
    type?: string;
    payload?: Record<string, any>;
  }>;
}

interface TikitMitraModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
  language?: 'mr' | 'en';
}

const QUICK_SUGGESTIONS = [
  { label: '🎭 आजचे लोकप्रिय नाटक', text: 'आजचे लोकप्रिय नाटक कोणते आहे?' },
  { label: '🎟️ सर्वोत्तम २ जागा बुक करा', text: 'मला लोकप्रिय नाटकासाठी २ सर्वोत्तम जागा बुक करायच्या आहेत' },
  { label: '🎫 माझी तिकिटे दाखवा', text: 'माझी तिकिटे दाखवा' },
  { label: '💰 चालू ऑफर्स काय आहेत?', text: 'सध्या कोणत्या ऑफर्स किंवा कूपन्स उपलब्ध आहेत?' },
];

export function TikitMitraModal({
  visible,
  onClose,
  navigation,
  language = 'mr',
}: TikitMitraModalProps) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Initial welcome message
  useEffect(() => {
    if (visible && messages.length === 0) {
      setMessages([
        {
          id: 'welcome-1',
          sender: 'bot',
          text:
            language === 'mr'
              ? 'नमस्कार! 🙏 मी **तिकीटमित्र AI** — महाटिकिटचा अधिकृत बुकिंग सहाय्यक.\n\nमी आपल्यासाठी नाटक शोधणे, वेळेची निवड करणे, थेट सर्वोत्तम आसने आरक्षित करणे व एका टॅपवर पेमेंटची तयारी करणे हे सर्व करू शकतो!\n\nमी आज आपल्यासाठी काय करू शकतो?'
              : 'Hello! 🙏 I am **TikitMitra AI** — MahaTicket’s official booking assistant.\n\nI can help you explore plays, pick showtimes, automatically reserve the best seats, and set up your 1-tap checkout!\n\nHow can I help you today?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          options: [
            {
              label: '🎭 नाटके पहा व बुक करा',
              value: 'लोकप्रिय नाटके दाखवा',
              type: 'chat',
            },
            {
              label: '🎯 २ सर्वोत्तम जागा बुक करा',
              value: 'मला २ सर्वोत्तम जागा बुक करायच्या आहेत',
              type: 'chat',
            },
            {
              label: '🎟️ माझी तिकिटे पहा',
              value: 'माझी तिकिटे दाखवा',
              type: 'my_tickets',
            },
          ],
        },
      ]);
    }
  }, [visible, language]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  const handleSendMessage = async (customText?: string, actionPayload?: Record<string, any>) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend && !actionPayload) return;

    if (!customText) {
      setInputText('');
    }

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      sender: 'user',
      text: textToSend || (actionPayload?.eventTitle ? `निवड: ${actionPayload.eventTitle}` : 'निवड केली'),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    scrollToBottom();

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        sender: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
        text: m.text,
      }));

      const res = await api.askTikitMitra({
        message: textToSend,
        history: historyPayload,
        language,
        actionPayload,
      });

      if (res && res.success) {
        const botMsg: ChatMessage = {
          id: `msg-${Date.now()}-b`,
          sender: 'bot',
          text: res.reply || 'माहिती उपलब्ध आहे.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: res.action,
          options: res.options,
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-err`,
            sender: 'bot',
            text:
              language === 'mr'
                ? 'माहिती मिळवताना तांत्रिक अडचण आली. कृपया पुन्हा प्रयत्न करा.'
                : 'Unable to reach assistant. Please try again.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          sender: 'bot',
          text:
            language === 'mr'
              ? 'नेटवर्क विलंबाने विनंती पूर्ण झाली नाही. कृपया पुन्हा प्रयत्न करा.'
              : 'Network error. Please check connection.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleOptionPress = (option: {
    label: string;
    value: string;
    type?: string;
    payload?: Record<string, any>;
  }) => {
    // 1. One-tap Checkout Pay: User only confirms payment manually, AI pre-populates everything!
    if (option.type === 'checkout_pay' && option.payload) {
      onClose();
      navigation.navigate('Checkout', {
        eventId: option.payload.eventId,
        sessionId: option.payload.sessionId,
        seatIds: option.payload.seatIds,
        seatCodes: option.payload.seatCodes,
        holdToken: option.payload.holdToken,
        expiresAt: option.payload.holdExpiresAt || option.payload.expiresAt,
        faceValue: option.payload.faceValue,
        grandTotal: option.payload.grandTotal,
        platformFeeTotal: option.payload.platformFeeTotal,
        taxTotal: option.payload.taxTotal,
        pricing: option.payload.pricing,
        eventTitle: option.payload.eventTitle,
        venueName: option.payload.venueName,
        sessionStartTime: option.payload.sessionStartTime,
        sessionMeta: option.payload.sessionMeta,
        posterUrl: option.payload.posterUrl,
      });
      return;
    }

    // 2. Open interactive seat map
    if (option.type === 'open_seatmap' && option.payload) {
      onClose();
      navigation.navigate('Seats', {
        sessionId: option.payload.sessionId,
        eventId: option.payload.eventId,
      });
      return;
    }

    // 3. My tickets navigation
    if (option.type === 'my_tickets') {
      onClose();
      navigation.navigate('Main', { screen: 'Tickets' });
      return;
    }

    // 4. Explore categories
    if (option.type === 'explore_category') {
      onClose();
      navigation.navigate('Explore');
      return;
    }

    // 5. Conversational steps (e.g. select_event, select_session, select_seats)
    handleSendMessage(option.value, option.payload);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.botAvatar}>
              <Icon name="robot-happy-outline" size={24} color="#FFFFFF" />
            </View>
            <View>
              <View style={styles.titleRow}>
                <Text style={styles.headerTitle}>तिकीटमित्र AI</Text>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>सक्रिय</Text>
                </View>
              </View>
              <Text style={styles.headerSub}>महाटिकिट अधिकृत सहाय्यक (Kalpkrut)</Text>
            </View>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Icon name="close" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Quick Suggestion Strip */}
        <View style={styles.suggestionStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionScroll}>
            {QUICK_SUGGESTIONS.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestionPill}
                onPress={() => handleSendMessage(item.text)}
                activeOpacity={0.75}
              >
                <Text style={styles.suggestionText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Messages List */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <View
                key={msg.id}
                style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowBot]}
              >
                {!isUser && (
                  <View style={styles.botIconSmall}>
                    <Icon name="theater" size={16} color="#FFFFFF" />
                  </View>
                )}

                <View style={{ maxWidth: '85%' }}>
                  <View
                    style={[
                      styles.bubble,
                      isUser ? styles.bubbleUser : styles.bubbleBot,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        isUser ? styles.bubbleTextUser : styles.bubbleTextBot,
                      ]}
                    >
                      {msg.text}
                    </Text>

                    <Text
                      style={[
                        styles.timeText,
                        isUser ? styles.timeTextUser : styles.timeTextBot,
                      ]}
                    >
                      {msg.timestamp}
                    </Text>
                  </View>

                  {/* Options Chips inside Bot Message */}
                  {!isUser && msg.options && msg.options.length > 0 && (
                    <View style={styles.optionsWrap}>
                      {msg.options.map((opt, optIdx) => {
                        const isPayNow = opt.type === 'checkout_pay';
                        return (
                          <TouchableOpacity
                            key={optIdx}
                            onPress={() => handleOptionPress(opt)}
                            activeOpacity={0.82}
                            style={[
                              styles.optionBtn,
                              isPayNow ? styles.payNowOptionBtn : styles.regularOptionBtn,
                            ]}
                          >
                            <Icon
                              name={
                                isPayNow
                                  ? 'credit-card-fast-outline'
                                  : opt.type === 'open_seatmap'
                                  ? 'map-outline'
                                  : opt.type === 'my_tickets'
                                  ? 'ticket-confirmation-outline'
                                  : 'checkbox-blank-circle-outline'
                              }
                              size={16}
                              color={isPayNow ? '#FFFFFF' : COLORS.primary}
                            />
                            <Text
                              style={[
                                styles.optionBtnText,
                                isPayNow ? styles.payNowOptionText : styles.regularOptionText,
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {loading && (
            <View style={[styles.msgRow, styles.msgRowBot]}>
              <View style={styles.botIconSmall}>
                <Icon name="theater" size={16} color="#FFFFFF" />
              </View>
              <View style={[styles.bubble, styles.bubbleBot, styles.loadingBubble]}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>तिकीटमित्र विचार करत आहे...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              language === 'mr'
                ? 'नाटकाचे नाव किंवा संदेश येथे टाईप करा...'
                : 'Type play name or message here...'
            }
            placeholderTextColor={COLORS.textDim}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={() => handleSendMessage()}
          />

          <TouchableOpacity
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || loading}
            style={[
              styles.sendBtn,
              (!inputText.trim() || loading) && styles.sendBtnDisabled,
            ]}
            activeOpacity={0.8}
          >
            <Icon name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  headerSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionStrip: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingVertical: 8,
  },
  suggestionScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#334155',
  },
  suggestionText: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 16,
  },
  msgRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  msgRowBot: {
    justifyContent: 'flex-start',
  },
  botIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bubbleText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  bubbleTextBot: {
    color: '#F1F5F9',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeTextUser: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timeTextBot: {
    color: '#64748B',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  optionsWrap: {
    marginTop: 8,
    gap: 6,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  regularOptionBtn: {
    backgroundColor: '#131D31',
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.4)',
  },
  payNowOptionBtn: {
    backgroundColor: '#EA580C',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  optionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  regularOptionText: {
    color: '#F8FAFC',
  },
  payNowOptionText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#1E293B',
    borderRadius: 22,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 13.5,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
});
