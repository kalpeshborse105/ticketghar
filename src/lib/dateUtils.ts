/**
 * Utility for accurate IST (Asia/Kolkata) Date & Time formatting with Marathi period indicators (स., दु., सं., रा.)
 */

export const MARATHI_MONTHS_SHORT = [
  'जाने', 'फेब्रु', 'मार्च', 'एप्रिल', 'मे', 'जून',
  'जुलै', 'ऑगस्ट', 'सप्टें', 'ऑक्टो', 'नोव्हें', 'डिसें'
];

export const MARATHI_DAYS_SHORT = [
  'रवि', 'सोम', 'मंगळ', 'बुध', 'गुरु', 'शुक्र', 'शनि'
];

export const ENGLISH_DAYS_SHORT = [
  'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
];

export const ENGLISH_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Converts any date representation to IST Date parts (year, month, day, hours, minutes, dayOfWeek)
 */
export function getISTDateParts(input: string | Date | number | null | undefined): {
  year: number;
  monthIdx: number;
  day: number;
  hours: number;
  minutes: number;
  dayOfWeek: number;
} | null {
  if (!input) return null;

  try {
    let dateObj: Date;

    if (typeof input === 'string') {
      // Normalize SQL datetime string without timezone (e.g. "2026-10-15 16:00:00")
      let clean = input.trim();
      if (clean.includes(' ') && !clean.includes('T')) {
        clean = clean.replace(' ', 'T');
      }
      // If no timezone offset present, treat as IST / ISO
      if (!clean.endsWith('Z') && !clean.includes('+') && !clean.includes('-')) {
        // Append +05:30 to interpret stored local IST string correctly
        clean = clean + '+05:30';
      }
      dateObj = new Date(clean);
    } else if (typeof input === 'number') {
      dateObj = new Date(input);
    } else {
      dateObj = input;
    }

    if (isNaN(dateObj.getTime())) return null;

    // Use Intl.DateTimeFormat with Asia/Kolkata to extract exact IST numbers
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      weekday: 'narrow',
    });

    const parts = formatter.formatToParts(dateObj);
    let year = dateObj.getFullYear();
    let monthIdx = dateObj.getMonth();
    let day = dateObj.getDate();
    let hours = dateObj.getHours();
    let minutes = dateObj.getMinutes();
    let dayOfWeek = dateObj.getDay();

    parts.forEach((p) => {
      if (p.type === 'year') year = parseInt(p.value, 10);
      if (p.type === 'month') monthIdx = parseInt(p.value, 10) - 1;
      if (p.type === 'day') day = parseInt(p.value, 10);
      if (p.type === 'hour') hours = parseInt(p.value, 10) % 24;
      if (p.type === 'minute') minutes = parseInt(p.value, 10);
    });

    return { year, monthIdx, day, hours, minutes, dayOfWeek };
  } catch {
    return null;
  }
}

/**
 * Returns Marathi time period (स./सकाळी, दु./दुपारी, सं./संध्याकाळी, रा./रात्री) based on IST 24-hour hour
 */
export function getMarathiTimePeriod(hours: number, short: boolean = true): { prefix: string; enPeriod: string } {
  // Hours 0-11: Morning (सकाळी / स.)
  // Hours 12-15: Afternoon (दुपारी / दु.)
  // Hours 16-19: Evening (संध्याकाळी / सं.)
  // Hours 20-23: Night (रात्री / रा.)
  if (hours >= 0 && hours < 12) {
    return { prefix: short ? 'स.' : 'सकाळी', enPeriod: 'AM' };
  } else if (hours >= 12 && hours < 16) {
    return { prefix: short ? 'दु.' : 'दुपारी', enPeriod: 'PM' };
  } else if (hours >= 16 && hours < 20) {
    return { prefix: short ? 'सं.' : 'संध्याकाळी', enPeriod: 'PM' };
  } else {
    return { prefix: short ? 'रा.' : 'रात्री', enPeriod: 'PM' };
  }
}

/**
 * Formats time in IST (e.g. "दु. ४:००" or "4:00 PM")
 */
export function formatISTTime(
  input: string | Date | number | null | undefined,
  language: 'mr' | 'en' = 'mr',
  short: boolean = true
): string {
  const parts = getISTDateParts(input);
  if (!parts) return language === 'mr' ? 'दु. १२:३०' : '12:30 PM';

  const { hours, minutes } = parts;
  const hours12 = hours % 12 || 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const periodInfo = getMarathiTimePeriod(hours, short);

  if (language === 'mr') {
    return `${periodInfo.prefix} ${hours12}:${minutesStr}`;
  } else {
    return `${hours12}:${minutesStr} ${periodInfo.enPeriod}`;
  }
}

/**
 * Formats date in IST (e.g. "१५ ऑक्टो" or "15 Oct")
 */
export function formatISTDate(
  input: string | Date | number | null | undefined,
  language: 'mr' | 'en' = 'mr',
  short: boolean = true
): string {
  const parts = getISTDateParts(input);
  if (!parts) return language === 'mr' ? 'रविवार, १५ ऑक्टो' : 'Sun, 15 Oct';

  const { day, monthIdx, dayOfWeek } = parts;

  if (language === 'mr') {
    const dayName = MARATHI_DAYS_SHORT[dayOfWeek] || '';
    const monthName = MARATHI_MONTHS_SHORT[monthIdx] || '';
    return short ? `${day} ${monthName}` : `${dayName}, ${day} ${monthName}`;
  } else {
    const dateObj = new Date(parts.year, parts.monthIdx, parts.day);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
    return short ? `${day} ${monthName}` : `${dayName}, ${day} ${monthName}`;
  }
}

/**
 * Combined Date & Time formatter for event cards (e.g. "१५ ऑक्टो • दु. ४:००" or "15 Oct • 4:00 PM")
 */
export function formatEventCardDateTime(
  eventOrSession: any,
  language: 'mr' | 'en' = 'mr',
  short: boolean = true
): { dateStr: string; timeStr: string; fullStr: string } {
  let rawDate: any = null;

  if (!eventOrSession) {
    return {
      dateStr: language === 'mr' ? 'रविवार, १५ ऑक्टो' : 'Sun, 15 Oct',
      timeStr: language === 'mr' ? 'दु. १२:३०' : '12:30 PM',
      fullStr: language === 'mr' ? 'रविवार, १५ ऑक्टो • दु. १२:३०' : 'Sun, 15 Oct • 12:30 PM',
    };
  }

  // Determine date source
  if (typeof eventOrSession === 'string' || typeof eventOrSession === 'number' || eventOrSession instanceof Date) {
    rawDate = eventOrSession;
  } else if (eventOrSession.sessionStartTime) {
    rawDate = eventOrSession.sessionStartTime;
  } else if (eventOrSession.startTime) {
    rawDate = eventOrSession.startTime;
  } else if (eventOrSession.sessions && eventOrSession.sessions.length > 0) {
    const active = eventOrSession.sessions.find((s: any) => s.status === 'active' || s.status === 'published') || eventOrSession.sessions[0];
    rawDate = active?.sessionStartTime || active?.startTime;
  } else if (eventOrSession.startDate) {
    rawDate = eventOrSession.startDate;
  }

  if (!rawDate) {
    return {
      dateStr: language === 'mr' ? '१५ ऑक्टो' : '15 Oct',
      timeStr: language === 'mr' ? 'दु. ४:००' : '4:00 PM',
      fullStr: language === 'mr' ? '१५ ऑक्टो • दु. ४:००' : '15 Oct • 4:00 PM',
    };
  }

  const dateStr = formatISTDate(rawDate, language, short);
  const timeStr = formatISTTime(rawDate, language, short);
  const fullStr = `${dateStr} • ${timeStr}`;

  return { dateStr, timeStr, fullStr };
}
