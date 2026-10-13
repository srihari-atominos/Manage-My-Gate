const fs = require('fs');
const file = 'backend/src/features/otp/otp.services.js';
let content = fs.readFileSync(file, 'utf8');

// Update generateCode
content = content.replace(
  /generateCode\(\) \{\s*return crypto\.randomInt\(100000, 999999\)\.toString\(\);\s*\}/,
  `generateCode(length = 6) {\n    const min = Math.pow(10, length - 1);\n    const max = Math.pow(10, length) - 1;\n    return crypto.randomInt(min, max).toString();\n  }`
);

// Update createOTP signature and generateCode call
content = content.replace(
  /async createOTP\(identifier, type, validityMinutes = 5, session = null, sessionInfo = null\) \{/,
  `async createOTP(identifier, type, validityMinutes = 5, session = null, sessionInfo = null, length = 6) {`
);

content = content.replace(
  /let plainCode = this\.generateCode\(\);/,
  `let plainCode = this.generateCode(length);`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed OTP length support');
