const fs = require('fs');

// 1. Update auth.services.js
let authServices = fs.readFileSync('backend/src/features/auth/auth.services.js', 'utf8');

authServices = authServices.replace(
  /async initiateInvitationOtp\(token\)\s*\{([\s\S]*?)const \{ normalizePhone \}/,
  `async initiateInvitationOtp(token, preferredMethod = null) {$1const { normalizePhone }`
);

authServices = authServices.replace(
  /async verifyInvitationOtp\(token, code, deviceInfo = \{\}\)\s*\{([\s\S]*?)const \{ normalizePhone \}/,
  `async verifyInvitationOtp(token, code, preferredMethod = null, deviceInfo = {}) {$1const { normalizePhone }`
);

authServices = authServices.replace(
  /let isPhone = false;[\s\S]*?if \(!identifier\)/g,
  `let isPhone = false;
    let identifier = null;
    
    if (preferredMethod === 'SMS' && inviteInfo.phone && String(inviteInfo.phone).trim().length > 0) {
      identifier = String(inviteInfo.phone).trim();
      isPhone = true;
    } else if (preferredMethod === 'EMAIL' && inviteInfo.email && inviteInfo.email.trim().length > 0 && !inviteInfo.email.includes('@noemail.local')) {
      identifier = inviteInfo.email.trim();
      isPhone = false;
    } else {
      if (inviteInfo.email && inviteInfo.email.trim().length > 0 && !inviteInfo.email.includes('@noemail.local')) {
        identifier = inviteInfo.email.trim();
        isPhone = false;
      } else if (inviteInfo.phone && String(inviteInfo.phone).trim().length > 0) {
        identifier = String(inviteInfo.phone).trim();
        isPhone = true;
      }
    }
    
    if (!identifier)`
);

fs.writeFileSync('backend/src/features/auth/auth.services.js', authServices);
console.log('Updated auth.services.js');

// 2. Update phase4.3.real-security.test.mjs
let testFile = fs.readFileSync('backend/tests/phase4.3.real-security.test.mjs', 'utf8');

testFile = testFile.replace(
  /authService\.initiateInvitationOtp\(invite\.invitationToken\);/g,
  "authService.initiateInvitationOtp(invite.invitationToken, 'SMS');"
);
// Wait, replacing ALL of them to SMS breaks email tests!
// Let's only replace the ones in Test 2 and Test 4.
