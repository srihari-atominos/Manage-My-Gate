/**
 * Push-only copy layer.
 *
 * The OS (iOS/watchOS banner, Android shade) owns the banner's look: translucent
 * rounded card, app icon, timestamp and typography. NOHOM only controls the
 * title/body strings, so this module rewrites those for the push channel while
 * the in-app inbox keeps the original notification text.
 */

const MAX_TITLE = 44;
const MAX_BODY = 110;

// Exact in-app title (lowercased) -> friendly push title.
const TITLE_MAP = {
  'gate approval required': '🚪 Someone’s at your gate!',
  'visitor checked in': '👋 Your guest has arrived',
  'visitor checked out': '👋 Your guest has left',
  'guest invitation created': '🎟️ Your guest pass is ready',
  'visitor pass revoked': '🚫 Guest pass cancelled',
  'staff gate entry': '🧹 Your help has arrived',
  'staff gate exit': '🏠 Your help just headed out',
  'household allocation request': '🙋 New helper request for your home',
  'staff allocation accepted': '✅ Helper added to your home',
  'staff allocation declined': '😕 Helper request declined',
  'household allocation ended': '👋 Helper removed from your home',
  'complaint submitted successfully': '📝 Got it! We’re on it',
  'complaint reassigned': '🔄 Your request has a new owner',
  'technician assigned': '🛠️ Help is on the way!',
  'new complaint assignment': '🔧 New job for you',
  'new complaint assignment request': '🔧 New job waiting for you',
  'assignment no longer available': '⏱️ That job was taken',
  'new maintenance & assessment bill': '🧾 Your new bill is here',
  'payment verified': '✅ Payment confirmed — thank you!',
  'cash payment received': '💵 Cash payment received',
  'payment could not be verified': '⚠️ We couldn’t verify your payment',
  'offline payment rejected': '⚠️ Payment needs another look',
  'amenity reservation confirmed': '🎉 You’re booked in!',
  'amenity reservation cancelled': '❌ Booking cancelled',
  'amenity access pass issued': '🎫 Your amenity pass is ready',
  'amenity hold expired': '⏳ Your slot hold ran out',
  'amenity booking awaiting approval': '⏳ Booking sent for approval',
  'amenity approval requested': '📥 A booking needs your approval',
  'amenity booking not approved in time': '⌛ Booking wasn’t approved in time',
  'amenity booking reviewed': '👀 Your booking was reviewed',
  'amenity deposit settled': '💸 Deposit settled',
  'booking cancelled due to maintenance': '🔧 Booking cancelled for maintenance',
  'booking rescheduled due to maintenance': '🔧 Booking moved for maintenance',
  'new community poll active': '🗳️ Your vote counts — poll is live!',
  'poll closing soon!': '⏰ Last call to vote!',
  'community poll closed: results ready': '📊 Poll results are in',
  'new message': '💬 You’ve got a message',
  'new enquiry received': '📩 New enquiry received',
};

// Dynamic titles.
const TITLE_RULES = [
  [/^message from (.+)$/i, (m) => `💬 ${m[1]} sent you a message`],
  [/^invitation to (.+)$/i, (m) => `💌 You’re invited to ${m[1]}!`],
  [/^(.+) submitted$/i, (m) => `🧾 ${m[1]} submitted`],
  [/^new (.+) request$/i, (m) => `📥 New ${m[1]} request`],
  [/^(.+) verified$/i, (m) => `✅ ${m[1]} verified`],
];

// Fallbacks by resolved semantic type when no title rule matched.
const TYPE_TITLE = {
  VISITOR_REQUEST: '🚪 Someone’s at your gate!',
  VISITOR: '👋 Visitor update',
  BILLING: '🧾 Billing update',
  COMPLAINT: '🛠️ Maintenance update',
  AMENITY: '🏊 Amenity update',
  POLL: '🗳️ Community poll',
  NOTICE: '📢 New community notice',
  MESSAGE: '💬 New message',
  INVITATION: '💌 You have an invitation',
};

// Short category line shown under the title on iOS (ignored on Android).
const TYPE_SUBTITLE = {
  VISITOR_REQUEST: 'Gate Security',
  VISITOR: 'Visitors',
  BILLING: 'Billing',
  COMPLAINT: 'Maintenance',
  AMENITY: 'Amenities',
  POLL: 'Community',
  NOTICE: 'Notice Board',
  MESSAGE: 'Messages',
  INVITATION: 'Invitations',
};

const clamp = (text, max) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
};

// Alternative wordings for frequent events so repeats feel less robotic. The variant is chosen from a
// stable seed (the notification id), so a retried push for the same event always reads the same.
const TITLE_VARIANTS = {
  'gate approval required': ['🔔 Knock knock! Guest at the gate', '🚪 A visitor is waiting for you'],
  'technician assigned': ['🔧 Your technician is assigned', '🛠️ Fix-it help is on the way!'],
  'complaint submitted successfully': ['✅ Request received — on it!'],
  'payment verified': ['🎉 Payment received — thanks!'],
  'new community poll active': ['🗳️ New poll — have your say!'],
  'visitor checked in': ['🎉 Your guest just arrived'],
  'staff gate entry': ['🏠 Your help just arrived'],
};

// A "someone is at the gate" alert is useless later: let the push service drop it after this long.
const TYPE_TTL_SECONDS = { VISITOR_REQUEST: 600, VISITOR: 3600 };

// Appended to the gate request body so the action is obvious at a glance.
const TYPE_CTA = { VISITOR_REQUEST: 'Tap to approve or deny.' };

const stableIndex = (seed, size) => {
  let hash = 5381;
  for (const ch of String(seed ?? '')) hash = ((hash << 5) + hash + ch.charCodeAt(0)) >>> 0;
  return hash % size;
};

const friendlyTitle = (rawTitle, resolvedType, seed) => {
  const key = String(rawTitle || '').trim().toLowerCase();
  if (TITLE_MAP[key]) {
    const options = [TITLE_MAP[key], ...(TITLE_VARIANTS[key] || [])];
    return options[stableIndex(seed, options.length)];
  }

  for (const [pattern, build] of TITLE_RULES) {
    const match = String(rawTitle || '').trim().match(pattern);
    if (match) return build(match);
  }

  if (rawTitle) return rawTitle;
  return TYPE_TITLE[resolvedType] || 'NOHOM';
};

const buildBody = (body, resolvedType) => {
  const cta = TYPE_CTA[resolvedType];
  if (!cta || /approve|deny/i.test(String(body || ''))) return clamp(body, MAX_BODY);
  const lead = clamp(body, MAX_BODY - cta.length - 1);
  return lead ? `${lead} ${cta}` : cta;
};

/**
 * @param {{ title?: string, body?: string, seed?: string }} input seed keeps the wording variant stable
 * @returns {{ title: string, subtitle: string, body: string, ttl?: number }} short, push-ready strings
 */
export const buildPushCopy = ({ title, body, seed }, resolvedType) => {
  const ttl = TYPE_TTL_SECONDS[resolvedType];
  return {
    title: clamp(friendlyTitle(title, resolvedType, seed ?? title), MAX_TITLE),
    subtitle: TYPE_SUBTITLE[resolvedType] || 'Community',
    body: buildBody(body, resolvedType),
    ...(ttl ? { ttl } : {}),
  };
};

export default { buildPushCopy };
