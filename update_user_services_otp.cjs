const fs = require('fs');
const file = 'backend/src/features/user/user.services.js';
let content = fs.readFileSync(file, 'utf8');

// requestPhoneOtp
content = content.replace(
  "const plainCode = await otpService.createOTP(normalizedPhone, 'VERIFY', 15);",
  "const plainCode = await otpService.createOTP(normalizedPhone, 'VERIFY', 15, null, null, 4);"
);

// requestCurrentContactOtp
content = content.replace(
  "const plainCode = await otpService.createOTP(contact, type, 15);",
  "const length = user.email ? 6 : 4;\n    const plainCode = await otpService.createOTP(contact, type, 15, null, null, length);"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed phone OTP length in user.services.js');
