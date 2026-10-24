import { db } from '@/src/db/index.ts';
import { events, eventSessions, venues, ticketTypes, seatInventory, seats } from '@/src/db/schema.ts';
import { eq, and, sql, inArray, isNull, gte, or, asc } from 'drizzle-orm';
import { createTemporarySeatHold, calculatePricing } from '@/src/lib/inventory-engine.ts';

export interface ChatOption {
  label: string;
  value: string;
  type?: 'chat' | 'select_event' | 'select_session' | 'select_seats' | 'checkout_pay' | 'my_tickets' | 'open_seatmap' | 'explore_category';
  payload?: Record<string, any>;
}

export interface ChatAction {
  type: 'open_event' | 'select_seats' | 'my_tickets' | 'explore_category' | 'contact_support' | 'checkout_pay' | 'open_seatmap';
  label: string;
  payload?: Record<string, any>;
}

export interface TikitMitraResponse {
  reply: string;
  action?: ChatAction;
  options?: ChatOption[];
  source: 'gemini' | 'openai' | 'grounded_local_db';
}

function formatSessionTimeStr(startTime?: string | Date | null): string {
  if (!startTime) return 'वेळ उपलब्ध नाही';
  const d = new Date(startTime);
  if (isNaN(d.getTime())) return String(startTime);
  try {
    return d.toLocaleString('mr-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return d.toLocaleDateString();
  }
}

/**
 * TikitMitra AI Assistant Service
 * Official AI booking assistant for MahaTicket (Product of Kalpkrut Infotech)
 * Full conversational discovery, session selection, auto seat-picking, real hold & one-tap payment
 */
export async function askTikitMitra(params: {
  message: string;
  history?: { sender: 'user' | 'agent' | 'model'; text: string }[];
  language?: 'mr' | 'en';
  actionPayload?: Record<string, any>;
}): Promise<TikitMitraResponse> {
  const { message, history = [], language = 'mr', actionPayload } = params;
  const cleanMsg = (message || '').trim();

  // Guard against prompt injection or credential solicitation
  const lowerMsg = cleanMsg.toLowerCase();
  if (
    lowerMsg.includes('otp') ||
    lowerMsg.includes('card number') ||
    lowerMsg.includes('cvv') ||
    lowerMsg.includes('upi pin') ||
    lowerMsg.includes('password') ||
    lowerMsg.includes('पासवर्ड')
  ) {
    return {
      reply: language === 'mr'
        ? '⚠️ सुरक्षेच्या कारणास्तव, टिकिटमित्र कधीही आपला पासवर्ड, OTP किंवा UPI PIN मागत नाही. कृपया ही गोपनीय माहिती कोणाशीही शेअर करू नका.'
        : '⚠️ For your security, TikitMitra never asks for your password, OTP, card details or UPI PIN. Never share confidential credentials.',
      source: 'grounded_local_db',
    };
  }

  // Handle direct Action Payloads from interactive options
  if (actionPayload?.type === 'select_event' && actionPayload.eventId) {
    return await handleEventSessionsSelection(actionPayload.eventId, language);
  }

  if (actionPayload?.type === 'select_session' && actionPayload.sessionId) {
    return await handleSessionSeatsSelection(actionPayload.sessionId, actionPayload.eventId, language);
  }

  if (actionPayload?.type === 'select_seats' && actionPayload.sessionId) {
    return await handleAutoHoldSeats(
      actionPayload.sessionId,
      actionPayload.eventId,
      actionPayload.seatCount || 2,
      actionPayload.tier || 'best',
      language
    );
  }

  // 1. Fetch published events from database
  let activeEventsList: any[] = [];
  try {
    const rawEvents = await db
      .select({
        id: events.id,
        title: events.title,
        titleMr: events.titleMr,
        category: events.category,
        categoryMr: events.categoryMr,
        venueName: venues.name,
        venueNameMr: venues.nameMr,
        city: venues.city,
        convenienceFeeValue: events.convenienceFeeValue,
      })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.status, 'published'))
      .limit(20);

    activeEventsList = rawEvents;
  } catch (err) {
    console.warn('Could not fetch active events for TikitMitra:', err);
  }

  // 1b. Gemini NL understanding (when configured) — still executes via grounded DB handlers only
  if (cleanMsg && activeEventsList.length > 0) {
    const geminiIntent = await interpretWithGemini({
      message: cleanMsg,
      history,
      language,
      events: activeEventsList,
    });
    if (geminiIntent) {
      if (geminiIntent.intent === 'my_tickets') {
        return {
          reply:
            language === 'mr'
              ? `🎟️ **आपली बुक केलेली तिकिटे:**\n\nखालील बटनावर टॅप करून पास व QR पहा:`
              : `🎟️ **Your tickets:**\n\nTap below to view passes and QR:`,
          action: {
            type: 'my_tickets',
            label: language === 'mr' ? '🎟️ माझी तिकिटे उघडा' : '🎟️ View My Tickets',
          },
          options: [
            { label: '🎟️ माझी तिकिटे पहा', value: 'माझी तिकिटे उघडा', type: 'my_tickets' },
          ],
          source: 'gemini',
        };
      }
      if (geminiIntent.intent === 'book' && geminiIntent.eventId) {
        if (geminiIntent.sessionId && geminiIntent.seatCount) {
          return await handleAutoHoldSeats(
            geminiIntent.sessionId,
            geminiIntent.eventId,
            geminiIntent.seatCount,
            geminiIntent.tier || 'best',
            language
          );
        }
        if (geminiIntent.sessionId) {
          return await handleSessionSeatsSelection(
            geminiIntent.sessionId,
            geminiIntent.eventId,
            language
          );
        }
        return await handleEventSessionsSelection(geminiIntent.eventId, language);
      }
      if (geminiIntent.intent === 'list_shows') {
        const topEvents = activeEventsList.slice(0, 5);
        return {
          reply:
            geminiIntent.reply ||
            (language === 'mr'
              ? 'सध्या उपलब्ध नाटके खाली आहेत. एकावर टॅप करा:'
              : 'Available shows below. Tap one:'),
          options: topEvents.map((e) => ({
            label: `🎭 ${e.titleMr || e.title}`,
            value: `मी '${e.titleMr || e.title}' पाहू इच्छितो`,
            type: 'select_event' as const,
            payload: { eventId: e.id, eventTitle: e.titleMr || e.title },
          })),
          source: 'gemini',
        };
      }
      if (geminiIntent.reply) {
        return {
          reply: geminiIntent.reply,
          options: geminiIntent.options,
          source: 'gemini',
        };
      }
    }
  }

  // 2. Direct event title match or booking intent
  const matchedEvent = activeEventsList.find(e => {
    const titleEn = e.title.toLowerCase();
    const titleMr = (e.titleMr || '').toLowerCase();
    return (
      lowerMsg.includes(titleEn) ||
      lowerMsg.includes(titleMr) ||
      (titleMr.includes('नियम') && lowerMsg.includes('नियम')) ||
      (titleMr.includes('अलबत्या') && lowerMsg.includes('अलबत्या')) ||
      (titleMr.includes('सही') && lowerMsg.includes('सही')) ||
      (titleMr.includes('स्वर') && lowerMsg.includes('स्वर')) ||
      (titleMr.includes('वसंत') && lowerMsg.includes('वसंत'))
    );
  });

  // If specific event is matched, provide sessions and direct seat pick options
  if (matchedEvent) {
    return await handleEventSessionsSelection(matchedEvent.id, language, matchedEvent);
  }

  // 3. User asks to pick/book seats or popular events
  if (
    lowerMsg.includes('book') ||
    lowerMsg.includes('तिकीट') ||
    lowerMsg.includes('जागा') ||
    lowerMsg.includes('आसन') ||
    lowerMsg.includes('बुक') ||
    lowerMsg.includes('लोकप्रिय') ||
    lowerMsg.includes('popular') ||
    lowerMsg.includes('नाटक') ||
    lowerMsg.includes('मैफल')
  ) {
    const topEvents = activeEventsList.slice(0, 5);
    const options: ChatOption[] = topEvents.map(e => ({
      label: `🎭 ${e.titleMr || e.title}`,
      value: `मी '${e.titleMr || e.title}' पाहू इच्छितो`,
      type: 'select_event',
      payload: { eventId: e.id, eventTitle: e.titleMr || e.title },
    }));

    options.push({
      label: '🎟️ माझी तिकिटे पहा (My Tickets)',
      value: 'माझी तिकिटे दाखवा',
      type: 'my_tickets',
    });

    const reply = language === 'mr'
      ? `नमस्कार! 🙏 महाटिकिटवर सध्या खालील लोकप्रिय नाटके व प्रयोग सुरू आहेत.\n\nआपण कोणत्या नाटकाचे तिकीट बुक करू इच्छिता? खालील पर्यायांपैकी एकावर टॅप करा:`
      : `Hello! 🙏 Here are the top live Marathi plays and events currently open for booking.\n\nWhich show would you like to book? Tap one of the options below:`;

    return {
      reply,
      options,
      action: {
        type: 'open_event',
        label: `🎭 ${topEvents[0]?.titleMr || 'नाटके'} - थेट बुक करा`,
        payload: { eventId: topEvents[0]?.id || 1 },
      },
      source: 'grounded_local_db',
    };
  }

  // 4. User asks for My Tickets / Pass
  if (lowerMsg.includes('माझी') || lowerMsg.includes('my tickets') || lowerMsg.includes('पास') || lowerMsg.includes('तिकीट दाखवा')) {
    return {
      reply: language === 'mr'
        ? `🎟️ **आपली बुक केलेली तिकिटे:**\n\nआपण बुक केलेली सर्व तिकिटे, क्यूआर कोड आणि PDF पास खालील बटनावर टॅप करून पाहू शकता:`
        : `🎟️ **Your Booked Tickets:**\n\nView all your confirmed passes, QR codes, and PDF downloads by tapping below:`,
      action: {
        type: 'my_tickets',
        label: language === 'mr' ? '🎟️ माझी तिकिटे उघडा' : '🎟️ View My Tickets',
      },
      options: [
        {
          label: '🎟️ माझी तिकिटे पहा',
          value: 'माझी तिकिटे उघडा',
          type: 'my_tickets',
        },
        {
          label: '🎭 नवीन नाटके शोधा',
          value: 'नवीन नाटके दाखवा',
          type: 'explore_category',
        },
      ],
      source: 'grounded_local_db',
    };
  }

  // 5. Default welcoming response with top event chips
  const options: ChatOption[] = activeEventsList.slice(0, 4).map(e => ({
    label: `🎭 ${e.titleMr || e.title}`,
    value: `मला '${e.titleMr || e.title}' चे तिकीट बुक करायचे आहे`,
    type: 'select_event',
    payload: { eventId: e.id, eventTitle: e.titleMr || e.title },
  }));

  options.push({
    label: '🎉 महानाट्य महोत्सव ऑफर (MAHA50)',
    value: 'ऑफर काय आहे?',
    type: 'chat',
  });

  return {
    reply: language === 'mr'
      ? `नमस्कार! 🙏 मी **टिकिटमित्र**, महाटिकिटचा अधिकृत AI डिजिटल नाट्य साहाय्यक.\n\nमी आपल्याला संपूर्ण बुकिंग प्रक्रियेत मदत करू शकतो — नाटक शोधणे, शोची वेळ निवडणे, सर्वोत्तम आसने (Seats) राखीव करणे आणि थेट पेमेंट पर्याय देणे!\n\nखालीलपैकी एका पर्यायावर टॅप करा किंवा नाटकाचे नाव लिहा:`
      : `Hello! 🙏 I am **TikitMitra**, the official AI booking assistant for MahaTicket.\n\nI can handle your entire booking: find shows, select showtimes, pick the best seats, and give you a 1-tap payment button!\n\nTap an option below or type the name of a play:`,
    options,
    source: 'grounded_local_db',
  };
}

/**
 * Handle Event Selection: Look up real event sessions from DB and return interactive time chips
 */
async function handleEventSessionsSelection(
  eventId: number,
  language: 'mr' | 'en',
  cachedEvent?: any
): Promise<TikitMitraResponse> {
  try {
    let eventObj = cachedEvent;
    if (!eventObj) {
      const [ev] = await db
        .select({
          id: events.id,
          title: events.title,
          titleMr: events.titleMr,
          category: events.category,
          categoryMr: events.categoryMr,
          venueName: venues.name,
          venueNameMr: venues.nameMr,
          city: venues.city,
        })
        .from(events)
        .leftJoin(venues, eq(events.venueId, venues.id))
        .where(eq(events.id, eventId))
        .limit(1);
      eventObj = ev;
    }

    if (!eventObj) {
      return {
        reply: language === 'mr' ? 'क्षमस्व, हा कार्यक्रम सापडला नाही.' : 'Sorry, event not found.',
        source: 'grounded_local_db',
      };
    }

    // Schema uses 'active' (not 'open'). Include upcoming/active shows; exclude cancelled/completed.
    const now = new Date();
    const allSessionRows = await db
      .select({
        id: eventSessions.id,
        sessionStartTime: eventSessions.sessionStartTime,
        sessionEndTime: eventSessions.sessionEndTime,
        status: eventSessions.status,
      })
      .from(eventSessions)
      .where(eq(eventSessions.eventId, eventId))
      .orderBy(asc(eventSessions.sessionStartTime))
      .limit(24);

    // Bookable showtimes only (DB status is 'active'; legacy 'open' accepted)
    const sessionRows = allSessionRows
      .filter((s) => {
        const status = String(s.status || '').toLowerCase();
        if (status === 'cancelled' || status === 'completed' || status === 'sold_out') return false;
        if (status && status !== 'active' && status !== 'open') return false;
        const start = s.sessionStartTime ? new Date(s.sessionStartTime) : null;
        if (start && !Number.isNaN(start.getTime()) && start.getTime() < now.getTime() - 3 * 60 * 60 * 1000) {
          return false; // ended more than ~3h ago
        }
        return true;
      })
      .slice(0, 8);

    const title = language === 'mr' ? eventObj.titleMr || eventObj.title : eventObj.title;
    const venue = eventObj.venueNameMr || eventObj.venueName || 'सभागृह';
    const city = eventObj.city || 'पुणे';

    if (sessionRows.length === 0) {
      const hadSoldOutOnly =
        allSessionRows.some((s) => String(s.status || '').toLowerCase() === 'sold_out') &&
        !allSessionRows.some((s) => {
          const st = String(s.status || '').toLowerCase();
          return st === 'active' || st === 'open';
        });
      return {
        reply: language === 'mr'
          ? hadSoldOutOnly
            ? `🎭 **${title}**\n📍 **सभागृह:** ${venue}, ${city}\n\nया कार्यक्रमाचे सध्याचे प्रयोग विकले गेले आहेत (sold out). इतर नाटके पहा किंवा नंतर पुन्हा तपासा.`
            : `🎭 **${title}**\n📍 **सभागृह:** ${venue}, ${city}\n\nसध्या बुकिंगसाठी कोणताही आगामी प्रयोग सूचीबद्ध नाही. लवकरच नवीन वेळा जाहीर होऊ शकतात — किंवा इतर नाटके पहा.`
          : hadSoldOutOnly
            ? `🎭 **${title}**\n📍 **Venue:** ${venue}, ${city}\n\nCurrent shows are sold out. Browse other plays or check back later.`
            : `🎭 **${title}**\n📍 **Venue:** ${venue}, ${city}\n\nNo upcoming bookable showtimes are listed right now. New times may be announced soon — or browse other plays.`,
        options: [
          {
            label: '🎭 इतर नाटके पहा',
            value: 'इतर नाटके दाखवा',
            type: 'explore_category',
          },
        ],
        source: 'grounded_local_db',
      };
    }

    const options: ChatOption[] = sessionRows.map(s => {
      const timeStr = formatSessionTimeStr(s.sessionStartTime);
      return {
        label: `📅 ${timeStr}`,
        value: `मी ${timeStr} चा प्रयोग निवडला`,
        type: 'select_session',
        payload: {
          eventId,
          sessionId: s.id,
          eventTitle: title,
          venueName: venue,
          sessionStartTime: s.sessionStartTime,
          sessionMeta: `${timeStr} • ${venue}`,
        },
      };
    });

    options.push({
      label: '🗺️ स्वतः संपूर्ण सीट मॅप पहा',
      value: 'सीट मॅप उघडा',
      type: 'open_seatmap',
      payload: { eventId, sessionId: sessionRows[0].id },
    });

    const reply = language === 'mr'
      ? `🎭 **${title}**\n📍 **सभागृह:** ${venue}, ${city}\n\nया कार्यक्रमासाठी खालील प्रयोग उपलब्ध आहेत. कृपया आपल्याला हवी असलेली वेळ निवडा:`
      : `🎭 **${title}**\n📍 **Venue:** ${venue}, ${city}\n\nThe following showtimes are open for booking. Please select your preferred time:`;

    return {
      reply,
      options,
      action: {
        type: 'select_seats',
        label: `🎟️ ${title} - आसन निवडा`,
        payload: { eventId, sessionId: sessionRows[0].id },
      },
      source: 'grounded_local_db',
    };
  } catch (err: any) {
    console.error('Error handling event session selection:', err);
    return {
      reply: language === 'mr' ? 'माहिती लोड करताना अडचण आली.' : 'Error loading showtimes.',
      source: 'grounded_local_db',
    };
  }
}

/**
 * Handle Session Selection: Show available seat tiers and 1-tap seat auto-pick options
 */
async function handleSessionSeatsSelection(
  sessionId: number,
  eventId: number,
  language: 'mr' | 'en'
): Promise<TikitMitraResponse> {
  try {
    const [sess] = await db
      .select({
        id: eventSessions.id,
        sessionStartTime: eventSessions.sessionStartTime,
        eventTitle: events.title,
        eventTitleMr: events.titleMr,
        venueName: venues.name,
        venueNameMr: venues.nameMr,
        city: venues.city,
      })
      .from(eventSessions)
      .innerJoin(events, eq(eventSessions.eventId, events.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(eventSessions.id, sessionId))
      .limit(1);

    if (!sess) {
      return {
        reply: language === 'mr' ? 'हा प्रयोग उपलब्ध नाही.' : 'Session not found.',
        source: 'grounded_local_db',
      };
    }

    // Query available seats in this session
    const availSeats = await db
      .select({
        invId: seatInventory.id,
        seatId: seatInventory.seatId,
        seatCode: seats.seatCode,
        rowLabel: seats.rowLabel,
        price: ticketTypes.price,
        typeName: ticketTypes.name,
        typeNameMr: ticketTypes.nameMr,
      })
      .from(seatInventory)
      .innerJoin(seats, eq(seatInventory.seatId, seats.id))
      .innerJoin(ticketTypes, eq(seatInventory.ticketTypeId, ticketTypes.id))
      .where(and(eq(seatInventory.sessionId, sessionId), eq(seatInventory.status, 'available')))
      .limit(60);

    const title = language === 'mr' ? sess.eventTitleMr || sess.eventTitle : sess.eventTitle;
    const venue = sess.venueNameMr || sess.venueName || 'सभागृह';
    const timeStr = formatSessionTimeStr(sess.sessionStartTime);

    if (availSeats.length === 0) {
      return {
        reply: language === 'mr'
          ? `क्षमस्व! ${timeStr} च्या प्रयोगातील सर्व आसने आरक्षित झाली आहेत. कृपया इतर वेळ निवडा.`
          : `Sorry, this show is sold out. Please select another time.`,
        options: [
          {
            label: '🔄 दुसरी वेळ निवडा',
            value: 'इतर प्रयोग दाखवा',
            type: 'select_event',
            payload: { eventId },
          },
        ],
        source: 'grounded_local_db',
      };
    }

    const vipPrice = Math.max(...availSeats.map(s => s.price));
    const budgetPrice = Math.min(...availSeats.map(s => s.price));

    const options: ChatOption[] = [
      {
        label: `🎯 २ सर्वोत्तम जागा निवडा (Auto 2 Best Seats)`,
        value: `मी २ सर्वोत्तम जागा निवडत आहे`,
        type: 'select_seats',
        payload: { eventId, sessionId, seatCount: 2, tier: 'best' },
      },
      {
        label: `👑 १ VIP जागा (₹${Math.round(vipPrice / 100)})`,
        value: `मला १ VIP जागा हवी आहे`,
        type: 'select_seats',
        payload: { eventId, sessionId, seatCount: 1, tier: 'vip' },
      },
      {
        label: `💺 २ किफायतशीर जागा (₹${Math.round(budgetPrice / 100)})`,
        value: `मला २ बाल्कनी जागा हव्या आहेत`,
        type: 'select_seats',
        payload: { eventId, sessionId, seatCount: 2, tier: 'budget' },
      },
      {
        label: '🗺️ स्वतः आसन निवडा (Interactive Map)',
        value: 'सीट मॅप उघडा',
        type: 'open_seatmap',
        payload: { eventId, sessionId },
      },
    ];

    const reply = language === 'mr'
      ? `🎭 **${title}**\n📍 **सभागृह:** ${venue}\n⏰ **वेळ:** ${timeStr}\n\n⚡ **जागांचे दर:**\n• सर्वोत्तम श्रेणी (VIP): ₹${Math.round(vipPrice / 100)}\n• सामान्य / बाल्कनी: ₹${Math.round(budgetPrice / 100)}\n\nमी आपल्यासाठी कोणत्या जागा बुक करू? खालीलपैकी एका पर्यायावर टॅप करा:`
      : `🎭 **${title}**\n📍 **Venue:** ${venue}\n⏰ **Time:** ${timeStr}\n\n⚡ **Pricing Tiers:**\n• Premium (VIP): ₹${Math.round(vipPrice / 100)}\n• Balcony/Budget: ₹${Math.round(budgetPrice / 100)}\n\nWhich seats should I reserve for you? Tap below:`;

    return {
      reply,
      options,
      source: 'grounded_local_db',
    };
  } catch (err: any) {
    console.error('Error handling session seats selection:', err);
    return {
      reply: language === 'mr' ? 'आसने लोड करताना अडचण आली.' : 'Error loading seats.',
      source: 'grounded_local_db',
    };
  }
}

/**
 * Handle Auto Hold Seats: Selects real seats, creates real database hold, calculates pricing,
 * and provides the ready-to-pay "💳 आता पैसे भरा (Proceed to Payment)" button right inside chat!
 */
async function handleAutoHoldSeats(
  sessionId: number,
  eventId: number,
  seatCount: number,
  tier: 'best' | 'vip' | 'budget',
  language: 'mr' | 'en'
): Promise<TikitMitraResponse> {
  try {
    const [sessionRecord] = await db
      .select({
        id: eventSessions.id,
        sessionStartTime: eventSessions.sessionStartTime,
        eventId: eventSessions.eventId,
      })
      .from(eventSessions)
      .where(eq(eventSessions.id, sessionId))
      .limit(1);

    if (!sessionRecord) {
      return {
        reply: language === 'mr' ? 'हा प्रयोग उपलब्ध नाही.' : 'Session not found.',
        source: 'grounded_local_db',
      };
    }

    const [eventRecord] = await db
      .select()
      .from(events)
      .where(eq(events.id, sessionRecord.eventId))
      .limit(1);

    let venueRecord: any = null;
    if (eventRecord?.venueId) {
      const [v] = await db.select().from(venues).where(eq(venues.id, eventRecord.venueId)).limit(1);
      venueRecord = v;
    }

    // Query available seats in database
    const availSeats = await db
      .select({
        invId: seatInventory.id,
        seatId: seatInventory.seatId,
        seatCode: seats.seatCode,
        rowLabel: seats.rowLabel,
        price: ticketTypes.price,
      })
      .from(seatInventory)
      .innerJoin(seats, eq(seatInventory.seatId, seats.id))
      .innerJoin(ticketTypes, eq(seatInventory.ticketTypeId, ticketTypes.id))
      .where(and(eq(seatInventory.sessionId, sessionId), eq(seatInventory.status, 'available')))
      .limit(100);

    if (availSeats.length < seatCount) {
      return {
        reply: language === 'mr'
          ? `क्षमस्व! या प्रयोगासाठी पुरेशी सलग आसने उपलब्ध नाहीत. कृपया इतर पर्याय निवडा.`
          : `Sorry, insufficient available seats for this show. Please select another show.`,
        options: [
          {
            label: '🔄 दुसरी वेळ निवडा',
            value: 'इतर प्रयोग दाखवा',
            type: 'select_event',
            payload: { eventId },
          },
        ],
        source: 'grounded_local_db',
      };
    }

    // Sort seats by tier preference: VIP = highest price & front row; Budget = lowest price
    let sortedSeats = [...availSeats];
    if (tier === 'vip') {
      sortedSeats.sort((a, b) => b.price - a.price || a.seatCode.localeCompare(b.seatCode));
    } else if (tier === 'budget') {
      sortedSeats.sort((a, b) => a.price - b.price || a.seatCode.localeCompare(b.seatCode));
    } else {
      // 'best' = middle-to-front seats with comfortable viewing
      sortedSeats.sort((a, b) => b.price - a.price || a.seatCode.localeCompare(b.seatCode));
    }

    const picked = sortedSeats.slice(0, Math.min(seatCount, 5));
    const pickedSeatIds = picked.map(s => s.seatId);
    const pickedSeatCodes = picked.map(s => s.seatCode);

    // Call real authoritative database hold
    const holdResult = await createTemporarySeatHold({
      sessionId,
      seatIds: pickedSeatIds,
    });

    const pricing = await calculatePricing(
      eventRecord,
      pickedSeatIds.length,
      holdResult.faceValueTotal
    );

    const title = language === 'mr' ? eventRecord.titleMr || eventRecord.title : eventRecord.title;
    const venueName = venueRecord?.nameMr || venueRecord?.name || 'सभागृह';
    const timeStr = formatSessionTimeStr(sessionRecord.sessionStartTime);
    const grandTotalRupees = Math.round(pricing.grandTotal / 100);

    const checkoutPayload = {
      eventId: eventRecord.id,
      sessionId,
      seatIds: pickedSeatIds,
      seatCodes: pickedSeatCodes,
      holdToken: holdResult.holdToken,
      holdExpiresAt: holdResult.holdExpiresAt,
      faceValue: holdResult.faceValueTotal,
      grandTotal: pricing.grandTotal,
      platformFeeTotal: pricing.platformFeeTotal,
      taxTotal: pricing.taxTotal,
      pricing,
      eventTitle: title,
      venueName,
      sessionStartTime: sessionRecord.sessionStartTime,
      sessionMeta: `${timeStr} • ${venueName}`,
      partySize: pickedSeatIds.length,
    };

    const reply = language === 'mr'
      ? `✅ **आपल्या जागा राखीव झाल्या आहेत! (Seats Reserved)**\n\n` +
        `🎭 **कार्यक्रम:** ${title}\n` +
        `📍 **सभागृह:** ${venueName}\n` +
        `⏰ **वेळ:** ${timeStr}\n` +
        `💺 **निवडलेली आसने:** **${pickedSeatCodes.join(', ')}** (${pickedSeatCodes.length} जागा)\n\n` +
        `💰 **रक्कम तपशील:**\n` +
        `• तिकीट दर: ₹${Math.round(pricing.ticketFaceValueTotal / 100)}\n` +
        `• सुविधा शुल्क + जीएसटी: ₹${Math.round((pricing.platformFeeTotal + pricing.taxTotal) / 100)}\n` +
        `• **एकूण रक्कम: ₹${grandTotalRupees}**\n\n` +
        `⏳ आपल्या जागा पुढील **१० मिनिटांसाठी** सुरक्षित ठेवल्या आहेत.\n\n` +
        `तिकीट पक्के करण्यासाठी खालील बटनावर टॅप करून पेमेंट पूर्ण करा:`
      : `✅ **Seats Successfully Reserved!**\n\n` +
        `🎭 **Event:** ${title}\n` +
        `📍 **Venue:** ${venueName}\n` +
        `⏰ **Time:** ${timeStr}\n` +
        `💺 **Seats:** **${pickedSeatCodes.join(', ')}** (${pickedSeatCodes.length} Seats)\n\n` +
        `💰 **Summary:**\n` +
        `• Tickets: ₹${Math.round(pricing.ticketFaceValueTotal / 100)}\n` +
        `• Platform Fee + GST: ₹${Math.round((pricing.platformFeeTotal + pricing.taxTotal) / 100)}\n` +
        `• **Grand Total: ₹${grandTotalRupees}**\n\n` +
        `⏳ Your seats are held for the next **10 minutes**.\n\n` +
        `Tap the button below to complete payment & receive your instant pass:`;

    const action: ChatAction = {
      type: 'checkout_pay',
      label: language === 'mr'
        ? `💳 आता पैसे भरा • ₹${grandTotalRupees} (Pay Now)`
        : `💳 Pay Now • ₹${grandTotalRupees}`,
      payload: checkoutPayload,
    };

    const options: ChatOption[] = [
      {
        label: `💳 आता पैसे भरा • ₹${grandTotalRupees} (Pay Now)`,
        value: `मी ₹${grandTotalRupees} पेमेंट करत आहे`,
        type: 'checkout_pay',
        payload: checkoutPayload,
      },
      {
        label: '🔄 इतर जागा निवडा',
        value: 'मला इतर जागा निवडून द्या',
        type: 'select_session',
        payload: { eventId, sessionId },
      },
    ];

    return {
      reply,
      action,
      options,
      source: 'grounded_local_db',
    };
  } catch (err: any) {
    console.error('Error in handleAutoHoldSeats:', err);
    return {
      reply: language === 'mr'
        ? `क्षमस्व! जागा आरक्षित करताना तांत्रिक त्रुटी आली: ${err?.message || 'कृपया पुन्हा प्रयत्न करा.'}`
        : `Unable to reserve seats: ${err?.message || 'Please retry.'}`,
      source: 'grounded_local_db',
    };
  }
}

type GeminiIntent = {
  intent?: 'book' | 'list_shows' | 'my_tickets' | 'chat';
  eventId?: number;
  sessionId?: number;
  seatCount?: number;
  tier?: 'best' | 'vip' | 'budget';
  reply?: string;
  options?: ChatOption[];
};

/**
 * Optional Gemini NL layer. Uses GEMINI_API_KEY or TICKETMITRA_API from server env.
 * Never invents seats/prices — only suggests intents that grounded handlers execute.
 */
async function interpretWithGemini(params: {
  message: string;
  history?: { sender: string; text: string }[];
  language: 'mr' | 'en';
  events: any[];
}): Promise<GeminiIntent | null> {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.TICKETMITRA_API || '').trim();
  if (!apiKey) return null;

  const model =
    (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim() || 'gemini-2.0-flash';

  const catalog = params.events.slice(0, 12).map((e) => ({
    id: e.id,
    title: e.title,
    titleMr: e.titleMr,
    venue: e.venueNameMr || e.venueName,
    city: e.city,
  }));

  const system = `You are TikitMitra, MahaTicket booking assistant (Marathi theatre tickets, India).
Reply ONLY with compact JSON (no markdown):
{"intent":"book"|"list_shows"|"my_tickets"|"chat","eventId":number|null,"sessionId":null,"seatCount":number|null,"tier":"best"|"vip"|"budget"|null,"reply":"short Marathi or English help text"}
Rules:
- eventId MUST be one of the catalog ids when booking a named show; else null.
- seatCount from user text (e.g. "2 seats" / "३ सीट") default 2 when booking.
- Never invent prices, seat codes, or session ids (sessionId always null here).
- If user wants their tickets: intent my_tickets.
- If unclear which show: intent list_shows with a short reply asking them to pick.
Catalog: ${JSON.stringify(catalog)}`;

  const hist = (params.history || [])
    .slice(-4)
    .map((h) => `${h.sender}: ${h.text}`)
    .join('\n');

  const userPrompt = `${hist ? `History:\n${hist}\n\n` : ''}User (${params.language}): ${params.message}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${system}\n\n${userPrompt}` }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
      }),
    });
    if (!res.ok) {
      console.warn('[TikitMitra] Gemini HTTP', res.status);
      return null;
    }
    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as GeminiIntent;
    if (parsed.eventId != null) {
      const ok = catalog.some((c) => Number(c.id) === Number(parsed.eventId));
      if (!ok) parsed.eventId = undefined;
    }
    if (parsed.seatCount != null) {
      parsed.seatCount = Math.min(5, Math.max(1, Number(parsed.seatCount) || 2));
    }
    return parsed;
  } catch (err) {
    console.warn('[TikitMitra] Gemini interpret failed:', err instanceof Error ? err.message : 'unknown');
    return null;
  }
}
