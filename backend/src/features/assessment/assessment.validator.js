import { body } from 'express-validator';

export const createAssessmentSchema = [
  body('communityId')
    .notEmpty()
    .withMessage('Community ID is required')
    .isMongoId()
    .withMessage('Community ID must be a valid Mongo ObjectId'),

  body('villaId')
    .notEmpty()
    .withMessage('Villa ID is required')
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
    .isIn(['MONTHLY', 'QUARTERLY', 'ANNUALLY', 'AD_HOC'])
    .withMessage('Billing cycle must be MONTHLY, QUARTERLY, ANNUALLY, or AD_HOC'),

  body('generationDay')
    .notEmpty()
    .withMessage('Generation day is required')
    .custom((value) => {
      if (value === 'LAST_DAY_OF_MONTH') return true;
      const num = Number(value);
      if (Number.isInteger(num) && num >= 1 && num <= 28) return true;
      throw new Error("Generation day must be an integer between 1 and 28 or 'LAST_DAY_OF_MONTH'");
    }),

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
    .isMongoId()
    .withMessage('Each Scope ID must be a valid Mongo ObjectId'),

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
    .isNumeric()
    .withMessage('Flat amount must be a number'),

  body('calculationMethod.ratePerSqFt')
    .optional()
    .isNumeric()
    .withMessage('Rate per square foot must be a number'),

  body('calculationMethod.tieredRates')
    .optional()
    .isObject()
    .withMessage('Tiered rates must be an object'),
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
    .isIn(['MONTHLY', 'QUARTERLY', 'ANNUALLY', 'AD_HOC'])
    .withMessage('Billing cycle must be MONTHLY, QUARTERLY, ANNUALLY, or AD_HOC'),

  body('generationDay')
    .optional()
    .custom((value) => {
      if (value === 'LAST_DAY_OF_MONTH') return true;
      const num = Number(value);
      if (Number.isInteger(num) && num >= 1 && num <= 28) return true;
      throw new Error("Generation day must be an integer between 1 and 28 or 'LAST_DAY_OF_MONTH'");
    }),

  body('targetScope.type')
    .optional()
    .isIn(['ALL_COMMUNITY', 'VILLA_BLOCK', 'UNIT_TYPE', 'SPECIFIC_UNITS', 'SPECIFIC_USERS'])
    .withMessage('Invalid target scope type'),

  body('targetScope.scopeIds')
    .optional()
    .isArray(),

  body('targetScope.scopeIds.*')
    .optional()
    .isMongoId(),

  body('calculationMethod.type')
    .optional()
    .isIn(['FLAT_RATE', 'PER_SQ_FT', 'TIERED_BHK']),
];
