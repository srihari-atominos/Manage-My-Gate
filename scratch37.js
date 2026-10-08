const fs = require('fs');

let testFile = fs.readFileSync('backend/tests/phase4.3.real-security.test.mjs', 'utf8');

testFile = testFile.replace(
  /it\('2\. OTP invitation - existing user\/phone', async \(\) => \{([\s\S]*?)const initRes = await authService\.initiateInvitationOtp\(invite\.invitationToken\);([\s\S]*?)const verifyRes = await authService\.verifyInvitationOtp\(invite\.invitationToken, plainCode\);/g,
  `it('2. OTP invitation - existing user/phone', async () => {$1const initRes = await authService.initiateInvitationOtp(invite.invitationToken, 'SMS');$2const verifyRes = await authService.verifyInvitationOtp(invite.invitationToken, plainCode, 'SMS');`
);

testFile = testFile.replace(
  /it\('4\. OTP invitation - new user\/phone', async \(\) => \{([\s\S]*?)const initRes = await authService\.initiateInvitationOtp\(invite\.invitationToken\);([\s\S]*?)const verifyRes = await authService\.verifyInvitationOtp\(invite\.invitationToken, plainCode\);/g,
  `it('4. OTP invitation - new user/phone', async () => {$1const initRes = await authService.initiateInvitationOtp(invite.invitationToken, 'SMS');$2const verifyRes = await authService.verifyInvitationOtp(invite.invitationToken, plainCode, 'SMS');`
);

fs.writeFileSync('backend/tests/phase4.3.real-security.test.mjs', testFile);
console.log('Updated test file');
