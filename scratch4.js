const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.router.js', 'utf8');

content = content.replace('emailOtpLoginRules,', 'inviteOtpInitiateRules,\n  inviteOtpVerifyRules,\n  emailOtpLoginRules,');
fs.writeFileSync('backend/src/features/auth/auth.router.js', content);
