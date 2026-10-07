const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.services.js', 'utf8');

// Ensure import exists
if (!content.includes("import { sendOtpNotification }")) {
  content = content.replace(/import jwt from 'jsonwebtoken';/, "import jwt from 'jsonwebtoken';\nimport { sendOtpNotification } from './auth.listeners.js';");
}

const search = /authEvents\.emit\('OTP_SENT',\s*(\{[\s\S]*?\})\);/g;
content = content.replace(search, (fullMatch, p1) => {
  return `sendOtpNotification(${p1}).catch(err => logger.error('Failed to send OTP:' + err.message));`;
});

// Remove Dev Code exposure
content = content.replace(/\?.*\(Dev Code: \$\{plainCode\}\).*:\s*('[^']+')/g, "$1");
content = content.replace(/,\s*\.\.\.\(isDev\s*&&\s*\{\s*devCode:\s*plainCode\s*\}\)/g, "");
content = content.replace(/console\.log\('\\n========================================='\);[\s\n]*console\.log\(`\[DEV MODE.*?\] OTP for .*? is: \$\{plainCode\}`\);[\s\n]*console\.log\('=========================================\\n'\);/g, "");

fs.writeFileSync('backend/src/features/auth/auth.services.js', content);
console.log("Fixed leakage.");
