import { db } from '@/src/db/index.ts';
import { events, eventSessions, venues, ticketTypes } from '@/src/db/schema.ts';
import { eq, and, sql } from 'drizzle-orm';

export interface ChatAction {
  type: 'open_event' | 'select_seats' | 'my_tickets' | 'explore_category' | 'contact_support';
  label: string;
  payload?: Record<string, any>;
}

export interface TikitMitraResponse {
  reply: string;
  action?: ChatAction;
  source: 'gemini' | 'openai' | 'grounded_local_db';
}

/**
 * TikitMitra AI Assistant Service
 * Official AI booking assistant for MahaTicket (Product of Kalpkrut Infotech)
 */
export async function askTikitMitra(params: {
  message: string;
  history?: { sender: 'user' | 'agent' | 'model'; text: string }[];
  language?: 'mr' | 'en';
}): Promise<TikitMitraResponse> {
  const { message, history = [], language = 'mr' } = params;
  const cleanMsg = (message || '').trim();

  if (!cleanMsg) {
    return {
      reply: language === 'mr'
        ? 'नमस्कार! 🙏 मी टिकिटमित्र आहे. नाटकाचे नाव किंवा "तिकीट बुक करा" टाईप करा.'
        : 'Hello! I am TikitMitra. Type an event name or "Book Ticket" to get started.',
      source: 'grounded_local_db',
    };
  }

  // Clean query by removing leading emojis or special symbols without stripping text
  const cleanTextOnly = cleanMsg.replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/gu, '').trim() || cleanMsg;
  const lowerMsg = cleanTextOnly.toLowerCase();
  const rawLower = cleanMsg.toLowerCase();

  // Guard against prompt injection or credential solicitation
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

  // Fetch all published events & venues from real database
  let groundedContext = '';
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
    groundedContext = rawEvents
      .map(
        e =>
          `- [ID: ${e.id}] "${e.titleMr}" (${e.title}) | वर्ग: ${e.categoryMr} | नाट्यगृह: ${e.venueNameMr || e.venueName}, ${e.city} | सुविधा शुल्क: ₹${(e.convenienceFeeValue || 3000) / 100}`
      )
      .join('\n');
  } catch (err) {
    console.warn('Could not fetch active events for TikitMitra grounding:', err);
  }

  // Smart Intent Matching against Database Events
  let action: ChatAction | undefined = undefined;

  const matchedEvent = activeEventsList.find(e => {
    const titleEn = e.title.toLowerCase();
    const titleMr = (e.titleMr || '').toLowerCase();
    return (
      lowerMsg.includes(titleEn) ||
      lowerMsg.includes(titleMr) ||
      rawLower.includes(titleEn) ||
      rawLower.includes(titleMr) ||
      (titleMr.includes('नियम') && (lowerMsg.includes('नियम') || rawLower.includes('नियम'))) ||
      (titleMr.includes('अलबत्या') && (lowerMsg.includes('अलबत्या') || rawLower.includes('अलबत्या'))) ||
      (titleMr.includes('सही') && (lowerMsg.includes('सही') || rawLower.includes('सही'))) ||
      (titleMr.includes('स्वर') && (lowerMsg.includes('स्वर') || rawLower.includes('स्वर')))
    );
  });

  if (matchedEvent) {
    action = {
      type: 'open_event',
      label: language === 'mr'
        ? `🎟️ '${matchedEvent.titleMr}' - थेट आसन निवडा व तिकीट बुक करा`
        : `🎟️ '${matchedEvent.title}' - Select Seats & Book Ticket`,
      payload: { eventId: matchedEvent.id, action: 'select_seats' },
    };
  } else if (
    lowerMsg.includes('लोकप्रिय') ||
    lowerMsg.includes('popular') ||
    lowerMsg.includes('सध्याची') ||
    rawLower.includes('लोकप्रिय')
  ) {
    const primaryEvent = activeEventsList[0];
    action = {
      type: 'open_event',
      label: language === 'mr'
        ? `🎟️ '${primaryEvent?.titleMr || 'नाटकाचे प्रयोग'}' - थेट आसन निवडा व बुक करा`
        : `🎟️ '${primaryEvent?.title || 'Popular Play'}' - Select Seats & Book Ticket`,
      payload: { eventId: primaryEvent?.id || 1, action: 'select_seats' },
    };
  } else if (
    lowerMsg.includes('बालगंधर्व') ||
    lowerMsg.includes('नाट्यगृह') ||
    lowerMsg.includes('venue') ||
    rawLower.includes('बालगंधर्व')
  ) {
    const bgEvent = activeEventsList.find(e => (e.venueNameMr || '').includes('बालगंधर्व')) || activeEventsList[0];
    action = {
      type: 'open_event',
      label: language === 'mr'
        ? `📍 बालगंधर्व रंगमंदिर - प्रयोग पहा व आसन निवडा`
        : `📍 Bal Gandharva Ranga Mandir - View Shows & Pick Seats`,
      payload: { eventId: bgEvent?.id || 1, action: 'select_seats' },
    };
  } else if (
    lowerMsg.includes('book') ||
    lowerMsg.includes('तिकीट') ||
    lowerMsg.includes('जागा') ||
    lowerMsg.includes('आसन') ||
    lowerMsg.includes('बुक') ||
    rawLower.includes('तिकीट')
  ) {
    const primaryEvent = activeEventsList[0];
    if (primaryEvent) {
      action = {
        type: 'open_event',
        label: language === 'mr'
          ? `🎟️ '${primaryEvent.titleMr}' - थेट आसन निवडा व तिकीट बुक करा`
          : `🎟️ '${primaryEvent.title}' - Select Seats & Book Ticket`,
        payload: { eventId: primaryEvent.id, action: 'select_seats' },
      };
    } else {
      action = {
        type: 'explore_category',
        label: language === 'mr' ? 'सर्व नाटके व प्रयोग पहा' : 'Explore All Shows',
        payload: { category: 'plays' },
      };
    }
  } else if (lowerMsg.includes('माझी') || lowerMsg.includes('my tickets') || rawLower.includes('माझी')) {
    action = {
      type: 'my_tickets',
      label: language === 'mr' ? '🎟️ माझी तिकिटे उघडा (View Ticket Pass)' : '🎟️ View My Ticket Pass',
    };
  }

  // API Key Check (Gemini or OpenAI)
  const apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.TICKETMITRA_API ||
    process.env.OPENAI_API_KEY
  )?.trim();

  // If no API key configured or placeholder key, use 100% automatic DB-grounded AI matching
  if (!apiKey || apiKey.toLowerCase().includes('placeholder') || apiKey.length < 8) {
    return {
      reply: getSmartGroundedDbAnswer(cleanMsg, activeEventsList, matchedEvent, language),
      action,
      source: 'grounded_local_db',
    };
  }

  // Call LLM API (Google Gemini or OpenAI) if API key is present
  try {
    const systemPrompt = `You are टिकिटमित्र (TikitMitra), the helpful Marathi & English ticket-booking AI assistant for MahaTicket (a product of Kalpkrut Infotech).
MahaTicket is Maharashtra's premier platform for Marathi theatre (नाट्य), live concerts, standup comedy, and cultural performances.
Always be polite, warm, concise, and helpful.

Authoritative live events currently published on MahaTicket database:
${groundedContext || 'No live events currently published.'}

Platform Knowledge:
1. Direct Booking: You provide direct, instant seat booking assistance. Always provide the direct action button for the event so the user can open the seat map immediately: "होय! खालील बटनावर क्लिक करा आणि थेट आसन निवडून आपले तिकीट आरक्षित करा!" Never tell the user that you are restricted or unable to book seats.
2. Seats: Interactive live seat map with real-time seat locks (up to 5 seats per booking).
3. Fees: Ticket prices starting ₹250-500. Platform fee ₹30-35 with 18% GST.
4. M-Tickets: Digital ticket pass with encrypted QR code generated instantly.

Strictly adhere to:
- When the user asks to book tickets, buy tickets, or select seats, enthusiastically provide the direct booking action.
- Never hallucinate non-existent shows or prices outside the database context.
- Never ask for confidential passwords, OTPs, or UPI PINs.
- Always answer in Marathi if user asks in Marathi, or English if asked in English.
- Keep responses short and formatted with clear emojis and bullet points for mobile screens.`;

    // OpenAI API support
    if (process.env.OPENAI_API_KEY && apiKey.startsWith('sk-')) {
      const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: cleanMsg },
          ],
          max_tokens: 300,
        }),
      });

      if (openAiRes.ok) {
        const data = await openAiRes.json();
        const replyText = data.choices?.[0]?.message?.content;
        if (replyText) {
          return {
            reply: replyText.trim(),
            action,
            source: 'openai',
          };
        }
      }
    }

    // Google Gemini API support
    const preferredModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    const candidateModels = Array.from(new Set([
      preferredModel,
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ]));

    // Format chat history into Gemini format
    const formattedHistory = (history || []).slice(-6).map((h) => ({
      role: h.sender === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }],
    }));

    const contents = [
      ...formattedHistory,
      {
        role: 'user',
        parts: [{ text: cleanMsg }],
      },
    ];

    const safetySettings = [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
    ];

    for (const model of candidateModels) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 9000);

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemPrompt }],
              },
              contents,
              safetySettings,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 600,
                topP: 0.95,
              },
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText && candidateText.trim().length > 0) {
            return {
              reply: candidateText.trim(),
              action,
              source: 'gemini',
            };
          }
        }
      } catch (e: any) {
        console.warn(`Gemini model ${model} attempt failed:`, e?.message);
      }
    }
  } catch (err: any) {
    console.warn('AI API call failed or timed out:', err.message);
  }

  // Fallback to DB grounded response
  return {
    reply: getSmartGroundedDbAnswer(cleanMsg, activeEventsList, matchedEvent, language),
    action,
    source: 'grounded_local_db',
  };
}

function getSmartGroundedDbAnswer(
  query: string,
  eventsList: any[],
  matchedEvent: any,
  language: 'mr' | 'en'
): string {
  const cleanText = query.replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/gu, '').trim() || query;
  const lower = cleanText.toLowerCase();

  // 1. If a specific play was matched from DB
  if (matchedEvent) {
    return language === 'mr'
      ? `🎭 **${matchedEvent.titleMr}**\n\n📍 **नाट्यगृह:** ${matchedEvent.venueNameMr || matchedEvent.venueName}, ${matchedEvent.city}\n🎟️ **तिकीट दर:** ₹२५० - ₹६०० पासून उपलब्ध\n⚡ **थेट आरक्षण:** खालील बटनावर क्लिक करून आपण थेट आपल्या आवडीचे आसन निवडून लगेच बुकिंग करू शकता!`
      : `🎭 **${matchedEvent.title}**\n\n📍 **Venue:** ${matchedEvent.venueName}, ${matchedEvent.city}\n🎟️ **Tickets:** Starting from ₹250 - ₹600\n⚡ **Direct Booking:** Click the button below to pick your seats directly and book your tickets!`;
  }

  // 2. Popular Plays intent
  if (lower.includes('लोकप्रिय') || lower.includes('popular') || lower.includes('सध्याची')) {
    const listStr = eventsList
      .slice(0, 3)
      .map(e => `• **${e.titleMr}** (${e.venueNameMr || e.venueName}, ${e.city}) - ₹२५० पासून`)
      .join('\n');

    return language === 'mr'
      ? `🔥 **महाराष्ट्रातील सध्याची लोकप्रिय नाटके:**\n\n${listStr || '• पुन्हा सही रे सही\n• नियम व अटी लागू'}\n\n👉 कोणत्याही नाटकाचे तिकीट बुक करण्यासाठी खालील बटनावर क्लिक करा!`
      : `🔥 **Currently Popular Marathi Plays:**\n\n${listStr || '• Punha Sahi Re Sahi'}\n\n👉 Click the button below to view seats and book tickets instantly!`;
  }

  // 3. Venue Directory / Bal Gandharva intent
  if (lower.includes('बालगंधर्व') || lower.includes('नाट्यगृह') || lower.includes('venue')) {
    return language === 'mr'
      ? `🏛️ **बालगंधर्व रंगमंदिर, पुणे:**\n📍 **पत्ता:** जेएम रोड, शिवाजीनगर, पुणे - ४११००५\n🎭 **सध्याचे प्रयोग:** पुन्हा सही रे सही, नियम व अटी लागू, अलबत्या गलबत्या\n🎟️ **तिकीट दर:** ₹२५० - ₹६००\n\nखालील बटनावर क्लिक करून बालगंधर्व रंगमंदिराचे प्रयोग व आसने पहा.`
      : `🏛️ **Bal Gandharva Ranga Mandir, Pune:**\n📍 **Address:** JM Road, Shivajinagar, Pune - 411005\n🎭 **Active Shows:** Punha Sahi Re Sahi, Niyam Va Ati Laagu, Albatya Galbatya\n\nClick below to pick your seats directly!`;
  }

  // 4. Offer / Discount intent
  if (lower.includes('ऑफर') || lower.includes('offer') || lower.includes('महोत्सव') || lower.includes('कूपन')) {
    return language === 'mr'
      ? `🎉 **महानाट्य महोत्सव विशेष ऑफर:**\n\n• कूपन कोड: **MAHA50** (१०% सवलत)\n• कूपन कोड: **NATYA100** (₹१०० थेट सूट)\n\nचेकआउट करताना कूपन कोड प्रविष्ट करा व सवलत मिळवा!`
      : `🎉 **MahaTicket Special Festival Offer:**\n\n• Coupon Code: **MAHA50** (10% Off)\n• Coupon Code: **NATYA100** (₹100 Instant Discount)\n\nEnter coupon code during payment checkout!`;
  }

  // 5. General Booking request
  if (
    lower.includes('book') ||
    lower.includes('तिकीट') ||
    lower.includes('जागा') ||
    lower.includes('आसन') ||
    lower.includes('ुक')
  ) {
    const listStr = eventsList
      .slice(0, 3)
      .map(e => `• **${e.titleMr}** (${e.venueNameMr || e.venueName}, ${e.city})`)
      .join('\n');

    return language === 'mr'
      ? `🎟️ **महाटिकिटवर तिकीट बुकिंग सेवा:**\n\nसध्या उपलब्ध प्रमुख नाटके:\n${listStr || '• पुन्हा सही रे सही'}\n\n👉 खालील बटनावर क्लिक करा, आसन व्यवस्था उघडा, आपली आवडती आसने निवडा आणि Razorpay द्वारे १ मिनिटात बुकिंग पूर्ण करा!`
      : `🎟️ **MahaTicket Direct Booking Service:**\n\nCurrently available top shows:\n${listStr || '• Punha Sahi Re Sahi'}\n\n👉 Click the button below to choose your seats on the interactive map. Only final payment is completed manually by you!`;
  }

  // 6. Rules / Cancellation
  if (lower.includes('रद्द') || lower.includes('cancel') || lower.includes('refund') || lower.includes('परतावा')) {
    return language === 'mr'
      ? 'ℹ️ **तिकीट रद्द व परतावा धोरण:**\n• प्रयोगाच्या ४ तास आधीपर्यंत रद्द केल्यास ७०% रक्कम मूळ पेमेंट खात्यात जमा होते.\n• तांत्रिक अथवा नैसर्गिक कारणास्तव प्रयोग रद्द झाल्यास १००% परतावा त्वरित मिळतो.'
      : 'ℹ️ **Cancellation & Refund Policy:**\n• Tickets cancelled up to 4 hours before showtime get 70% refund to original payment source.\n• 100% refund if show is cancelled by organizers.';
  }

  // 7. Greetings Intent
  if (lower.includes('नमस्कार') || lower.includes('hi') || lower.includes('hello') || lower.includes('hey') || lower.includes('हाय') || lower.includes('हॅलो') || lower.includes('namaskar')) {
    const titles = eventsList.slice(0, 3).map(e => e.titleMr).join(', ');
    return language === 'mr'
      ? `नमस्कार! 🙏 मी **टिकिटमित्र**, महाटिकिटचा डिजिटल साहाय्यक.\n\nआज आपण काय पाहणार आहात? मी आपल्याला:\n• सध्याची लोकप्रिय नाटके शोधण्यात\n• नाट्यगृह व प्रयोगाची वेळ समजून घेण्यात\n• थेट सीट निवडून तिकीट बुक करण्यात मदत करू शकतो.\n\nआपल्या आवडीचे नाटक किंवा शहराचे नाव सांगा!`
      : `Hello! 🙏 I am **TikitMitra**, 
\nI can help you browse top performances, check seat availability, find venues, and book tickets instantly.\n\nWhich play or city are you looking for today?`;
  }

  // 8. Payment & UPI Intent
  if (lower.includes('payment') || lower.includes('पेमेंट') || lower.includes('पैसे') || lower.includes('upi') || lower.includes('gpay') || lower.includes('phonepe')) {
    return language === 'mr'
      ? '💳 **पेमेंट व सुरक्षा:**\n• महाटिकिटवर UPI (GPay, PhonePe, Paytm), NetBanking, Credit/Debit Cards द्वारे १००% सुरक्षित पेमेंट उपलब्ध आहे.\n• पेमेंट पूर्ण होताच WhatsApp आणि ई-मेलवर त्वरित डिजिटल एम-तिकीट प्राप्त होते.'
      : '💳 **Payment & Security:**\n• We accept all UPI apps (GPay, PhonePe, Paytm), NetBanking, and Cards with multi-tier encryption.\n• Digital M-Ticket is sent instantly via WhatsApp & Email upon successful booking.';
  }

  // 9. Showtime & Timing Intent
  if (lower.includes('वेळ') || lower.includes('तारीख') || lower.includes('कधी') || lower.includes('timing') || lower.includes('time') || lower.includes('date') || lower.includes('आज') || lower.includes('उद्या')) {
    const primary = eventsList[0];
    return language === 'mr'
      ? `⏰ **नाट्य प्रयोगांचे वेळापत्रक:**\n• दुपारचा शो: सहसा १२:३० किंवा ४:३० वाजता\n• रात्रीचा शो: सहसा ८:०० किंवा ९:३० वाजता\n\n${primary ? `उदा. '${primary.titleMr}' नाटकाचे आजचे प्रयोग व जागा पाहण्यासाठी खालील बटनावर क्लिक करा.` : 'आपल्या पसंतीच्या नाटकावर क्लिक करून सर्व उपलब्ध वेळा पहा.'}`
      : `⏰ **Showtimes & Schedules:**\n• Matinee Shows: 12:30 PM & 4:30 PM\n• Evening Shows: 8:00 PM & 9:30 PM\n\nClick on any event to see all available show timings and seat availability!`;
  }

  // 10. Default welcoming response
  const titles = eventsList.slice(0, 3).map(e => e.titleMr).join(', ');

  return language === 'mr'
    ? `नमस्कार! 🙏 मी टिकिट मित्र, महाटिकिटचा आहे.\n\nमी आपल्याला महाटिकिटवरील लोकप्रिय नाटकांची माहिती (उदा. ${titles || 'पुन्हा सही रे सही'}), वेळेचे नियोजन आणि आसन आरक्षणात मदत करतो.\n\nआपल्याला कोणत्या नाटकाचे तिकीट बुक करायचे आहे?`
    : `Hello! 🙏 I am TikitMitra.\n\nI can help you explore top Marathi plays (like ${titles || 'Punha Sahi Re Sahi'}), check showtimes, select seats, and book tickets instantly.\n\nWhich show would you like to book today?`;
}
