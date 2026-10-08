const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.listeners.js', 'utf8');
content = content.replace(/    \}\n  \}\n\}\);\n\nauthEvents\.on\('OTP_SENT', sendOtpNotification\);/g, "    }\n  }\n};\n\nauthEvents.on('OTP_SENT', sendOtpNotification);");
fs.writeFileSync('backend/src/features/auth/auth.listeners.js', content);
