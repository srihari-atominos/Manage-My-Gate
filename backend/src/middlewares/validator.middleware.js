import { validationResult } from 'express-validator';
import HttpError from '../utils/httpError.utils.js';
import fs from 'fs';
import logger from '../utils/logger.utils.js';

// Never write credentials, codes or tokens to logs
const SENSITIVE_KEYS = /pass(word)?|code|otp|token|ticket|secret|credential/i;
const redact = (value) => {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, SENSITIVE_KEYS.test(k) ? '[REDACTED]' : redact(v)])
    );
  }
  return value;
};
const redactErrors = (errors) =>
  errors.map((e) => (SENSITIVE_KEYS.test(String(e.field || '')) ? { ...e, value: '[REDACTED]' } : e));

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

    // Clean up uploaded file if validation failed
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file after validation failure:', err);
      });
    }

    // 3. Compile errors
    const extractedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    const safeBody = redact(req.body);
    const safeErrors = redactErrors(extractedErrors);
    console.error('*** EXPRESS VALIDATOR ERROR ***');
    console.error('Req Body:', JSON.stringify(safeBody, null, 2));
    console.error('Errors:', JSON.stringify(safeErrors, null, 2));
    console.error('*********************************');

    try {
      fs.appendFileSync('validation_errors.log', new Date().toISOString() + '\\nReq Body: ' + JSON.stringify(safeBody) + '\\nErrors: ' + JSON.stringify(safeErrors, null, 2) + '\\n\\n');
    } catch(e) {}

    logger.error('Validation errors: ' + JSON.stringify(safeErrors, null, 2));

    // 4. Pass error to global error handler
    next(new HttpError(400, 'Validation failed. Please correct the invalid fields.', safeErrors));
  };
};

export default validate;
