const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.validateRules.js', 'utf8');

const newRules = `
export const inviteOtpInitiateRules = [
  body('token')
    .notEmpty()
    .withMessage('Invitation token is required')
    .isString()
    .withMessage('Invitation token must be a string')
    .trim(),
];

export const inviteOtpVerifyRules = [
  body('token')
    .notEmpty()
    .withMessage('Invitation token is required')
    .isString()
    .withMessage('Invitation token must be a string')
    .trim(),
  body('code')
    .notEmpty()
    .withMessage('Verification code is required')
    .isString()
    .withMessage('Verification code must be a string')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification code must be exactly 6 digits')
    .isNumeric()
    .withMessage('Verification code must contain only numbers'),
];

`;

content += newRules;
fs.writeFileSync('backend/src/features/auth/auth.validateRules.js', content);
