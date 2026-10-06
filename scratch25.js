const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.listeners.js', 'utf8');

const regex = /\}\);\s*authEvents\.on\('OTP_SENT', sendOtpNotification\);/g;
content = content.replace(regex, "};\n\nauthEvents.on('OTP_SENT', sendOtpNotification);");

fs.writeFileSync('backend/src/features/auth/auth.listeners.js', content);
