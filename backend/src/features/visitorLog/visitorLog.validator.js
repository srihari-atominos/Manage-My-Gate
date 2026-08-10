import { body } from 'express-validator';

export const preApprovedEntryRules = [
  body('passId')
    .notEmpty()
    .withMessage('Pass ID (passId) is required')
    .isMongoId()
    .withMessage('Pass ID must be a valid Mongo ID'),

  body('guardId')
    .notEmpty()
    .withMessage('Guard ID (guardId) is required')
    .isMongoId()
    .withMessage('Guard ID must be a valid Mongo ID')
];

export const walkInRequestRules = [
  body('orgId')
    .notEmpty()
    .withMessage('Organization ID (orgId) is required')
    .isMongoId()
    .withMessage('Organization ID must be a valid Mongo ID'),

  body('guardId')
    .optional()
    .isMongoId()
    .withMessage('Guard ID must be a valid Mongo ID'),

  body('residentId')
    .optional({ nullable: true, checkFalsy: true })
    .custom((val) => {
      if (val && !/^[0-9a-fA-F]{24}$/.test(val)) {
        throw new Error('Resident ID must be a valid Mongo ID');
      }
      return true;
    }),

  body('snapshot.visitorName')
    .optional()
    .isString()
    .withMessage('Visitor name must be a string')
    .trim(),

  body('snapshot.idProofNumber')
    .optional()
    .isString()
    .withMessage('ID proof number must be a string')
    .trim(),

  body('snapshot.vehicleNumber')
    .optional()
    .isString()
    .withMessage('Vehicle number must be a string')
    .trim()
    .toUpperCase()
];

export const resolveWalkInRules = [
  body('action')
    .notEmpty()
    .withMessage('Action is required')
    .isIn(['APPROVE', 'REJECT'])
    .withMessage('Action must be APPROVE or REJECT')
];
