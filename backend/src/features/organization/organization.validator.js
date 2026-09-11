import { body, query } from 'express-validator';

const ALLOWED_FEATURES = [
  'users',
  'roles',
  'integrations',
  'villas',
  'amenities',
  'notices',
  'complaints',
  'visitor',
  'billing',
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
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Organization name must be between 3 and 100 characters')
    .matches(ORG_NAME_REGEX)
    .withMessage('Organization name contains invalid characters'),
];

export const setupWorkspaceRules = [
  body('name')
    .notEmpty()
    .withMessage('Organization name is required')
    .isString()
    .withMessage('Organization name must be a string')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Organization name must be between 3 and 100 characters')
    .matches(ORG_NAME_REGEX)
    .withMessage('Organization name contains invalid characters'),

  body('organizationType')
    .optional()
    .isString()
    .withMessage('Organization type must be a string')
    .trim()
    .isIn(ALLOWED_ORG_TYPES)
    .withMessage(`Organization type must be one of: ${ALLOWED_ORG_TYPES.join(', ')}`),

  body('timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a string')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Timezone must not exceed 50 characters'),

  body('contactEmail')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Contact email must be a valid email address')
    .normalizeEmail(),

  body('contactPhone')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Contact phone must be a string')
    .trim()
    .matches(/^[+0-9\s\-()]{7,25}$/)
    .withMessage('Contact phone must be a valid phone number (7-25 digits/symbols)'),

  body('expectedMemberCount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Expected member count must be an integer of at least 1')
    .toInt(),

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

  body('password')
    .optional()
    .isString()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),

  // Sanitizer: Disallow client manipulation of protected tenant and identity fields
  body(['userId', 'creatorId', 'orgId', 'status', 'isPlatform', 'role', 'roleIds', 'permissions'])
    .customSanitizer(() => undefined),
];

export const updateFeaturesRules = [
  body('features')
    .isArray()
    .withMessage('features must be an array')
    .bail()
    .custom((value) => {
      if (!value.every((item) => typeof item === 'string')) {
        throw new Error('All features must be strings');
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
