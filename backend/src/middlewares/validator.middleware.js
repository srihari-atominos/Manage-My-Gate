import { validationResult } from 'express-validator';
import HttpError from '../utils/httpError.utils.js';

/**
 * Middleware wrapper to run validation rules and catch errors.
 * @param {Array} validationRules - Array of express-validator chains
 */
export const validate = (validationRules) => {
  return async (req, res, next) => {
    // 1. Run all rules
    await Promise.all(validationRules.map((rule) => rule.run(req)));

    // 2. Check for validation errors
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // 3. Compile errors
    const extractedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    // 4. Pass error to global error handler
    next(new HttpError(400, 'Validation failed. Please correct the invalid fields.', extractedErrors));
  };
};

export default validate;
