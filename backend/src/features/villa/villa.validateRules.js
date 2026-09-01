import { body } from 'express-validator';

export const createVillaRules = [
  body('unitNumber')
    .notEmpty()
    .withMessage('Unit number is required')
    .isString()
    .withMessage('Unit number must be a string')
    .trim()
    .escape(),
  body('blockOrBuilding')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Block or building must be a string')
    .trim()
    .escape(),
  body('floor')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Floor must be a string')
    .trim()
    .escape(),
  body('type')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Studio', 'Apartment', 'Villa', 'Penthouse', 'BHK1', 'BHK2', 'BHK3', 'BHK4', 'Duplex', '1BHA', '2BHA', '3BHA'])
    .withMessage('Type must be a valid unit type'),
  body('status')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Vacant', 'Occupied', 'Under Maintenance', 'Under Renovation', 'For Sale', 'For Rent', 'Reserved', 'Inactive'])
    .withMessage('Status must be a valid unit status'),
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
    .escape()
    .notEmpty()
    .withMessage('Unit number cannot be empty'),
  body('blockOrBuilding')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Block or building must be a string')
    .trim()
    .escape(),
  body('floor')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Floor must be a string')
    .trim()
    .escape(),
  body('type')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Studio', 'Apartment', 'Villa', 'Penthouse', 'BHK1', 'BHK2', 'BHK3', 'BHK4', 'Duplex', '1BHA', '2BHA', '3BHA'])
    .withMessage('Type must be a valid unit type'),
  body('status')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Vacant', 'Occupied', 'Under Maintenance', 'Under Renovation', 'For Sale', 'For Rent', 'Reserved', 'Inactive'])
    .withMessage('Status must be a valid unit status'),
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
    .custom((val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 1;
    })
    .withMessage('Start number must be a positive integer'),
  body('endNumber')
    .notEmpty()
    .withMessage('End number is required')
    .custom((val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 1;
    })
    .withMessage('End number must be a positive integer'),
  body('prefix')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Prefix must be a string')
    .trim()
    .escape(),
  body('config')
    .optional({ nullable: true, checkFalsy: true })
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
    .trim()
    .escape(),
  body('villas.*.blockOrBuilding')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .escape(),
  body('villas.*.type')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['1BHA', '2BHA', '3BHA', '4BHA', 'Villa', 'Studio', 'Apartment', 'Penthouse', 'BHK1', 'BHK2', 'BHK3', 'BHK4', '1 BHK', '2 BHK', '3 BHK', '4 BHK', '1BHK', '2BHK', '3BHK', '4BHK', 'Duplex'])
    .withMessage('Type must be a valid unit type (e.g., Apartment, Villa, Studio, Penthouse, 1 BHK, 2 BHK, 3 BHK, 4 BHK, Duplex)'),
  body('villas.*.status')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Occupied', 'Vacant', 'Under Maintenance', 'occupied', 'vacant', 'under maintenance'])
    .withMessage('Status must be Vacant, Occupied, or Under Maintenance'),
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
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Family Member', 'Resident Owner', 'Tenant', 'Owner', 'Family'])
    .withMessage('Resident type must be Tenant, Resident Owner, or Family Member'),
];

export const assignExistingUserRules = [
  body('userId')
    .notEmpty()
    .withMessage('User ID (userId) is required')
    .custom((val) => {
      return (typeof val === 'string' && val.trim().length > 0) || typeof val === 'object';
    })
    .withMessage('User ID must be a valid identifier'),
  body('residencyType')
    .notEmpty()
    .withMessage('Residency type (residencyType) is required')
    .isString()
    .withMessage('Residency type must be a string')
    .trim()
    .escape(),
];

export const updateResidencyTypeRules = [
  body('residencyType')
    .notEmpty()
    .withMessage('Residency type (residencyType) is required')
    .isString()
    .withMessage('Residency type must be a string')
    .trim()
    .escape(),
];

export default {
  createVillaRules,
  updateVillaRules,
  batchGenerateRules,
  bulkUploadVillasRules,
  assignExistingUserRules,
  updateResidencyTypeRules,
};
