import { body } from 'express-validator';

export const createVillaRules = [
  body('unitNumber')
    .notEmpty()
    .withMessage('Unit number is required')
    .isString()
    .withMessage('Unit number must be a string')
    .trim(),
  body('blockOrBuilding')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Block or building must be a string')
    .trim(),
  body('type')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Studio', 'Apartment', 'Villa', 'Penthouse'])
    .withMessage('Type must be one of: Studio, Apartment, Villa, Penthouse'),
  body('status')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Vacant', 'Occupied', 'Under Maintenance'])
    .withMessage('Status must be one of: Vacant, Occupied, Under Maintenance'),
  body('primaryResidentId')
    .optional({ nullable: true })
    .custom((val) => {
      if (val === null || val === '') return true;
      const regex = /^[0-9a-fA-F]{24}$/;
      return regex.test(val);
    })
    .withMessage('Primary resident ID must be a valid Mongo ID'),
  body('floorAreaSqFt')
    .optional({ nullable: true, checkFalsy: true })
    .isNumeric()
    .withMessage('Floor area must be a number'),
];

export const updateVillaRules = [
  body('unitNumber')
    .optional()
    .isString()
    .withMessage('Unit number must be a string')
    .trim()
    .notEmpty()
    .withMessage('Unit number cannot be empty'),
  body('blockOrBuilding')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Block or building must be a string')
    .trim(),
  body('type')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Studio', 'Apartment', 'Villa', 'Penthouse'])
    .withMessage('Type must be one of: Studio, Apartment, Villa, Penthouse'),
  body('status')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Vacant', 'Occupied', 'Under Maintenance'])
    .withMessage('Status must be one of: Vacant, Occupied, Under Maintenance'),
  body('primaryResidentId')
    .optional({ nullable: true })
    .custom((val) => {
      if (val === null || val === '') return true;
      const regex = /^[0-9a-fA-F]{24}$/;
      return regex.test(val);
    })
    .withMessage('Primary resident ID must be a valid Mongo ID'),
  body('floorAreaSqFt')
    .optional({ nullable: true, checkFalsy: true })
    .isNumeric()
    .withMessage('Floor area must be a number'),
];

export const batchGenerateRules = [
  body('startNumber')
    .notEmpty()
    .withMessage('Start number is required')
    .isInt({ min: 1 })
    .withMessage('Start number must be a positive integer'),
  body('endNumber')
    .notEmpty()
    .withMessage('End number is required')
    .isInt({ min: 1 })
    .withMessage('End number must be a positive integer'),
  body('prefix')
    .optional()
    .isString()
    .withMessage('Prefix must be a string')
    .trim(),
  body('config')
    .optional()
    .isObject()
    .withMessage('Config must be an object'),
];

export const bulkUploadVillasRules = [
  body('villas')
    .isArray({ min: 1 })
    .withMessage('villas must be a non-empty array'),
  body('villas.*.unitNumber')
    .notEmpty()
    .withMessage('Unit number is required')
    .isString()
    .trim(),
  body('villas.*.blockOrBuilding')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim(),
  body('villas.*.type')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Studio', 'Apartment', 'Villa', 'Penthouse'])
    .withMessage('Type must be one of: Studio, Apartment, Villa, Penthouse'),
  body('villas.*.status')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Vacant', 'Occupied', 'Under Maintenance'])
    .withMessage('Status must be one of: Vacant, Occupied, Under Maintenance'),
  body('villas.*.floorAreaSqFt')
    .optional({ nullable: true, checkFalsy: true })
    .isNumeric()
    .withMessage('Floor area must be a number'),
  body('villas.*.email')
    .optional()
    .custom((val) => {
      if (val === undefined || val === null || val === '') return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    })
    .withMessage('Please provide a valid email address')
    .trim(),
  body('villas.*.residentType')
    .optional()
    .isIn(['Owner', 'Tenant', 'Family', 'Guest', 'None'])
    .withMessage('Resident type must be one of: Owner, Tenant, Family, Guest, None'),
  body('villas.*.roleName')
    .optional()
    .isString()
    .trim(),
];

export const assignExistingUserRules = [
  body('userId')
    .notEmpty()
    .withMessage('User ID (userId) is required')
    .isMongoId()
    .withMessage('User ID must be a valid Mongo ID'),
  body('residencyType')
    .notEmpty()
    .withMessage('Residency type (residencyType) is required')
    .isIn(['Resident Owner', 'Tenant', 'Family Member', 'Non-Resident Owner', 'Staff'])
    .withMessage('Residency type must be one of: Resident Owner, Tenant, Family Member, Non-Resident Owner, Staff'),
];

export const updateResidencyTypeRules = [
  body('residencyType')
    .notEmpty()
    .withMessage('Residency type (residencyType) is required')
    .isIn(['Resident Owner', 'Tenant', 'Family Member', 'Non-Resident Owner', 'Staff'])
    .withMessage('Residency type must be one of: Resident Owner, Tenant, Family Member, Non-Resident Owner, Staff'),
];

export default {
  createVillaRules,
  updateVillaRules,
  batchGenerateRules,
  bulkUploadVillasRules,
  assignExistingUserRules,
  updateResidencyTypeRules,
};
