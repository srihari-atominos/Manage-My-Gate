const fs = require('fs');
const file = 'backend/src/features/auth/auth.services.js';
let content = fs.readFileSync(file, 'utf8');

// For local phone OTP:
content = content.replace(
  "const plainCode = await otpService.createOTP(normalizedPhone, 'LOGIN');",
  "const plainCode = await otpService.createOTP(normalizedPhone, 'LOGIN', 5, null, null, 4);"
);

// For password reset SMS:
content = content.replace(
  "const plainCode = await otpService.createOTP(cleanId, 'RESET');",
  "const length = type === 'SMS' ? 4 : 6;\n    const plainCode = await otpService.createOTP(cleanId, 'RESET', 5, null, null, length);"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed auth.services.js phone OTP length');
