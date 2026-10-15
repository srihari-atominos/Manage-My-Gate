const fs = require('fs');
let content = fs.readFileSync('backend/tests/phase4.3.real-security.test.mjs', 'utf8');

// Test 2
content = content.replace(
  "const initRes = await authService.initiateInvitationOtp(invite.invitationToken);",
  "const initRes = await authService.initiateInvitationOtp(invite.invitationToken, 'SMS');"
);

content = content.replace(
  "const verifyRes = await authService.verifyInvitationOtp(invite.invitationToken, plainCode);",
  "const verifyRes = await authService.verifyInvitationOtp(invite.invitationToken, plainCode, 'SMS');"
);

fs.writeFileSync('backend/tests/phase4.3.real-security.test.mjs', content);
console.log('Fixed tests explicitly');
