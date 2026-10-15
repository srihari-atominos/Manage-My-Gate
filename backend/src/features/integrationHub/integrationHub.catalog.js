/**
 * Single source of truth for the integrations the hub can connect: what each needs, how it is described to
 * admins, and who may configure it.
 *
 * scope:
 *  - 'platform': the credential powers something for EVERY community (login OTPs by SMS, platform e-mail,
 *    Firebase phone auth, ...). Only platform administrators may configure it, and the platform reads it
 *    only from the platform organisation.
 *  - 'community': belongs to one community (its payment gateway, bank account, own mailbox, ...).
 */
export const INTEGRATION_CATALOG = [
  {
    id: 'razorpay',
    name: 'Razorpay Gateway',
    category: 'Payments',
    icon: '💳',
    scope: 'community',
    description: 'Collect maintenance dues and amenity payments online (UPI, cards, net banking).',
    fields: [
      { name: 'keyId', label: 'Key ID', type: 'text', required: true, placeholder: 'rzp_live_…' },
      { name: 'keySecret', label: 'Key Secret', type: 'password', required: true },
    ],
  },
  {
    id: 'banking',
    name: 'Banking Vault',
    category: 'Payments',
    icon: '🏦',
    scope: 'community',
    description: 'The community bank account that receives settlements. Stored encrypted.',
    fields: [
      { name: 'accountName', label: 'Account Holder Name', type: 'text', required: true },
      { name: 'accountNumber', label: 'Account Number', type: 'text', required: true, placeholder: '9 to 18 digits' },
      { name: 'ifscCode', label: 'IFSC Code', type: 'text', required: true, placeholder: 'SBIN0001234' },
    ],
  },
  {
    id: 'smtp',
    name: 'SMTP Email Server',
    category: 'Email',
    icon: '✉️',
    scope: 'community',
    description: 'Send community emails (notices, receipts, invites) from your own mailbox.',
    fields: [
      { name: 'host', label: 'SMTP Host', type: 'text', required: true, placeholder: 'smtp.gmail.com' },
      { name: 'port', label: 'Port', type: 'text', required: true, placeholder: '587 or 465' },
      { name: 'authUsername', label: 'Username / Email', type: 'text', required: true },
      { name: 'authPassword', label: 'Password / App password', type: 'password', required: true },
    ],
  },
  {
    id: 'resend',
    name: 'Resend',
    category: 'Email',
    icon: '⚡',
    scope: 'platform',
    description: 'Transactional email delivery (login codes, invitations).',
    fields: [{ name: 'apiKey', label: 'API Key', type: 'password', required: true }],
  },
  {
    id: 'twilio',
    name: 'Twilio',
    category: 'SMS & Phone',
    icon: '📱',
    scope: 'platform',
    description: 'SMS delivery for login codes and alerts.',
    fields: [
      { name: 'accountSid', label: 'Account SID', type: 'text', required: true },
      { name: 'authToken', label: 'Auth Token', type: 'password', required: true },
    ],
  },
  {
    id: 'messagecentral',
    name: 'Message Central',
    category: 'SMS & Phone',
    icon: '💬',
    scope: 'platform',
    description: 'SMS OTP delivery through Message Central.',
    fields: [
      { name: 'customerId', label: 'Customer ID', type: 'text', required: true },
      { name: 'authToken', label: 'Auth Token', type: 'password', required: true },
      { name: 'countryCode', label: 'Country Code', type: 'text', required: true, placeholder: '91' },
      { name: 'senderId', label: 'Sender ID', type: 'text', required: false },
      { name: 'flowId', label: 'Flow ID', type: 'text', required: false },
      { name: 'environment', label: 'Environment', type: 'text', required: false },
    ],
  },
  {
    id: 'msg91',
    name: 'MSG91 SMS OTP',
    category: 'SMS & Phone',
    icon: '📨',
    scope: 'platform',
    description: 'SMS OTP delivery through MSG91.',
    fields: [
      { name: 'authKey', label: 'Auth Key', type: 'password', required: true },
      { name: 'templateId', label: 'OTP Template ID', type: 'text', required: false },
      { name: 'senderId', label: 'Sender ID', type: 'text', required: false },
    ],
  },
  {
    id: 'firebase',
    name: 'Firebase Authentication',
    category: 'SMS & Phone',
    icon: '🔥',
    scope: 'platform',
    description: 'Phone-number sign-in through Firebase.',
    fields: [
      { name: 'projectId', label: 'Project ID', type: 'text', required: true },
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'authDomain', label: 'Auth Domain', type: 'text', required: true },
      { name: 'appId', label: 'App ID', type: 'text', required: true },
      { name: 'messagingSenderId', label: 'Messaging Sender ID', type: 'text', required: true },
      { name: 'storageBucket', label: 'Storage Bucket', type: 'text', required: false },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'AI',
    icon: '🤖',
    scope: 'community',
    description: 'AI assistance (for example complaint triage) using your own OpenAI key.',
    fields: [{ name: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'sk-…' }],
  },
];

export const PLATFORM_ONLY_PROVIDERS = INTEGRATION_CATALOG.filter((p) => p.scope === 'platform').map((p) => p.id);

export const getCatalogEntry = (provider) =>
  INTEGRATION_CATALOG.find((p) => p.id === String(provider || '').toLowerCase()) || null;

/** The catalog an admin may use: community admins never see (or can connect) platform-level providers. */
export const catalogFor = ({ isPlatform = false } = {}) =>
  INTEGRATION_CATALOG.filter((p) => isPlatform || p.scope !== 'platform');
