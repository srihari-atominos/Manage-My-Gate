const fs = require('fs');
let content = fs.readFileSync('backend/tests/phase4.3.real-security.test.mjs', 'utf8');

content = content.replace(/authenticationMethod: 'EXISTING_SYSTEM' }/g, "authenticationMethod: 'EXISTING_SYSTEM', organizationType: 'Gated Community' }");
content = content.replace(/authenticationMethod: 'OTP_LOGIN' }/g, "authenticationMethod: 'OTP_LOGIN', organizationType: 'Gated Community' }");

fs.writeFileSync('backend/tests/phase4.3.real-security.test.mjs', content);
