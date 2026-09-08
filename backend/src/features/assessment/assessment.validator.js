import { body } from 'express-validator';

export const createAssessmentSchema = [
  body('communityId')
    .custom((value, { req }) => {
      const orgId = value || req.headers?.['x-organization-id'] || req.tenant?.orgId;
      if (!orgId) throw new Error('Community ID is required');
      if (!/^[0-9a-fA-F]{24}$/.test(String(orgId))) throw new Error('Community ID must be a valid Mongo ObjectId');
      return true;
    }),

  body('villaId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Villa ID must be a valid Mongo ObjectId'),

  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isString()
    .withMessage('Name must be a string')
    .trim(),

  body('type')
    .notEmpty()
    .withMessage('Type is required')
    .isIn(['RECURRING', 'ONE_TIME', 'CAPITAL_REPAIR'])
    .withMessage('Type must be RECURRING, ONE_TIME, or CAPITAL_REPAIR'),

  body('billingCycle')
    .notEmpty()
    .withMessage('Billing cycle is required')
    .isIn(['MONTHLY', 'QUARTERLY', 'ANNUALLY', 'WEEKLY', 'AD_HOC'])
    .withMessage('Billing cycle must be MONTHLY, QUARTERLY, ANNUALLY, WEEKLY, or AD_HOC'),

  body('generationDay')
    .optional({ nullable: true })
    .custom((value, { req }) => {
      if (req.body?.billingCycle === 'WEEKLY') {
        if (value === undefined || value === null) return true;
        const num = Number(value);
        if (Number.isInteger(num) && num >= 0 && num <= 6) return true;
        throw new Error('For weekly billing, generation day must be an integer between 0 (Sunday) and 6 (Saturday)');
      }
      if (value === 'LAST_DAY_OF_MONTH') return true;
      const num = Number(value);
      if (Number.isInteger(num) && num >= 1 && num <= 28) return true;
      throw new Error("Generation day must be an integer between 1 and 28 or 'LAST_DAY_OF_MONTH'");
    }),

  body('selectedDays')
    .optional()
    .isArray()
    .withMessage('Selected days must be an array of day-of-week integers (0-6)'),

  body('selectedDays.*')
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage('Each selected day must be an integer between 0 and 6'),

  body('targetScope.type')
    .notEmpty()
    .withMessage('Target scope type is required')
    .isIn(['ALL_COMMUNITY', 'VILLA_BLOCK', 'UNIT_TYPE', 'SPECIFIC_UNITS', 'SPECIFIC_USERS'])
    .withMessage('Invalid target scope type'),

  body('targetScope.scopeIds')
    .optional()
    .isArray()
    .withMessage('Scope IDs must be an array'),

  body('targetScope.scopeIds.*')
    .custom((value, { req }) => {
      const type = req.body?.targetScope?.type;
      if (type === 'SPECIFIC_UNITS' || type === 'SPECIFIC_USERS') {
        if (!/^[0-9a-fA-F]{24}$/.test(value)) {
          throw new Error('Each Scope ID must be a valid Mongo ObjectId');
        }
      }
      return true;
    }),

  body('targetScope.targetRoleIds')
    .optional()
    .isArray()
    .withMessage('Target Role IDs must be an array'),

  body('targetScope.targetRoleIds.*')
    .isMongoId()
    .withMessage('Each Target Role ID must be a valid Mongo ObjectId'),

  body('calculationMethod.type')
    .notEmpty()
    .withMessage('Calculation method type is required')
    .isIn(['FLAT_RATE', 'PER_SQ_FT', 'TIERED_BHK'])
    .withMessage('Invalid calculation method type'),

  body('calculationMethod.flatAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Flat amount must be a non-negative number'),

  body('calculationMethod.ratePerSqFt')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Rate per square foot must be a non-negative number'),

  body('calculationMethod.tieredRates')
    .optional()
    .custom((tieredRates, { req }) => {
      if (typeof tieredRates !== 'object' || tieredRates === null) {
        throw new Error('Tiered rates must be an object');
      }
      const allowedKeys = ['studio', 'bhk1', 'bhk2', 'bhk3', 'bhk4', 'penthouse', 'duplex'];
      for (const [key, value] of Object.entries(tieredRates)) {
        if (!allowedKeys.includes(key)) {
          throw new Error(`Invalid building layout type '${key}'. Allowed types are: ${allowedKeys.join(', ')}`);
        }
        const num = Number(value);
        if (typeof value === 'boolean' || isNaN(num) || !Number.isFinite(num) || num < 0) {
          throw new Error(`Rate for layout '${key}' must be a valid non-negative number. Words and letters are not allowed.`);
        }
      }
      if (req.body?.calculationMethod?.type === 'TIERED_BHK') {
        const values = Object.values(tieredRates).map(Number);
        const hasPositiveRate = values.some((v) => v > 0);
        if (!hasPositiveRate) {
          throw new Error('For tiered BHK calculation, at least one building layout rate must be greater than 0');
        }
      }
      return true;
    }),
];

export const updateAssessmentSchema = [
  body('name')
    .optional()
    .isString()
    .withMessage('Name must be a string')
    .trim(),

  body('type')
    .optional()
    .isIn(['RECURRING', 'ONE_TIME', 'CAPITAL_REPAIR'])
    .withMessage('Type must be RECURRING, ONE_TIME, or CAPITAL_REPAIR'),

  body('billingCycle')
    .optional()
    .isIn(['MONTHLY', 'QUARTERLY', 'ANNUALLY', 'WEEKLY', 'AD_HOC'])
    .withMessage('Billing cycle must be MONTHLY, QUARTERLY, ANNUALLY, WEEKLY, or AD_HOC'),

  body('generationDay')
    .optional({ nullable: true })
    .custom((value, { req }) => {
      if (req.body?.billingCycle === 'WEEKLY') {
        if (value === undefined || value === null) return true;
        const num = Number(value);
        if (Number.isInteger(num) && num >= 0 && num <= 6) return true;
        throw new Error('For weekly billing, generation day must be an integer between 0 (Sunday) and 6 (Saturday)');
      }
      if (value === 'LAST_DAY_OF_MONTH') return true;
      const num = Number(value);
      if (Number.isInteger(num) && num >= 1 && num <= 28) return true;
      throw new Error("Generation day must be an integer between 1 and 28 or 'LAST_DAY_OF_MONTH'");
    }),

  body('selectedDays')
    .optional()
    .isArray()
    .withMessage('Selected days must be an array of day-of-week integers (0-6)'),

  body('selectedDays.*')
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage('Each selected day must be an integer between 0 and 6'),

  body('triggerMode')
    .optional()
    .isIn(['IMMEDIATE', 'SCHEDULED'])
    .withMessage('Trigger mode must be IMMEDIATE or SCHEDULED'),

  body('scheduledDateTime')
    .optional({ nullable: true }),

  body('collectionMethod')
    .optional()
    .isIn(['LUMP_SUM', 'INSTALLMENT'])
    .withMessage('Collection method must be LUMP_SUM or INSTALLMENT'),

  body('totalInstallments')
    .optional()
    .isNumeric()
    .withMessage('Total installments must be a number'),

  body('targetScope.type')
    .optional()
    .isIn(['ALL_COMMUNITY', 'VILLA_BLOCK', 'UNIT_TYPE', 'SPECIFIC_UNITS', 'SPECIFIC_USERS'])
    .withMessage('Invalid target scope type'),

  body('targetScope.scopeIds')
    .optional()
    .isArray(),

  body('targetScope.scopeIds.*')
    .optional()
    .custom((value, { req }) => {
      const type = req.body?.targetScope?.type;
      if (type === 'SPECIFIC_UNITS' || type === 'SPECIFIC_USERS') {
        if (!/^[0-9a-fA-F]{24}$/.test(value)) {
          throw new Error('Each Scope ID must be a valid Mongo ObjectId');
        }
      }
      return true;
    }),

  body('targetScope.targetRole')
    .optional()
    .isIn(['TENANT', 'OWNER', 'BOTH'])
    .withMessage('Target role must be TENANT, OWNER, or BOTH'),

  body('targetScope.targetRoleIds')
    .optional()
    .isArray()
    .withMessage('Target Role IDs must be an array'),

  body('targetScope.targetRoleIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each Target Role ID must be a valid Mongo ObjectId'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  body('calculationMethod.type')
    .optional()
    .isIn(['FLAT_RATE', 'PER_SQ_FT', 'TIERED_BHK'])
    .withMessage('Invalid calculation method type'),

  body('calculationMethod.flatAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Flat amount must be a non-negative number'),

  body('calculationMethod.ratePerSqFt')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Rate per square foot must be a non-negative number'),

  body('calculationMethod.tieredRates')
    .optional()
    .custom((tieredRates, { req }) => {
      if (typeof tieredRates !== 'object' || tieredRates === null) {
        throw new Error('Tiered rates must be an object');
      }
      const allowedKeys = ['studio', 'bhk1', 'bhk2', 'bhk3', 'bhk4', 'penthouse', 'duplex'];
      for (const [key, value] of Object.entries(tieredRates)) {
        if (!allowedKeys.includes(key)) {
          throw new Error(`Invalid building layout type '${key}'. Allowed types are: ${allowedKeys.join(', ')}`);
        }
        const num = Number(value);
        if (typeof value === 'boolean' || isNaN(num) || !Number.isFinite(num) || num < 0) {
          throw new Error(`Rate for layout '${key}' must be a valid non-negative number. Words and letters are not allowed.`);
        }
      }
      return true;
    }),
];
