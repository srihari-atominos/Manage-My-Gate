import { body, query } from 'express-validator';

const ALLOWED_FEATURES = [
  'visitor',
  'amenities',
  'complaints',
  'notices',
  'polls',
  'digital_wallet',
  'billing',
  'villas',
  'users',
  'roles',
  'workspaces',
  'integrations',
  'administration_security',
];

const ALLOWED_ORG_TYPES = [
  'Residential',
  'Corporate',
  'Educational',
  'Commercial',
  'Other',
];

// Validates community/organization names: letters, numbers, spaces, and safe punctuation
const ORG_NAME_REGEX = /^[a-zA-Z0-9\s.,'#&()/-]+$/;

export const checkNameRules = [
  query('name')
    .notEmpty()
    .withMessage('Organization name query parameter is required')
    .isString()
    .withMessage('Organization name must be a string')
    .trim(),
];

export const setupWorkspaceRules = [
  // Organization fields
  body('organization.name')
    .notEmpty()
    .withMessage('Organization name is required')
    .isString()
    .withMessage('Organization name must be a string')
    .trim(),

  body('organization.organizationType')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Organization type must be a string')
    .trim()
    .isIn(ALLOWED_ORG_TYPES)
    .withMessage(`Organization type must be one of: ${ALLOWED_ORG_TYPES.join(', ')}`),

  body('organization.contactPhone')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Contact phone must be a string')
    .trim(),

  body('organization.contactEmail')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Contact email must be a valid email address')
    .normalizeEmail(),

  body('organization.country')
    .notEmpty()
    .withMessage('Country is required')
    .isString()
    .trim(),

  body('organization.state')
    .notEmpty()
    .withMessage('State is required')
    .isString()
    .trim(),

  body('organization.city')
    .optional({ checkFalsy: true })
    .isString()
    .trim(),

  body('organization.timezone')
    .notEmpty()
    .withMessage('Timezone is required')
    .isString()
    .withMessage('Timezone must be a string')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Timezone must not exceed 50 characters'),

  body('organization.authenticationMethod')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isIn(['EXISTING_SYSTEM', 'OTP_LOGIN'])
    .withMessage('Authentication method must be one of: EXISTING_SYSTEM, OTP_LOGIN'),

  // Community Admin fields
  body('communityAdmin.fullName')
    .notEmpty()
    .withMessage('Community Admin full name is required')
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 }),

  body('communityAdmin.username')
    .notEmpty()
    .withMessage('Community Admin username is required')
    .isString()
    .trim()
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, dots, and hyphens'),

  body('communityAdmin.email')
    .notEmpty()
    .withMessage('Community Admin email is required')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('communityAdmin.phone')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .matches(/^[+0-9\s\-()]{7,25}$/)
    .withMessage('Must be a valid phone number'),

  body('communityAdmin.password')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),

  // Features
  body('features')
    .optional()
    .isArray()
    .withMessage('features must be an array')
    .bail()
    .custom((features) => {
      if (!features.every((item) => typeof item === 'string' && ALLOWED_FEATURES.includes(item))) {
        throw new Error(`Invalid feature in list. Allowed features are: ${ALLOWED_FEATURES.join(', ')}`);
      }
      return true;
    }),

  // Sanitizer: Disallow client manipulation of protected tenant and identity fields
  body(['userId', 'creatorId', 'orgId', 'status', 'isPlatform', 'role', 'roleIds', 'permissions'])
    .customSanitizer(() => undefined),
];

// `when` (if given) must start each chain: express-validator conditions only gate what follows them
const adminContactRules = (prefix, when = null) => {
  const field = (name) => (when ? body(`${prefix}${name}`).if(when) : body(`${prefix}${name}`));
  return [
  field('email')
    .notEmpty()
    .withMessage('Community Admin email is required')
    .isEmail()
    .withMessage('Community Admin email must be valid')
    .trim(),
  field('phone')
    .notEmpty()
    .withMessage('Community Admin phone number is required')
    .isString()
    .trim(),
  field('name')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim(),
  ];
};

/** Platform Admin creates a community; the admin invite is optional here. */
export const provisionCommunityRules = [
  ...setupWorkspaceRules.slice(0, -2), // same community fields, minus password and the sanitizer
  body('admin').optional({ nullable: true }).isObject().withMessage('admin must be an object'),
  ...adminContactRules('admin.', body('admin').exists({ checkNull: true })),
  body(['userId', 'creatorId', 'orgId', 'status', 'isPlatform', 'role', 'roleIds', 'permissions'])
    .customSanitizer(() => undefined),
];

/** Platform Admin invites a community's Community Admin. */
export const assignAdminRules = adminContactRules('');

export const updateFeaturesRules = [
  body('features')
    .isArray()
    .withMessage('features must be an array')
    .bail()
    .custom((features) => {
      if (!features.every((item) => typeof item === 'string' && ALLOWED_FEATURES.includes(item))) {
        throw new Error(`Invalid feature in list. Allowed features are: ${ALLOWED_FEATURES.join(', ')}`);
      }
      // Unknown keys used to be accepted silently and grant nothing
      const unknown = features.filter((item) => !ALLOWED_FEATURES.includes(item));
      if (unknown.length > 0) {
        throw new Error(`Unknown feature(s): ${unknown.join(', ')}. Allowed: ${ALLOWED_FEATURES.join(', ')}`);
      }
      return true;
    }),
];

export const updateStatusRules = [
  body('status')
    .isString()
    .withMessage('status must be a string')
    .bail()
    .isIn(['Active', 'Pending', 'Rejected'])
    .withMessage('status must be one of Active, Pending, or Rejected'),
];

export const sendAdminEmailOtpRules = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
];

export const verifyAdminEmailOtpRules = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('code')
    .notEmpty()
    .withMessage('OTP code is required')
    .isString()
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP code must be 6 digits'),
];


export const updateOnboardingModeRules = [
  body('onboardingMode')
    .notEmpty()
    .withMessage('Onboarding mode is required')
    .isString()
    .trim()
    .isIn(['INVITATION', 'ADMIN_ANNOUNCEMENT'])
    .withMessage('Onboarding mode must be one of: INVITATION, ADMIN_ANNOUNCEMENT'),
];

export const updateLoginPolicyRules = [
  body('authenticationMethod')
    .notEmpty()
    .withMessage('Authentication method is required')
    .isString()
    .trim()
    .isIn(['EXISTING_SYSTEM', 'OTP_LOGIN'])
    .withMessage('Authentication method must be one of: EXISTING_SYSTEM, OTP_LOGIN'),
];

