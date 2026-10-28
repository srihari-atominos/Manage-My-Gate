/**
 * NAHOM AI Assistant — Natural Language Understanding & Conversation Manager
 *
 * Responsibilities:
 * 1. Intent Detection:
 *    Maps user queries (with colloquial terms, misspellings, informal phrasing) to canonical intents.
 * 2. Multi-turn State Tracking & Entity Resolution:
 *    Maintains context across consecutive messages, resolves relative temporal queries
 *    (e.g., "What about next week?", "Saturday at 6 PM"), and extracts missing slots.
 * 3. Workflow & Clarification vs. Confirmation:
 *    Determines whether the interaction requires clarification of missing fields,
 *    asking for confirmation before an action, answering with data, or navigation.
 * 4. Task Switching:
 *    Detects when a user switches away from an in-progress workflow (e.g., booking to dues)
 *    and cleanly resets discordant workflow state.
 * 5. Safe, Bounded Transient State:
 *    Guarantees state representations are bounded in size and never override RBAC or tenant isolation.
 */

import { cancelPendingAction } from './aiAssistant.actions.js';

// Canonical Supported Intents
export const INTENTS = Object.freeze({
  RESIDENT_DUES: 'resident_dues',
  COMMUNITY_FINANCE: 'community_finance',
  ASSESSMENT_CREATE: 'assessment_create',
  PERSONAL_EXPENSE: 'personal_expense',
  PERSONAL_EXPENSE_CREATE: 'personal_expense_create',
  AMENITY_INQUIRY: 'amenity_inquiry',
  AMENITY_AVAILABILITY: 'amenity_availability',
  AMENITY_BOOKING: 'amenity_booking',
  AMENITY_CANCELLATION: 'amenity_cancellation',
  AMENITY_CREATE: 'amenity_create',
  MY_BOOKINGS: 'my_bookings',
  COMPLAINTS_HELPDESK: 'complaints_helpdesk',
  COMPLAINT_CREATE: 'complaint_create',
  COMPLAINT_CANCEL: 'complaint_cancel',
  VISITOR_MANAGEMENT: 'visitor_management',
  VISITOR_PASS_CREATE: 'visitor_pass_create',
  VISITOR_PASS_REVOKE: 'visitor_pass_revoke',
  COMMUNITY_NOTICES: 'community_notices',
  NOTICE_CREATE: 'notice_create',
  STAFF_DIRECTORY: 'staff_directory',
  HOUSEHOLD_VEHICLES: 'household_vehicles',
  COMMUNITY_POLLS: 'community_polls',
  POLL_CREATE: 'poll_create',
  USER_SETTINGS: 'user_settings',
  ADMIN_ANALYTICS: 'admin_analytics',
  GENERAL_INQUIRY: 'general_inquiry',
});

// Canonical Workflows
export const WORKFLOWS = Object.freeze({
  AMENITY_BOOKING_INTAKE: 'amenity_booking_intake',
  AMENITY_BOOKING_READY: 'amenity_booking_ready',
  AMENITY_CANCEL_INTAKE: 'amenity_cancel_intake',
  AMENITY_CANCEL_READY: 'amenity_cancel_ready',
  AMENITY_CREATE_INTAKE: 'amenity_create_intake',
  AMENITY_CREATE_READY: 'amenity_create_ready',
  ASSESSMENT_CREATE_READY: 'assessment_create_ready',
  POLL_CREATE_READY: 'poll_create_ready',
  NOTICE_CREATE_READY: 'notice_create_ready',
  EXPENSE_INTAKE: 'expense_intake',
  EXPENSE_READY: 'expense_ready',
  COMPLAINT_INTAKE: 'complaint_intake',
  COMPLAINT_READY: 'complaint_ready',
  COMPLAINT_CANCEL_INTAKE: 'complaint_cancel_intake',
  COMPLAINT_CANCEL_READY: 'complaint_cancel_ready',
  VISITOR_PASS_INTAKE: 'visitor_pass_intake',
  VISITOR_PASS_READY: 'visitor_pass_ready',
  VISITOR_REVOKE_INTAKE: 'visitor_revoke_intake',
  VISITOR_REVOKE_READY: 'visitor_revoke_ready',
  VISITOR_GUIDANCE: 'visitor_guidance',
});

// Known community amenities recognized across the platform
export const KNOWN_AMENITIES = Object.freeze([
  { canonical: 'Badminton', aliases: ['badminton', 'shuttle', 'badminton court', 'badminton courts'] },
  { canonical: 'Clubhouse', aliases: ['clubhouse', 'club house', 'community hall', 'party hall'] },
  { canonical: 'Swimming Pool', aliases: ['swimming pool', 'pool', 'swimming'] },
  { canonical: 'Gym', aliases: ['gym', 'gymnasium', 'fitness center', 'workout room'] },
  { canonical: 'Tennis', aliases: ['tennis', 'tennis court', 'lawn tennis'] },
  { canonical: 'Squash', aliases: ['squash', 'squash court'] },
  { canonical: 'Banquet Hall', aliases: ['banquet hall', 'banquet', 'event hall'] },
  { canonical: 'Table Tennis', aliases: ['table tennis', 'tt', 'ping pong'] },
  { canonical: 'Basketball', aliases: ['basketball', 'basketball court'] },
  { canonical: 'Billiards', aliases: ['billiards', 'pool table', 'snooker'] },
  { canonical: 'Meeting Room', aliases: ['meeting room', 'conference room', 'coworking'] },
  { canonical: 'Yoga Room', aliases: ['yoga room', 'meditation hall', 'aerobics studio'] },
]);

/**
 * Format Date to YYYY-MM-DD in ISO format
 */
export function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Resolves current date in reference timezone (default 'Asia/Kolkata')
 */
export function getReferenceDate(customDate = null) {
  if (customDate instanceof Date && !isNaN(customDate.getTime())) {
    return new Date(customDate);
  }
  if (typeof customDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(customDate)) {
    return new Date(customDate);
  }
  return new Date();
}

/**
 * Resolves relative date expressions like "tomorrow", "next week", "Saturday", "this weekend"
 */
export function resolveDateExpression(expr, baseDateInput = null) {
  if (!expr || typeof expr !== 'string') return null;
  const text = expr.toLowerCase().trim();
  const baseDate = getReferenceDate(baseDateInput);

  // 1. "yesterday"
  if (text.includes('yesterday')) {
    const yest = new Date(baseDate);
    yest.setDate(baseDate.getDate() - 1);
    return {
      type: 'single',
      date: formatDate(yest),
      label: 'Yesterday',
    };
  }

  // 2. "today"
  if (text.includes('today')) {
    return {
      type: 'single',
      date: formatDate(baseDate),
      label: 'Today',
    };
  }

  // 2. "day after tomorrow" (must precede "tomorrow")
  if (text.includes('day after tomorrow')) {
    const dat = new Date(baseDate);
    dat.setDate(baseDate.getDate() + 2);
    return {
      type: 'single',
      date: formatDate(dat),
      label: 'Day after tomorrow',
    };
  }

  // 3. "tomorrow"
  if (text.includes('tomorrow')) {
    const tmr = new Date(baseDate);
    tmr.setDate(baseDate.getDate() + 1);
    return {
      type: 'single',
      date: formatDate(tmr),
      label: 'Tomorrow',
    };
  }

  // 4. "this weekend" or "weekend" (check before "this week")
  if (text.includes('weekend')) {
    const day = baseDate.getDay();
    let daysToSat = 6 - day;
    if (day === 0) daysToSat = -1;
    const saturday = new Date(baseDate);
    saturday.setDate(baseDate.getDate() + (daysToSat < 0 ? 6 : daysToSat));

    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);

    return {
      type: 'range',
      startDate: formatDate(saturday),
      endDate: formatDate(sunday),
      label: 'This weekend',
    };
  }

  // 5. "next week"
  if (/\bnext week\b/i.test(text)) {
    const day = baseDate.getDay();
    const daysUntilNextMonday = day === 0 ? 1 : 8 - day;
    const nextMonday = new Date(baseDate);
    nextMonday.setDate(baseDate.getDate() + daysUntilNextMonday);

    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);

    return {
      type: 'range',
      startDate: formatDate(nextMonday),
      endDate: formatDate(nextSunday),
      label: 'Next week',
    };
  }

  // 6. "this week"
  if (/\bthis week\b/i.test(text)) {
    const day = baseDate.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    const thisMonday = new Date(baseDate);
    thisMonday.setDate(baseDate.getDate() - daysSinceMonday);

    const thisSunday = new Date(thisMonday);
    thisSunday.setDate(thisMonday.getDate() + 6);

    return {
      type: 'range',
      startDate: formatDate(thisMonday),
      endDate: formatDate(thisSunday),
      label: 'This week',
    };
  }

  // 7. Day of week names: Monday..Sunday
  const weekdays = [
    { name: 'sunday', dayNum: 0 },
    { name: 'monday', dayNum: 1 },
    { name: 'tuesday', dayNum: 2 },
    { name: 'wednesday', dayNum: 3 },
    { name: 'thursday', dayNum: 4 },
    { name: 'friday', dayNum: 5 },
    { name: 'saturday', dayNum: 6 },
  ];

  for (const wd of weekdays) {
    if (new RegExp(`\\b${wd.name}\\b`, 'i').test(text)) {
      const currentDay = baseDate.getDay();
      let diff = (wd.dayNum - currentDay + 7) % 7;
      if (diff === 0 && text.includes('next')) {
        diff = 7;
      } else if (diff === 0 && !text.includes('today')) {
        diff = 0;
      }
      const targetDate = new Date(baseDate);
      targetDate.setDate(baseDate.getDate() + diff);
      const capName = wd.name.charAt(0).toUpperCase() + wd.name.slice(1);

      return {
        type: 'single',
        date: formatDate(targetDate),
        label: capName,
      };
    }
  }

  // 8. Explicit YYYY-MM-DD
  const isoMatch = text.match(/\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    return {
      type: 'single',
      date: isoMatch[0],
      label: isoMatch[0],
    };
  }

  return null;
}

/**
 * Resolves time expressions like "6 PM", "18:00", "09:30 AM", "evening", "morning"
 */
export function resolveTimeExpression(expr) {
  if (!expr || typeof expr !== 'string') return null;
  const text = expr.toLowerCase().trim();

  // 1. Explicit 12-hour: "6:30 pm", "6 pm", "6pm", "09:15 am"
  const m12 = text.match(/\b(0?[1-9]|1[0-2])(?::([0-5]\d))?\s*(am|pm)\b/i);
  if (m12) {
    let hour = parseInt(m12[1], 10);
    const minute = m12[2] || '00';
    const meridian = m12[3].toLowerCase();
    if (meridian === 'pm' && hour < 12) hour += 12;
    if (meridian === 'am' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${minute}`;
  }

  // 2. Explicit 24-hour: "18:00", "09:30"
  const m24 = text.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
  if (m24) {
    return `${m24[1]}:${m24[2]}`;
  }

  // 3. Approximate times
  if (text.includes('morning')) return '09:00';
  if (text.includes('afternoon')) return '14:00';
  if (text.includes('evening')) return '18:00';
  if (text.includes('night')) return '20:00';

  return null;
}

/**
 * Matches known amenity from user utterance
 */
export function extractAmenityName(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();

  for (const amenity of KNOWN_AMENITIES) {
    for (const alias of amenity.aliases) {
      const regex = new RegExp(`\\b${alias}\\b`, 'i');
      if (regex.test(lower)) {
        return amenity.canonical;
      }
    }
  }
  return null;
}

/**
 * Checks if a user utterance represents an affirmative confirmation (e.g. "Yes", "Confirm", "Proceed", "Book it")
 */
export function isAffirmativeConfirmation(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();
  return /^(yes|confirm|proceed|go ahead|yes please|confirm it|book it|create it|do it|sure|okay|ok|approve|submit|yes proceed|yes confirm|please confirm|yes book|yes create)\b/i.test(lower);
}

/**
 * Checks if a user utterance represents a negative confirmation or cancellation (e.g. "No", "Cancel", "Not now", "Never mind")
 */
export function isNegativeConfirmation(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();
  return /^(no|cancel|not now|don't|dont|stop|never mind|discard|abort|no thanks|reject|no cancel|please cancel)\b/i.test(lower);
}

/**
 * Extracts visitor or guest name from user text
 */
export function extractVisitorName(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.trim();

  // Pattern: "pass for <Name>" / "visitor pass for <Name>" / "for <Name>"
  const m1 = lower.match(/(?:pass\s+for|guest\s+named|visitor\s+named|invite|for)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
  if (m1) {
    const candidate = m1[1].trim();
    const exclude = ['tomorrow', 'today', 'yesterday', 'next', 'badminton', 'gym', 'tennis', 'pool', 'my', 'the', 'a', 'an', 'this', 'court', 'clubhouse', 'dinner', 'lunch'];
    if (!exclude.includes(candidate.toLowerCase())) {
      return candidate
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  // Answer to clarification "What is the visitor's name?" -> single name / full name
  const m2 = lower.match(/^([A-Za-z]+(?:\s+[A-Za-z]+)?)$/);
  if (m2) {
    const candidate = m2[1].trim();
    const exclude = ['yes', 'no', 'cancel', 'tomorrow', 'today', 'morning', 'evening', 'night', 'badminton', 'gym', 'tennis', 'pool', 'court', 'clubhouse', 'ok', 'okay'];
    if (!exclude.includes(candidate.toLowerCase()) && candidate.length > 1) {
      return candidate
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  return null;
}

/**
 * Extracts a 10-digit Indian mobile phone number if present
 */
export function extractPhoneNumber(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/(?:\+91[-\s]?)?[6-9]\d{9}\b/);
  return match ? match[0].replace(/[-\s]/g, '') : null;
}

/**
 * Extracts vehicle license plate number if present
 */
export function extractVehicleNumber(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/\b([A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4})\b/i);
  return match ? match[1].toUpperCase().replace(/[-\s]/g, '') : null;
}

/**
 * Extracts expense amount from text e.g. "₹450", "Rs. 1,200", "1200", "350.50"
 */
export function extractExpenseAmount(text) {
  if (!text || typeof text !== 'string') return null;
  // Match with currency symbol or keyword e.g. "₹450", "Rs 1,200", "₹ 1200", "450 rupees", "expense of 450", "spent 1200"
  const m1 = text.match(/(?:(?:₹|rs\.?|inr)\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?))|(?:(?:spent|spend|paid|add|expense of|record)\s+(?:₹|rs\.?)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?))/i);
  if (m1) {
    const valStr = (m1[1] || m1[2]).replace(/,/g, '');
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0) return num;
  }
  // Standalone numeric amount when prompted for amount e.g. "450" or "450 rupees"
  const m2 = text.match(/\b([0-9]+(?:\.[0-9]{1,2})?)\s*(?:rupees|rs|bucks)?\b/i);
  if (m2) {
    const num = parseFloat(m2[1]);
    if (!isNaN(num) && num > 0 && num < 10000000) return num;
  }
  return null;
}

/**
 * Maps category keyword to valid default expense categories
 */
export function extractExpenseCategory(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();
  if (/(grocer|vegetable|fruit|milk|supermarket|bigbasket|blinkit|zepto|kirana|provisions)/i.test(lower)) {
    return { id: 'groceries', name: 'Groceries' };
  }
  if (/(food|dining|restaurant|swiggy|zomato|dinner|lunch|breakfast|snack|cafe|coffee|tea|pizza|burger)/i.test(lower)) {
    return { id: 'food_dining', name: 'Food and Dining' };
  }
  if (/(electric|power|bescom|tneb|water bill|wifi|broadband|internet|cylinder|gas bill|utility|utilities)/i.test(lower)) {
    return { id: 'utilities', name: 'Utilities' };
  }
  if (/(cab|uber|ola|rapido|petrol|diesel|fuel|transport|metro|bus|train|auto|toll|parking)/i.test(lower)) {
    return { id: 'transport', name: 'Transport' };
  }
  if (/(shopping|clothes|amazon|flipkart|myntra|shoes|apparel|dress)/i.test(lower)) {
    return { id: 'shopping', name: 'Shopping' };
  }
  if (/(rent|house rent|flat rent)/i.test(lower)) {
    return { id: 'rent', name: 'Rent' };
  }
  if (/(medic|doctor|pharmacy|hospital|tablet|clinic|health|apollo|pharmeasy)/i.test(lower)) {
    return { id: 'medical', name: 'Medical' };
  }
  if (/(movie|cinema|netflix|prime|hotstar|entertainment|game|playstation|theatre)/i.test(lower)) {
    return { id: 'entertainment', name: 'Entertainment' };
  }
  if (/(maintenance|electrical materials|repair|plumber|hardware|carpentry|household maintenance)/i.test(lower)) {
    return { id: 'other_expense', name: 'Other Expense' };
  }
  return null;
}

/**
 * Extracts payment method (UPI, Cash, Card, etc.)
 */
export function extractPaymentMethod(text) {
  if (!text || typeof text !== 'string') return 'UPI';
  const lower = text.toLowerCase();
  if (/(cash)/i.test(lower)) return 'CASH';
  if (/(card|credit|debit)/i.test(lower)) return 'CARD';
  if (/(netbanking|bank|transfer|neft|imps|rtgs)/i.test(lower)) return 'BANK_TRANSFER';
  if (/(wallet|paytm wallet)/i.test(lower)) return 'WALLET';
  if (/(upi|gpay|google pay|phonepe|paytm|bhim)/i.test(lower)) return 'UPI';
  return 'UPI';
}

/**
 * Extracts title/merchant from user expense query
 */
export function extractExpenseTitle(text) {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.replace(/[.!?]+$/, '').trim();
  const m = cleaned.match(/(?:for|on|at|towards)\s+([A-Za-z0-9\s&'-]+?)(?:\s+(?:today|yesterday|tomorrow|paid|through|via|by|in|\d+|₹)|$)/i);
  if (m) {
    const candidate = m[1].trim();
    if (candidate.length > 2 && !/^(₹|\d+|an\s+expense|expense)/i.test(candidate)) {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }
  }
  const cat = extractExpenseCategory(text);
  if (cat?.name) return cat.name;
  return null;
}

/**
 * Extracts complaint title, category, and priority
 */
export function extractComplaintDetails(text) {
  if (!text || typeof text !== 'string') return { title: null, category: 'General Maintenance', priority: 'Medium' };
  const lower = text.toLowerCase();

  let category = 'General Maintenance';
  if (/(water|leak|leakage|pipe|tap|flush|drain|seepage|sink|bathroom)/i.test(lower)) {
    category = 'Plumbing';
  } else if (/(light|bulb|electricity|power|wire|switch|fan|socket|corridor light|short circuit)/i.test(lower)) {
    category = 'Electrical';
  } else if (/(lift|elevator)/i.test(lower)) {
    category = 'Lift';
  } else if (/(door|window|lock|handle|wood|hinge|carpenter)/i.test(lower)) {
    category = 'Carpentry';
  } else if (/(garbage|waste|trash|clean|cleaning|sweep|dustbin|smell)/i.test(lower)) {
    category = 'Cleaning';
  } else if (/(security|guard|gate|cctv|stranger|noise|parking dispute)/i.test(lower)) {
    category = 'Security';
  }

  let priority = 'Medium';
  if (/(urgent|emergency|critical|immediately|danger|hazard|sparks|flooding)/i.test(lower)) {
    priority = 'Critical';
  } else if (/(high priority|severe|major|not working at all)/i.test(lower)) {
    priority = 'High';
  } else if (/(minor|low priority|whenever possible)/i.test(lower)) {
    priority = 'Low';
  }

  let title = null;
  const mTitle = text.match(/(?:complaint\s+(?:about|regarding|for|on)|report\s+(?:that|a|an)?|issue\s+with)\s+([^.!?]+)/i);
  if (mTitle) {
    title = mTitle[1].trim();
  } else if (/(lift.*not working|broken light|water leakage|garbage collection)/i.test(lower)) {
    const mDirect = text.match(/(?:report\s+)?([A-Za-z0-9\s]+(?:not working|broken|leakage|issue|problem))/i);
    if (mDirect) title = mDirect[1].trim();
  }

  if (title) {
    title = title.replace(/^(the|a|an|my)\s+/i, '');
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  return { title, category, priority };
}

/**
 * Extracts complaint identifier (e.g. "CMP-2026-000001" or hex ID)
 */
export function extractComplaintId(text) {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(/\b(CMP-[0-9]{4}-[0-9]+|[a-f0-9]{24})\b/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Extracts community poll details: question and options
 */
export function extractPollDetails(text = '') {
  const str = String(text || '').trim();
  let question = '';
  let options = [];

  const qMatch = str.match(/(?:poll\s+(?:on|about|for|titled|named|regarding)\s+|create\s+(?:a\s+)?poll\s+(?:on\s+|about\s+|for\s+)?)([^,?;]+[\w\s?]+)/i);
  if (qMatch && qMatch[1]) {
    question = qMatch[1].replace(/\s+with\s+options.*$/i, '').trim();
  } else {
    const stripped = str.replace(/^(?:please\s+)?(?:create|add|start|post)\s+(?:a\s+)?(?:new\s+)?(?:poll|survey)\s*(?:on|about|for)?\s*/i, '');
    question = stripped.replace(/\s+with\s+options.*$/i, '').replace(/\s+options\s*:.*$/i, '').trim();
  }

  const optMatch = str.match(/(?:with\s+options?|options?(?:\s+are|\s*:))\s+([^.]+)/i);
  if (optMatch && optMatch[1]) {
    options = optMatch[1]
      .split(/,|\/|\band\b/i)
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter((s) => s.length > 0 && !/^(and|or)$/i.test(s));
  }
  if (options.length < 2) {
    options = ['Yes', 'No'];
  }

  return {
    question: question || 'Community Poll',
    options,
  };
}

/**
 * Extracts notice details: title, description, priority, category
 */
export function extractNoticeDetails(text = '') {
  const str = String(text || '').trim();
  let title = '';
  let priority = 'Medium';
  let category = 'General';

  if (/critical/i.test(str)) priority = 'Critical';
  else if (/high/i.test(str)) priority = 'High';
  else if (/low/i.test(str)) priority = 'Low';

  if (/maintenance|repair|shutdown|water|electricity|power|generator/i.test(str)) category = 'Maintenance';
  else if (/security|gate|guard|safety|patrol/i.test(str)) category = 'Security';
  else if (/event|celebration|festival|party|gathering/i.test(str)) category = 'Events';
  else if (/billing|maintenance fee|due|invoice/i.test(str)) category = 'Billing';

  const titleMatch = str.match(/(?:notice\s+(?:on|about|for|titled|named|regarding)\s+|post\s+(?:a\s+)?notice\s+(?:on\s+|about\s+|for\s+)?)([^,.;]+)/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  } else {
    const stripped = str.replace(/^(?:please\s+)?(?:create|post|publish|issue)\s+(?:a\s+)?(?:new\s+)?(?:notice|announcement)\s*(?:on|about|for)?\s*/i, '');
    title = stripped.split(/,|\.|\n/)[0].trim();
  }

  return {
    title: title || 'Community Notice',
    description: str || title || 'Official notice for community members.',
    priority,
    category,
  };
}

/**
 * Detects whether the query has a clear standalone intent regardless of conversation history
 */
export function detectDirectIntent(text) {
  if (!text || typeof text !== 'string') return INTENTS.GENERAL_INQUIRY;
  const lower = text.toLowerCase().trim();

  // 1a. Community Maintenance Assessment Creation (Admin)
  if (
    /(create|add|new|setup|schedule)\s+.*(assestement|assessment|maintenance\s+charge|maintenance\s+fee|bulk\s+invoice|billing\s+run)/i.test(lower) ||
    /(assestement|assessment).*for.*billing/i.test(lower) ||
    /(assestement|assessment).*for.*all\s+users/i.test(lower) ||
    /create.*(assestement|assessment)/i.test(lower)
  ) {
    return INTENTS.ASSESSMENT_CREATE;
  }

  // 1. Resident Dues & Maintenance Charges
  if (
    /(maintenance.*(pay|charge|due|amount|bill|owe)|pending.*(due|bill)|unpaid.*(bill|invoice|due)|outstanding.*(due|bill|balance)|how much.*(owe|pay)|my dues|pay.*(dues|maintenance)|unpaid invoices|bill payment|maintenance dues)/i.test(
      lower
    )
  ) {
    return INTENTS.RESIDENT_DUES;
  }

  // 2. Community Finance & Society Expenses
  if (
    /(community.*(spend|spent|expens|expesn|expen|budget|balance|finance|fund|collection)|society.*(expens|expesn|expen|spend|spent|budget)|(spend|spent|spending|expens|expesn|expen|cost).*(by|in|for)?\s+(society|community)|(expens|expesn|expen).*(for|in)\s+(january|february|march|april|may|june|july|august|september|october|november|december|\d{4})|total.*(community|society).*(expens|expesn|spend)|society spending|community spending)/i.test(
      lower
    )
  ) {
    return INTENTS.COMMUNITY_FINANCE;
  }

  // 3a. Personal Expense Creation (Mutations)
  if (
    /(add|record|log|i spent|spent)\s+(a\s+|an\s+)?(personal\s+)?(expense\s+(of\s+)?|₹|rs\.?|\d+)/i.test(lower) ||
    /^(add|record|log)\s+₹?[0-9]+/i.test(lower) ||
    /i spent\s+₹?[0-9]+/i.test(lower)
  ) {
    return INTENTS.PERSONAL_EXPENSE_CREATE;
  }

  // 3b. Personal Expense Manager (Queries)
  if (
    /(how much did i spend|what did i spend|what have i spent|what (are|were|did) my expenses|show my expenses|my expenses for|how much did i spend on|remaining.*budget|budget.*remaining|recent expenses|recent transactions|expense breakdown|personal expense|my expense|my spending|personal budget|wallet balance|my expense manager|expense tracking)/i.test(
      lower
    )
  ) {
    return INTENTS.PERSONAL_EXPENSE;
  }

  // 4a. Complaint Cancellation
  if (
    /(cancel|withdraw|drop|close)\s+.*(complaint|ticket)/i.test(lower)
  ) {
    return INTENTS.COMPLAINT_CANCEL;
  }

  // 4b. Complaint Creation
  if (
    /(raise|create|lodge|file|report|register)\s+.*(complaint|ticket|issue|problem)/i.test(lower) ||
    /report\s+(that\s+)?.*(not working|broken|leakage|leak|garbage|power cut)/i.test(lower) ||
    /(raise|lodge|file)\s+a\s+complaint/i.test(lower)
  ) {
    return INTENTS.COMPLAINT_CREATE;
  }

  // 4c. Complaints & Helpdesk Tickets (Queries)
  if (
    /(show|check|status of|list|view|track)\s+.*(complaint|complaints|ticket|tickets)|my open complaints|my complaints|complaint status/i.test(
      lower
    ) ||
    /(complaint|ticket|maintenance request|helpdesk|plumbing|leakage|water supply issue|power outage|electricity issue|elevator not working)/i.test(
      lower
    )
  ) {
    return INTENTS.COMPLAINTS_HELPDESK;
  }

  // 5. Visitor Management (includes creation, revocation, and inquiries)
  if (
    /(visitor|guest|visited|visitor pass|invite.*guest|delivery pass|cab entry|gate entry|guard console|visitor log|gate approval|at the gate)/i.test(
      lower
    )
  ) {
    return INTENTS.VISITOR_MANAGEMENT;
  }

  // 5b. Poll Creation (Admin)
  if (
    /(create|add|new|start|post|launch|conduct)\s+.*(poll|survey|ballot|community voting|voting poll)/i.test(
      lower
    )
  ) {
    return INTENTS.POLL_CREATE;
  }

  // 5c. Notice Board Publication (Admin)
  if (
    /(create|post|publish|issue|add|new|broadcast)\s+.*(notice|announcement|circular|bulletin|notice\s*board)/i.test(
      lower
    )
  ) {
    return INTENTS.NOTICE_CREATE;
  }

  // 6a. Amenity Facility Creation (Admin / Facility Manager)
  if (
    !/(poll|survey|notice|announcement)/i.test(lower) &&
    (/(create|add|new|setup|configure)\s+.*(amenit|amentit|amenty|facility|court|pool|gym|hall|clubhouse|pitch|ground)/i.test(lower) ||
    /create.*(amenit|amentit|amenty).*in.*amenity\s+master/i.test(lower))
  ) {
    return INTENTS.AMENITY_CREATE;
  }

  // 6b. Amenity Booking Requests
  if (
    /(want to book|book.*(amenity|court|clubhouse|badminton|tennis|pool|gym|hall|slot|facility)|reserve.*(court|clubhouse|badminton|tennis|pool|gym|hall|slot|facility)|reserve a slot|book a slot|slot booking)/i.test(
      lower
    )
  ) {
    return INTENTS.AMENITY_BOOKING;
  }

  // 7. Amenity Availability Inquiries
  if (
    /(is.*(available|free)|availability|free.*slot|available.*slot|check.*timing|timings of|when is.*open|can i use.*(court|gym|pool|clubhouse))/i.test(
      lower
    )
  ) {
    return INTENTS.AMENITY_AVAILABILITY;
  }

  // 8. Amenity Catalog Discovery & Navigation
  if (
    /(what amenities|which amenities|amenities.*book|list of amenities|community facilities|amenity catalog|show amenities|sports facilities|(open|view|show|navigate to|go to).*amenit(y|ies))/i.test(
      lower
    )
  ) {
    return INTENTS.AMENITY_INQUIRY;
  }

  // 9. Amenity Cancellation
  if (
    /(cancel|delete|drop)\s+.*(booking|reservation|slot|badminton|court|pool|tennis|gym|hall|clubhouse)/i.test(
      lower
    )
  ) {
    return INTENTS.AMENITY_CANCELLATION;
  }

  // 10. My Bookings
  if (
    /(my booking|my reservation|my active pass|show.*bookings|do i have any booking|what bookings do i have|my passes)/i.test(
      lower
    )
  ) {
    return INTENTS.MY_BOOKINGS;
  }

  // 11. Community Notices & Announcements
  if (
    /(community notice|latest notice|notices|announcement|announcements|circular|circulars|community broadcast|latest updates|bulletin|what.*notices)/i.test(
      lower
    )
  ) {
    return INTENTS.COMMUNITY_NOTICES;
  }

  // 12. Staff & Domestic Help Directory
  if (
    /(staff directory|domestic help|maid|maids|cook|cooks|cleaner|cleaners|driver|drivers|technician|technicians|electrician|plumber|security guard|gate guard|facility maintenance|who can i contact|assigned to my (unit|flat|villa)|who is assigned|staff assigned|assigned staff)/i.test(
      lower
    )
  ) {
    return INTENTS.STAFF_DIRECTORY;
  }

  // 13. Household Members & Registered Vehicles
  if (
    /(household|family member|co-resident|my flat members|my unit members|who lives in my|registered vehicles?|my vehicle|my car|my bike|parking slot|my parking|parking space)/i.test(
      lower
    )
  ) {
    return INTENTS.HOUSEHOLD_VEHICLES;
  }

  // 14. Community Polls & Surveys
  if (
    /(active poll|polls?|survey|surveys?|voting|vote (for|on|in)|vote option|cast.*(vote|ballot)|community election)/i.test(
      lower
    )
  ) {
    return INTENTS.COMMUNITY_POLLS;
  }

  // 15. User Settings & Preferences
  if (
    /(settings|notification preference|notification settings|quick actions|theme mode|app settings|my preferences)/i.test(
      lower
    )
  ) {
    return INTENTS.USER_SETTINGS;
  }

  // 16. Admin Analytics
  if (
    /(admin analytics|platform kpi|enquiries count|active subscriptions|admin stats|platform stats)/i.test(
      lower
    )
  ) {
    return INTENTS.ADMIN_ANALYTICS;
  }

  return null;
}

/**
 * Checks if a message is a relative temporal follow-up query to an active topic
 */
export function isTemporalFollowUp(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();

  const relativePatterns = [
    /^(what about|and for|how about|any for|show for|check)\s+(next week|tomorrow|this weekend|today|saturday|sunday|monday|upcoming)/i,
    /^(what about\s+)?(next week|tomorrow|this weekend|today|saturday|sunday|monday|tuesday|wednesday|thursday|friday)\??$/i,
    /^next week\??$/i,
    /^tomorrow\??$/i,
    /^this weekend\??$/i,
    /^and tomorrow\??$/i,
  ];

  return relativePatterns.some((pattern) => pattern.test(lower));
}

/**
 * Analyzes conversation state, user message, and history to produce an updated state
 * and action classification.
 *
 * @param {string} message - Current user message
 * @param {object} previousState - Previous state passed from client or prior turn
 * @param {Array} history - Recent conversation history
 * @param {Date} [referenceDate] - Current reference date for relative resolution
 * @returns {object} Updated conversation state
 */
export function analyzeConversationTurn(message, previousState = null, history = [], referenceDate = null) {
  const refDate = getReferenceDate(referenceDate);
  const text = (message || '').trim();
  const directIntent = detectDirectIntent(text);

  // Normalize previous state
  const prev = sanitizeConversationState(previousState);

  // 0. Explicit Confirmation or Rejection of Pending Action
  if (prev?.awaitingConfirmation) {
    if (isNegativeConfirmation(text)) {
      return {
        activeIntent: prev.activeIntent,
        workflow: null,
        collectedDetails: {},
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
        actionCancelled: true,
        actionConfirmed: false,
        pendingAction: prev.pendingAction ? { ...prev.pendingAction, cancelled: true } : null,
      };
    }

    if (isAffirmativeConfirmation(text)) {
      return {
        activeIntent: prev.activeIntent,
        workflow: 'executing_action',
        collectedDetails: prev.collectedDetails,
        missingFields: [],
        nextQuestion: null,
        interactionType: 'executing',
        awaitingConfirmation: false,
        actionConfirmed: true,
        actionCancelled: false,
        pendingAction: prev.pendingAction,
      };
    }
  }

  // 1. Task Switching Detection
  // If the user has an active workflow but sends an explicit discordant request, clear workflow and switch.
  const isWorkflowActive = Boolean(prev?.workflow && prev.workflow !== 'none');
  const isIntraDomain =
    (prev?.activeIntent === INTENTS.COMPLAINT_CANCEL && directIntent === INTENTS.COMPLAINTS_HELPDESK) ||
    (prev?.activeIntent === INTENTS.COMPLAINT_CREATE && directIntent === INTENTS.COMPLAINTS_HELPDESK) ||
    (prev?.activeIntent === INTENTS.PERSONAL_EXPENSE_CREATE && directIntent === INTENTS.PERSONAL_EXPENSE) ||
    (prev?.activeIntent === INTENTS.AMENITY_BOOKING && directIntent === INTENTS.AMENITY_AVAILABILITY) ||
    (prev?.activeIntent === INTENTS.VISITOR_PASS_CREATE && directIntent === INTENTS.VISITOR_MANAGEMENT);

  const isDiscordantIntent =
    directIntent &&
    prev?.activeIntent &&
    directIntent !== prev.activeIntent &&
    directIntent !== INTENTS.GENERAL_INQUIRY &&
    !isIntraDomain;

  if (isWorkflowActive && isDiscordantIntent) {
    if (prev?.pendingAction?.id) {
      cancelPendingAction(prev.pendingAction.id, 'Task switching');
    }
    return handleFreshIntent(directIntent, text, refDate);
  }

  // 2. Temporal Follow-up to Previous Intent
  if (prev?.activeIntent && isTemporalFollowUp(text)) {
    const resolvedDate = resolveDateExpression(text, refDate);
    if (resolvedDate) {
      if (prev.activeIntent === INTENTS.MY_BOOKINGS) {
        return {
          activeIntent: INTENTS.MY_BOOKINGS,
          workflow: null,
          collectedDetails: {
            dateRangeLabel: resolvedDate.label,
            startDate: resolvedDate.type === 'range' ? resolvedDate.startDate : resolvedDate.date,
            endDate: resolvedDate.type === 'range' ? resolvedDate.endDate : resolvedDate.date,
          },
          missingFields: [],
          nextQuestion: null,
          interactionType: 'answering',
          awaitingConfirmation: false,
        };
      }
      if (prev.activeIntent === INTENTS.AMENITY_AVAILABILITY) {
        return {
          activeIntent: INTENTS.AMENITY_AVAILABILITY,
          workflow: null,
          collectedDetails: {
            amenityName: prev.collectedDetails?.amenityName || 'Clubhouse',
            date: resolvedDate.type === 'range' ? resolvedDate.startDate : resolvedDate.date,
            dateLabel: resolvedDate.label,
          },
          missingFields: [],
          nextQuestion: null,
          interactionType: 'answering',
          awaitingConfirmation: false,
        };
      }
      if (prev.activeIntent === INTENTS.VISITOR_MANAGEMENT) {
        return {
          activeIntent: INTENTS.VISITOR_MANAGEMENT,
          workflow: null,
          collectedDetails: {
            dateLabel: resolvedDate.label,
            date: resolvedDate.type === 'range' ? resolvedDate.startDate : resolvedDate.date,
          },
          missingFields: [],
          nextQuestion: null,
          interactionType: 'answering',
          awaitingConfirmation: false,
        };
      }
    }
  }

  // 3. Multi-Turn Clarification within Amenity Booking Workflow
  if (prev?.workflow === WORKFLOWS.AMENITY_BOOKING_INTAKE) {
    const collected = { ...(prev.collectedDetails || {}) };
    let extractedAny = false;

    if (!collected.amenityName) {
      const amenity = extractAmenityName(text);
      if (amenity) {
        collected.amenityName = amenity;
        extractedAny = true;
      }
    }

    if (!collected.date) {
      const dateRes = resolveDateExpression(text, refDate);
      if (dateRes) {
        collected.date = dateRes.type === 'range' ? dateRes.startDate : dateRes.date;
        collected.dateLabel = dateRes.label;
        extractedAny = true;
      }
    }

    if (!collected.slotTime) {
      const timeRes = resolveTimeExpression(text);
      if (timeRes) {
        collected.slotTime = timeRes;
        extractedAny = true;
      }
    }

    if (extractedAny || (!directIntent || directIntent === INTENTS.AMENITY_BOOKING)) {
      const missing = [];
      if (!collected.amenityName) missing.push('amenityName');
      if (!collected.date) missing.push('date');
      if (!collected.slotTime) missing.push('slotTime');

      if (missing.length === 0) {
        return {
          activeIntent: INTENTS.AMENITY_BOOKING,
          workflow: WORKFLOWS.AMENITY_BOOKING_READY,
          collectedDetails: collected,
          missingFields: [],
          nextQuestion: null,
          interactionType: 'confirmation',
          awaitingConfirmation: true,
        };
      }

      let nextQuestion = '';
      if (!collected.amenityName) {
        nextQuestion = 'Which amenity would you like to book? (e.g. Badminton Court, Clubhouse, Tennis Court, Swimming Pool, Gym)';
      } else if (!collected.date) {
        nextQuestion = `What date would you like to book the ${collected.amenityName} for? (e.g. Saturday, tomorrow, or a specific date)`;
      } else if (!collected.slotTime) {
        nextQuestion = `What time slot would you prefer for ${collected.amenityName} on ${collected.dateLabel || collected.date}? (e.g. 6 PM or 10:00 AM)`;
      }

      return {
        activeIntent: INTENTS.AMENITY_BOOKING,
        workflow: WORKFLOWS.AMENITY_BOOKING_INTAKE,
        collectedDetails: collected,
        missingFields: missing,
        nextQuestion,
        interactionType: 'clarification',
        awaitingConfirmation: false,
      };
    }
  }

  // 4. Multi-Turn Clarification within Visitor Pass Intake Workflow
  if (prev?.workflow === WORKFLOWS.VISITOR_PASS_INTAKE) {
    const collected = { ...(prev.collectedDetails || {}) };
    let extractedAny = false;

    if (!collected.visitorName) {
      const vName = extractVisitorName(text);
      if (vName) {
        collected.visitorName = vName;
        extractedAny = true;
      }
    }

    if (!collected.date) {
      const dateRes = resolveDateExpression(text, refDate);
      if (dateRes) {
        collected.date = dateRes.type === 'range' ? dateRes.startDate : dateRes.date;
        collected.dateLabel = dateRes.label;
        extractedAny = true;
      }
    }

    if (!collected.slotTime) {
      const timeRes = resolveTimeExpression(text);
      if (timeRes) {
        collected.slotTime = timeRes;
        extractedAny = true;
      }
    }

    if (!collected.phone) {
      const phoneRes = extractPhoneNumber(text);
      if (phoneRes) {
        collected.phone = phoneRes;
        extractedAny = true;
      }
    }

    if (!collected.vehicleNumber) {
      const vehicleRes = extractVehicleNumber(text);
      if (vehicleRes) {
        collected.vehicleNumber = vehicleRes;
        extractedAny = true;
      }
    }

    if (extractedAny || (!directIntent || directIntent === INTENTS.VISITOR_MANAGEMENT || directIntent === INTENTS.VISITOR_PASS_CREATE)) {
      const missing = [];
      if (!collected.visitorName) missing.push('visitorName');
      if (!collected.date) missing.push('date');
      if (!collected.slotTime) missing.push('slotTime');

      if (missing.length === 0) {
        return {
          activeIntent: INTENTS.VISITOR_MANAGEMENT,
          workflow: WORKFLOWS.VISITOR_PASS_READY,
          collectedDetails: collected,
          missingFields: [],
          nextQuestion: null,
          interactionType: 'confirmation',
          awaitingConfirmation: true,
        };
      }

      let nextQuestion = '';
      if (!collected.visitorName) {
        nextQuestion = "What is the visitor's name?";
      } else if (!collected.date) {
        nextQuestion = `What date will ${collected.visitorName} be visiting? (e.g. Tomorrow, Saturday, or a specific date)`;
      } else if (!collected.slotTime) {
        nextQuestion = `What time is ${collected.visitorName} expected to arrive on ${collected.dateLabel || collected.date}? (e.g. 5 PM or 10:00 AM)`;
      }

      return {
        activeIntent: INTENTS.VISITOR_MANAGEMENT,
        workflow: WORKFLOWS.VISITOR_PASS_INTAKE,
        collectedDetails: collected,
        missingFields: missing,
        nextQuestion,
        interactionType: 'clarification',
        awaitingConfirmation: false,
      };
    }
  }

  // 5. Multi-Turn Clarification within Personal Expense Workflow
  if (prev?.workflow === WORKFLOWS.EXPENSE_INTAKE) {
    const collected = { ...(prev.collectedDetails || {}) };
    let extractedAny = false;

    if (!collected.amount) {
      const amount = extractExpenseAmount(text);
      if (amount) {
        collected.amount = amount;
        extractedAny = true;
      }
    }

    if (!collected.categoryId) {
      const cat = extractExpenseCategory(text);
      if (cat) {
        collected.categoryId = cat.id;
        collected.categoryName = cat.name;
        extractedAny = true;
      }
    }

    if (!collected.merchantOrSource) {
      const title = extractExpenseTitle(text);
      if (title) {
        collected.merchantOrSource = title;
        extractedAny = true;
      }
    }

    const missing = [];
    if (!collected.amount) missing.push('amount');

    if (missing.length === 0) {
      if (!collected.merchantOrSource) {
        collected.merchantOrSource = collected.categoryName || 'Personal Expense';
      }
      if (!collected.date) {
        collected.date = formatDate(refDate);
      }
      if (!collected.paymentMethod) {
        collected.paymentMethod = 'UPI';
      }
      return {
        activeIntent: INTENTS.PERSONAL_EXPENSE_CREATE,
        workflow: WORKFLOWS.EXPENSE_READY,
        collectedDetails: collected,
        missingFields: [],
        nextQuestion: null,
        interactionType: 'confirmation',
        awaitingConfirmation: true,
      };
    }

    return {
      activeIntent: INTENTS.PERSONAL_EXPENSE_CREATE,
      workflow: WORKFLOWS.EXPENSE_INTAKE,
      collectedDetails: collected,
      missingFields: missing,
      nextQuestion: 'How much was the expense? (e.g. ₹450)',
      interactionType: 'clarification',
      awaitingConfirmation: false,
    };
  }

  // 6. Multi-Turn Clarification within Complaint Intake Workflow
  if (prev?.workflow === WORKFLOWS.COMPLAINT_INTAKE) {
    const collected = { ...(prev.collectedDetails || {}) };

    if (!collected.title) {
      const details = extractComplaintDetails(text);
      if (details.title) {
        collected.title = details.title;
        collected.category = details.category;
        collected.priority = details.priority;
      } else if (text.trim().length > 3) {
        collected.title = text.trim();
        collected.category = details.category || 'General Maintenance';
        collected.priority = details.priority || 'Medium';
      }
    }

    const missing = [];
    if (!collected.title) missing.push('title');

    if (missing.length === 0) {
      return {
        activeIntent: INTENTS.COMPLAINT_CREATE,
        workflow: WORKFLOWS.COMPLAINT_READY,
        collectedDetails: collected,
        missingFields: [],
        nextQuestion: null,
        interactionType: 'confirmation',
        awaitingConfirmation: true,
      };
    }

    return {
      activeIntent: INTENTS.COMPLAINT_CREATE,
      workflow: WORKFLOWS.COMPLAINT_INTAKE,
      collectedDetails: collected,
      missingFields: missing,
      nextQuestion: 'Please describe the issue or complaint you would like to report.',
      interactionType: 'clarification',
      awaitingConfirmation: false,
    };
  }

  // 7. Multi-Turn Clarification within Complaint Cancellation Workflow
  if (prev?.workflow === WORKFLOWS.COMPLAINT_CANCEL_INTAKE) {
    const collected = { ...(prev.collectedDetails || {}) };
    const complaintId = extractComplaintId(text);
    if (complaintId) {
      collected.complaintId = complaintId;
    } else {
      const details = extractComplaintDetails(text);
      if (details.title) collected.title = details.title;
      else if (text.trim().length > 2) collected.title = text.trim();
    }

    if (collected.complaintId || collected.title) {
      return {
        activeIntent: INTENTS.COMPLAINT_CANCEL,
        workflow: WORKFLOWS.COMPLAINT_CANCEL_READY,
        collectedDetails: collected,
        missingFields: [],
        nextQuestion: null,
        interactionType: 'confirmation',
        awaitingConfirmation: true,
      };
    }

    return {
      activeIntent: INTENTS.COMPLAINT_CANCEL,
      workflow: WORKFLOWS.COMPLAINT_CANCEL_INTAKE,
      collectedDetails: collected,
      missingFields: ['complaintId'],
      nextQuestion: 'Please provide the ticket number (e.g. CMP-2026-000001) or issue description to cancel.',
      interactionType: 'clarification',
      awaitingConfirmation: false,
    };
  }

  // 8. Fresh Intent Routing
  const targetIntent = directIntent || prev?.activeIntent || INTENTS.GENERAL_INQUIRY;
  return handleFreshIntent(targetIntent, text, refDate);
}

/**
 * Handles initialization of a new intent
 */
function handleFreshIntent(intent, text, refDate) {
  switch (intent) {
    case INTENTS.RESIDENT_DUES:
      return {
        activeIntent: INTENTS.RESIDENT_DUES,
        workflow: null,
        collectedDetails: {},
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };

    case INTENTS.COMMUNITY_FINANCE: {
      const monthMatch = text.match(
        /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i
      );
      const isAllTime = /\b(all|all time|overall|total|entire|complete|history)\b/i.test(text) && !monthMatch && !/\b(current|this)\s+month\b/i.test(text);
      const period = isAllTime ? 'all' : (monthMatch ? monthMatch[0] : 'current_month');
      return {
        activeIntent: INTENTS.COMMUNITY_FINANCE,
        workflow: null,
        collectedDetails: { period },
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.PERSONAL_EXPENSE_CREATE: {
      const amount = extractExpenseAmount(text);
      const cat = extractExpenseCategory(text);
      const title = extractExpenseTitle(text);
      const dateRes = resolveDateExpression(text, refDate);
      const paymentMethod = extractPaymentMethod(text);

      const collected = {};
      if (amount) collected.amount = amount;
      if (cat) {
        collected.categoryId = cat.id;
        collected.categoryName = cat.name;
      }
      if (title) collected.merchantOrSource = title;
      if (dateRes) {
        collected.date = dateRes.type === 'range' ? dateRes.startDate : dateRes.date;
        collected.dateLabel = dateRes.label;
      } else {
        collected.date = formatDate(refDate);
        collected.dateLabel = 'Today';
      }
      if (paymentMethod) collected.paymentMethod = paymentMethod;
      else collected.paymentMethod = 'UPI';

      if (!collected.merchantOrSource && collected.categoryName) {
        collected.merchantOrSource = collected.categoryName;
      }

      const missing = [];
      if (!collected.amount) missing.push('amount');

      if (missing.length === 0) {
        if (!collected.merchantOrSource) collected.merchantOrSource = 'Personal Expense';
        return {
          activeIntent: INTENTS.PERSONAL_EXPENSE_CREATE,
          workflow: WORKFLOWS.EXPENSE_READY,
          collectedDetails: collected,
          missingFields: [],
          nextQuestion: null,
          interactionType: 'confirmation',
          awaitingConfirmation: true,
        };
      }

      return {
        activeIntent: INTENTS.PERSONAL_EXPENSE_CREATE,
        workflow: WORKFLOWS.EXPENSE_INTAKE,
        collectedDetails: collected,
        missingFields: missing,
        nextQuestion: 'How much was the expense? (e.g. ₹450)',
        interactionType: 'clarification',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.PERSONAL_EXPENSE: {
      const cat = extractExpenseCategory(text);
      const dateRes = resolveDateExpression(text, refDate);
      const details = {};
      if (cat) {
        details.categoryId = cat.id;
        details.categoryName = cat.name;
      }
      if (dateRes) {
        details.period = dateRes.label;
        details.startDate = dateRes.type === 'range' ? dateRes.startDate : dateRes.date;
        details.endDate = dateRes.type === 'range' ? dateRes.endDate : dateRes.date;
      }
      if (/previous|last month/i.test(text)) {
        details.period = 'previous_month';
      } else if (/current|this month/i.test(text)) {
        details.period = 'current_month';
      }
      return {
        activeIntent: INTENTS.PERSONAL_EXPENSE,
        workflow: null,
        collectedDetails: details,
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.ASSESSMENT_CREATE: {
      const amtMatch = text.match(/(?:amount(?:\s+of)?|fee(?:\s+of)?|rs\.?|rupees|₹)\s*:?\s*(\d+)/i) ||
                       text.match(/(\d+)\s*(?:rupees|rs|amount)/i);
      const flatAmount = amtMatch ? Number(amtMatch[1]) : 0;

      let name = '';
      const nameMatch = text.match(/(?:name(?:d)?|title(?:d)?)\s+([A-Za-z0-9\s]+?)(?:\s+(?:amount|for|with|fee)|$)/i);
      if (nameMatch && nameMatch[1]) {
        name = nameMatch[1].trim();
      } else {
        const fallMatch = text.match(/(?:assestement|assessment)\s+(?:for\s+)?(?:the\s+)?(?:billing\s+and\s+invoice\s+page\s+)?(?:for\s+all\s+users\s+)?([A-Za-z0-9\s]+?)(?:\s+amount|$)/i);
        if (fallMatch && fallMatch[1]) {
          name = fallMatch[1].replace(/^(for\s+all\s+users|name)\s+/i, '').trim();
        }
      }

      if (!name) {
        name = 'Community Maintenance Assessment';
      } else {
        name = name.charAt(0).toUpperCase() + name.slice(1);
      }

      const collected = {
        name,
        flatAmount,
        billingCycle: 'MONTHLY',
        type: 'RECURRING',
        targetScopeType: 'ALL_COMMUNITY',
      };

      const missing = [];
      if (!flatAmount) missing.push('flatAmount');

      return {
        activeIntent: INTENTS.ASSESSMENT_CREATE,
        workflow: WORKFLOWS.ASSESSMENT_CREATE_READY,
        collectedDetails: collected,
        missingFields: missing,
        nextQuestion: missing.length > 0 ? 'What is the maintenance assessment amount per unit/resident in INR?' : null,
        interactionType: missing.length > 0 ? 'clarification' : 'confirmation',
        awaitingConfirmation: missing.length === 0,
      };
    }

    case INTENTS.AMENITY_INQUIRY:
      return {
        activeIntent: INTENTS.AMENITY_INQUIRY,
        workflow: null,
        collectedDetails: {},
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };

    case INTENTS.AMENITY_AVAILABILITY: {
      const amenity = extractAmenityName(text);
      const dateRes = resolveDateExpression(text, refDate);
      return {
        activeIntent: INTENTS.AMENITY_AVAILABILITY,
        workflow: null,
        collectedDetails: {
          amenityName: amenity || null,
          date: dateRes ? (dateRes.type === 'range' ? dateRes.startDate : dateRes.date) : formatDate(refDate),
          dateLabel: dateRes ? dateRes.label : 'Today',
        },
        missingFields: amenity ? [] : ['amenityName'],
        nextQuestion: amenity ? null : 'Which amenity would you like to check availability for? (e.g. Badminton, Clubhouse, Gym)',
        interactionType: amenity ? 'answering' : 'clarification',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.AMENITY_BOOKING: {
      const amenity = extractAmenityName(text);
      const dateRes = resolveDateExpression(text, refDate);
      const timeRes = resolveTimeExpression(text);

      const collected = {};
      if (amenity) collected.amenityName = amenity;
      if (dateRes) {
        collected.date = dateRes.type === 'range' ? dateRes.startDate : dateRes.date;
        collected.dateLabel = dateRes.label;
      }
      if (timeRes) collected.slotTime = timeRes;

      const missing = [];
      if (!collected.amenityName) missing.push('amenityName');
      if (!collected.date) missing.push('date');
      if (!collected.slotTime) missing.push('slotTime');

      if (missing.length === 0) {
        return {
          activeIntent: INTENTS.AMENITY_BOOKING,
          workflow: WORKFLOWS.AMENITY_BOOKING_READY,
          collectedDetails: collected,
          missingFields: [],
          nextQuestion: null,
          interactionType: 'confirmation',
          awaitingConfirmation: true,
        };
      }

      let nextQuestion = '';
      if (!collected.amenityName) {
        nextQuestion = 'Which amenity would you like to book? (e.g. Badminton Court, Tennis Court, Clubhouse, Swimming Pool, Gym)';
      } else if (!collected.date) {
        nextQuestion = `What date would you like to book the ${collected.amenityName} for? (e.g. Saturday, tomorrow, or a specific date)`;
      } else if (!collected.slotTime) {
        nextQuestion = `What time slot would you prefer for ${collected.amenityName} on ${collected.dateLabel || collected.date}? (e.g. 6 PM or 10:00 AM)`;
      }

      return {
        activeIntent: INTENTS.AMENITY_BOOKING,
        workflow: WORKFLOWS.AMENITY_BOOKING_INTAKE,
        collectedDetails: collected,
        missingFields: missing,
        nextQuestion,
        interactionType: 'clarification',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.AMENITY_CREATE: {
      const amenity = extractAmenityName(text);
      let name = amenity;
      if (!name) {
        const nameMatch = text.match(/(?:amenity master|amenities in amenity master|create.*amenit(?:y|ies)|add.*facility)\s+([A-Za-z0-9\s]+?)(?:\s+(?:slot|per|with|for|capacity|rate|rupees|rs)|$)/i);
        if (nameMatch && nameMatch[1]) {
          name = nameMatch[1].trim();
        }
      }

      // Extract rate: "rupees of 500", "500 per slot", "₹500", "500 rs"
      const rateMatch = text.match(/(?:rupees(?:\s+of)?|rs\.?|₹)\s*(\d+)/i) || text.match(/(\d+)\s*(?:rupees|rs|per slot|\/slot)/i);
      const ratePerHour = rateMatch ? Number(rateMatch[1]) : 0;

      // Extract capacity: "maximum member of 10", "capacity of 10", "10 members", "10 people"
      const capMatch = text.match(/(?:maximum\s+member(?:\s+of)?|capacity(?:\s+of)?|headcount(?:\s+of)?)\s*(\d+)/i) || text.match(/(\d+)\s*(?:member|members|people|headcount)/i);
      const capacity = capMatch ? Number(capMatch[1]) : 10;

      const collected = {
        name: name || 'Community Facility',
        ratePerHour,
        capacity,
        pricingType: /daily/i.test(text) ? 'daily' : 'hourly',
      };

      return {
        activeIntent: INTENTS.AMENITY_CREATE,
        workflow: WORKFLOWS.AMENITY_CREATE_READY,
        collectedDetails: collected,
        missingFields: name ? [] : ['name'],
        nextQuestion: name ? null : 'What is the name of the new amenity facility you would like to create?',
        interactionType: name ? 'confirmation' : 'clarification',
        awaitingConfirmation: Boolean(name),
      };
    }

    case INTENTS.POLL_CREATE: {
      const details = extractPollDetails(text);
      return {
        activeIntent: INTENTS.POLL_CREATE,
        workflow: WORKFLOWS.POLL_CREATE_READY,
        collectedDetails: details,
        missingFields: [],
        nextQuestion: null,
        interactionType: 'confirmation',
        awaitingConfirmation: true,
      };
    }

    case INTENTS.NOTICE_CREATE: {
      const details = extractNoticeDetails(text);
      return {
        activeIntent: INTENTS.NOTICE_CREATE,
        workflow: WORKFLOWS.NOTICE_CREATE_READY,
        collectedDetails: details,
        missingFields: [],
        nextQuestion: null,
        interactionType: 'confirmation',
        awaitingConfirmation: true,
      };
    }

    case INTENTS.AMENITY_CANCELLATION: {
      const amenity = extractAmenityName(text);
      return {
        activeIntent: INTENTS.AMENITY_CANCELLATION,
        workflow: amenity ? WORKFLOWS.AMENITY_CANCEL_READY : WORKFLOWS.AMENITY_CANCEL_INTAKE,
        collectedDetails: amenity ? { amenityName: amenity } : {},
        missingFields: amenity ? [] : ['amenityName'],
        nextQuestion: amenity ? null : 'Which amenity booking would you like to cancel? (e.g. Badminton, Tennis, Swimming Pool)',
        interactionType: amenity ? 'confirmation' : 'clarification',
        awaitingConfirmation: Boolean(amenity),
      };
    }

    case INTENTS.MY_BOOKINGS: {
      const dateRes = resolveDateExpression(text, refDate);
      const details = {};
      if (dateRes) {
        details.dateRangeLabel = dateRes.label;
        details.startDate = dateRes.type === 'range' ? dateRes.startDate : dateRes.date;
        details.endDate = dateRes.type === 'range' ? dateRes.endDate : dateRes.date;
      }
      return {
        activeIntent: INTENTS.MY_BOOKINGS,
        workflow: null,
        collectedDetails: details,
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.COMPLAINT_CREATE: {
      const details = extractComplaintDetails(text);
      const collected = {};
      if (details.title) collected.title = details.title;
      if (details.category) collected.category = details.category;
      if (details.priority) collected.priority = details.priority;

      const missing = [];
      if (!collected.title) missing.push('title');

      if (missing.length === 0) {
        return {
          activeIntent: INTENTS.COMPLAINT_CREATE,
          workflow: WORKFLOWS.COMPLAINT_READY,
          collectedDetails: collected,
          missingFields: [],
          nextQuestion: null,
          interactionType: 'confirmation',
          awaitingConfirmation: true,
        };
      }

      return {
        activeIntent: INTENTS.COMPLAINT_CREATE,
        workflow: WORKFLOWS.COMPLAINT_INTAKE,
        collectedDetails: collected,
        missingFields: missing,
        nextQuestion: 'Please describe the issue or complaint you would like to report.',
        interactionType: 'clarification',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.COMPLAINT_CANCEL: {
      const complaintId = extractComplaintId(text);
      const details = extractComplaintDetails(text);
      const collected = {};
      if (complaintId) collected.complaintId = complaintId;
      if (details.title) collected.title = details.title;

      if (collected.complaintId || collected.title) {
        return {
          activeIntent: INTENTS.COMPLAINT_CANCEL,
          workflow: WORKFLOWS.COMPLAINT_CANCEL_READY,
          collectedDetails: collected,
          missingFields: [],
          nextQuestion: null,
          interactionType: 'confirmation',
          awaitingConfirmation: true,
        };
      }

      return {
        activeIntent: INTENTS.COMPLAINT_CANCEL,
        workflow: WORKFLOWS.COMPLAINT_CANCEL_INTAKE,
        collectedDetails: collected,
        missingFields: ['complaintId'],
        nextQuestion: 'Please provide the ticket number (e.g. CMP-2026-000001) or issue description to cancel.',
        interactionType: 'clarification',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.COMPLAINTS_HELPDESK: {
      const complaintId = extractComplaintId(text);
      const details = {};
      if (complaintId) details.complaintId = complaintId;
      if (/(resolved|closed)/i.test(text)) details.status = 'Resolved';
      else if (/(in progress|assigned)/i.test(text)) details.status = 'In Progress';
      else if (/(open|pending)/i.test(text)) details.status = 'Open';

      return {
        activeIntent: INTENTS.COMPLAINTS_HELPDESK,
        workflow: null,
        collectedDetails: details,
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.VISITOR_MANAGEMENT: {
      const isInformational = /^(how\s+(do|can|to)|where\s+(can|do|to)|can\s+i|what\s+is\s+the\s+process)/i.test(text.trim());
      if (isInformational) {
        return {
          activeIntent: INTENTS.VISITOR_MANAGEMENT,
          workflow: null,
          collectedDetails: {},
          missingFields: [],
          nextQuestion: null,
          interactionType: 'answering',
          awaitingConfirmation: false,
        };
      }

      const isRevokeRequest = /(cancel|revoke|delete|remove)\s+.*(visitor|guest|visitor pass|pass)/i.test(text);
      if (isRevokeRequest) {
        const vName = extractVisitorName(text);
        return {
          activeIntent: INTENTS.VISITOR_MANAGEMENT,
          workflow: vName ? WORKFLOWS.VISITOR_REVOKE_READY : WORKFLOWS.VISITOR_REVOKE_INTAKE,
          collectedDetails: vName ? { visitorName: vName } : {},
          missingFields: vName ? [] : ['visitorName'],
          nextQuestion: vName ? null : "Which visitor pass would you like to revoke? (Please provide the visitor's name)",
          interactionType: vName ? 'confirmation' : 'clarification',
          awaitingConfirmation: Boolean(vName),
        };
      }

      const isCreateRequest =
        /(create|new|generate|issue|make|book|invite|register)\s+.*(pass|entry|visitor|guest)/i.test(text) ||
        /create.*pass/i.test(text) ||
        /invite.*guest/i.test(text);

      if (isCreateRequest) {
        const vName = extractVisitorName(text);
        const dateRes = resolveDateExpression(text, refDate);
        const timeRes = resolveTimeExpression(text);
        const phone = extractPhoneNumber(text);
        const vehicle = extractVehicleNumber(text);

        const collected = {};
        if (vName) collected.visitorName = vName;
        if (dateRes) {
          collected.date = dateRes.type === 'range' ? dateRes.startDate : dateRes.date;
          collected.dateLabel = dateRes.label;
        }
        if (timeRes) collected.slotTime = timeRes;
        if (phone) collected.phone = phone;
        if (vehicle) collected.vehicleNumber = vehicle;

        const missing = [];
        if (!collected.visitorName) missing.push('visitorName');
        if (!collected.date) missing.push('date');
        if (!collected.slotTime) missing.push('slotTime');

        if (missing.length === 0) {
          return {
            activeIntent: INTENTS.VISITOR_MANAGEMENT,
            workflow: WORKFLOWS.VISITOR_PASS_READY,
            collectedDetails: collected,
            missingFields: [],
            nextQuestion: null,
            interactionType: 'confirmation',
            awaitingConfirmation: true,
          };
        }

        let nextQuestion = '';
        if (!collected.visitorName) {
          nextQuestion = "What is the visitor's name?";
        } else if (!collected.date) {
          nextQuestion = `What date will ${collected.visitorName} be visiting? (e.g. Tomorrow, Saturday, or a specific date)`;
        } else if (!collected.slotTime) {
          nextQuestion = `What time is ${collected.visitorName} expected to arrive on ${collected.dateLabel || collected.date}? (e.g. 5 PM or 10:00 AM)`;
        }

        return {
          activeIntent: INTENTS.VISITOR_MANAGEMENT,
          workflow: WORKFLOWS.VISITOR_PASS_INTAKE,
          collectedDetails: collected,
          missingFields: missing,
          nextQuestion,
          interactionType: 'clarification',
          awaitingConfirmation: false,
        };
      }

      // Read query (e.g. "Who visited today?", "Show my visitor passes")
      return {
        activeIntent: INTENTS.VISITOR_MANAGEMENT,
        workflow: null,
        collectedDetails: {},
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
    }

    default:
      return {
        activeIntent: INTENTS.GENERAL_INQUIRY,
        workflow: null,
        collectedDetails: {},
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
  }
}

/**
 * Sanitizes and bounds conversation state object received from client or memory.
 * Defends against prototype pollution, oversized strings, and invalid types.
 */
export function sanitizeConversationState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return {
      activeIntent: null,
      workflow: null,
      collectedDetails: {},
      missingFields: [],
      nextQuestion: null,
      interactionType: 'answering',
      awaitingConfirmation: false,
      actionConfirmed: false,
      actionCancelled: false,
      pendingAction: null,
    };
  }

  const cleanString = (val, maxLen = 200) => {
    if (typeof val !== 'string') return null;
    return val.trim().slice(0, maxLen);
  };

  const activeIntent = cleanString(state.activeIntent, 50);
  const workflow = cleanString(state.workflow, 50);
  const nextQuestion = cleanString(state.nextQuestion, 300);

  let interactionType = 'answering';
  if (['answering', 'clarification', 'confirmation', 'navigating', 'executing'].includes(state.interactionType)) {
    interactionType = state.interactionType;
  }

  const awaitingConfirmation = Boolean(state.awaitingConfirmation);
  const actionConfirmed = Boolean(state.actionConfirmed);
  const actionCancelled = Boolean(state.actionCancelled);

  const missingFields = Array.isArray(state.missingFields)
    ? state.missingFields.map((f) => cleanString(f, 50)).filter(Boolean).slice(0, 10)
    : [];

  const rawDetails = state.collectedDetails && typeof state.collectedDetails === 'object' ? state.collectedDetails : {};
  const collectedDetails = {};
  for (const [k, v] of Object.entries(rawDetails)) {
    if (k.length > 50) continue;
    if (typeof v === 'string') {
      collectedDetails[k] = cleanString(v, 200);
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      collectedDetails[k] = v;
    }
  }

  let pendingAction = null;
  if (state.pendingAction && typeof state.pendingAction === 'object') {
    pendingAction = {
      id: cleanString(state.pendingAction.id || state.pendingAction.actionId, 80),
      actionType: cleanString(state.pendingAction.actionType, 60),
      summary: cleanString(state.pendingAction.summary, 200),
      confirmationToken: cleanString(state.pendingAction.confirmationToken, 200),
      expiresAt: typeof state.pendingAction.expiresAt === 'number' ? state.pendingAction.expiresAt : null,
      cancelled: Boolean(state.pendingAction.cancelled),
    };
  }

  return {
    activeIntent,
    workflow,
    collectedDetails,
    missingFields,
    nextQuestion,
    interactionType,
    awaitingConfirmation,
    actionConfirmed,
    actionCancelled,
    pendingAction,
  };
}

/**
 * Builds a prompt guidance block summarizing the active multi-turn context
 * for injection into the model's systemInstruction.
 */
export function buildPromptContextInstruction(state, referenceDate = null) {
  const refDate = getReferenceDate(referenceDate);
  const todayStr = formatDate(refDate);
  const dayName = refDate.toLocaleDateString('en-US', { weekday: 'long' });

  let text = `Current Date Context: Today is ${dayName}, ${todayStr} (Timezone: Asia/Kolkata).\n`;

  if (state?.activeIntent) {
    text += `Active Conversation Intent: "${state.activeIntent}"\n`;
  }
  if (state?.workflow) {
    text += `Active Workflow: "${state.workflow}"\n`;
  }
  if (state?.collectedDetails && Object.keys(state.collectedDetails).length > 0) {
    text += `Collected Workflow Details: ${JSON.stringify(state.collectedDetails)}\n`;
  }
  if (state?.pendingAction?.summary) {
    text += `Pending Action Summary: "${state.pendingAction.summary}" (ID: ${state.pendingAction.id})\n`;
  }
  if (state?.missingFields && state.missingFields.length > 0) {
    text += `Missing Required Details: ${state.missingFields.join(', ')}\n`;
    text += `Interaction Mode: CLARIFICATION. Ask the user politely for the missing detail (${state.missingFields[0]}).\n`;
  } else if (state?.awaitingConfirmation) {
    text += `Interaction Mode: CONFIRMATION. The resident has provided all details. Present the proposal clearly and ask for explicit confirmation before executing.\n`;
  } else if (state?.actionConfirmed) {
    text += `Interaction Mode: EXECUTING. The resident has explicitly confirmed the proposal. Execute 'confirm_pending_action' and report the real persisted result.\n`;
  } else if (state?.actionCancelled) {
    text += `Interaction Mode: CANCELLED. The resident cancelled the proposal. Confirm that no changes were made.\n`;
  }

  return text;
}
