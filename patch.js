const fs = require('fs');
const file = 'd:/atominos/GatedCommunity/backend/src/features/auth/auth.validateRules.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/export const setupAccountPasswordRules = \[[\s\S]*?\];\n\n/g, '');
content = content.replace(/\/\*\*[\s\S]*?export const loginRules = \[[\s\S]*?\];\n\n/g, '');
content = content.replace(/\/\*\*[\s\S]*?export const acceptInviteRules = \[[\s\S]*?\];\n\n/g, '');
content = content.replace(/\/\*\*[\s\S]*?export const forgotPasswordRules = \[[\s\S]*?\];\n\n/g, '');
content = content.replace(/\/\*\*[\s\S]*?export const verifyResetPasswordOtpRules = \[[\s\S]*?\];\n\n/g, '');
content = content.replace(/\/\*\*[\s\S]*?export const resetPasswordRules = \[[\s\S]*?\];\n\n/g, '');
content = content.replace(/\/\*\*[\s\S]*?export const acceptInviteSsoRules = \[[\s\S]*?\];\n\n/g, '');

content = content.replace(/export const phoneVerifyRules = \[[\s\S]*?\];/g, match => {
  return match.replace(/\];$/, "  body('inviteToken').optional({ nullable: true }).isString().trim(),\n];");
});
content = content.replace(/export const emailOtpVerifyRules = \[[\s\S]*?\];/g, match => {
  return match.replace(/\];$/, "  body('inviteToken').optional({ nullable: true }).isString().trim(),\n];");
});

fs.writeFileSync(file, content);
