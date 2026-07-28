import { body } from 'express-validator';

/**
 * Validation rules for onboarding import file upload.
 */
export const validateImportRules = [
  body().custom((value, { req }) => {
    if (!req.file) {
      throw new Error('File upload is required. Please attach a .csv or .xlsx file.');
    }
    return true;
  }),
];

/**
 * Validation rules for executing final onboarding import.
 */
export const executeImportRules = [
  body('validDataArray')
    .isArray({ min: 1 })
    .withMessage('validDataArray must be a non-empty array of validated records.'),
];

export default {
  validateImportRules,
  executeImportRules,
};
