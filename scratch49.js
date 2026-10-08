const fs = require('fs');

function robustUpdate() {
  // 1. Fix auth.services.js
  let lines = fs.readFileSync('backend/src/features/auth/auth.services.js', 'utf8').split(/\r?\n/);
  
  // Format user fix
  const formatIdx = lines.findIndex(l => l.includes('_formatAuthUser('));
  if (formatIdx !== -1) {
    let emailIdx = lines.findIndex((l, i) => i > formatIdx && l.includes('email: user.email'));
    if (emailIdx !== -1 && !lines[emailIdx+1].includes('status: user.status')) {
      lines.splice(emailIdx + 1, 0, '      status: user.status,');
    }
  }

  // Accept invitation parameter fix
  const verifyStart = lines.findIndex(l => l.includes('async verifyInvitationOtp('));
  if (verifyStart !== -1) {
    const acceptCallIdx = lines.findIndex((l, i) => i > verifyStart && i < verifyStart + 60 && l.includes('const data = await this.acceptInvitation('));
    if (acceptCallIdx !== -1) {
      lines[acceptCallIdx] = lines[acceptCallIdx].replace(
        /const data = await this\.acceptInvitation\(token,\s*null,\s*finalIdentifier,\s*null,\s*\{\},\s*true\);/,
        "const data = await this.acceptInvitation(token, null, isPhone ? null : finalIdentifier, null, {}, true);"
      );
    }
  }
  
  fs.writeFileSync('backend/src/features/auth/auth.services.js', lines.join('\n'));
  console.log('Fixed auth.services.js');

  // 2. Fix tests file
  let testLines = fs.readFileSync('backend/tests/phase4.3.real-security.test.mjs', 'utf8').split(/\r?\n/);
  
  let inTest2 = false;
  let inTest4 = false;
  
  for (let i = 0; i < testLines.length; i++) {
    if (testLines[i].includes('2. OTP invitation - existing user/phone')) inTest2 = true;
    if (testLines[i].includes('3. OTP invitation - new user/email')) inTest2 = false;
    if (testLines[i].includes('4. OTP invitation - new user/phone')) inTest4 = true;
    if (testLines[i].includes('5. Wrong OTP must actually fail')) inTest4 = false;
    
    if (inTest2 || inTest4) {
      if (testLines[i].includes('authService.initiateInvitationOtp(invite.invitationToken)') && !testLines[i].includes("'SMS'")) {
        testLines[i] = testLines[i].replace('authService.initiateInvitationOtp(invite.invitationToken)', "authService.initiateInvitationOtp(invite.invitationToken, 'SMS')");
      }
      if (testLines[i].includes('authService.verifyInvitationOtp(invite.invitationToken, plainCode)') && !testLines[i].includes("'SMS'")) {
        testLines[i] = testLines[i].replace('authService.verifyInvitationOtp(invite.invitationToken, plainCode)', "authService.verifyInvitationOtp(invite.invitationToken, plainCode, 'SMS')");
      }
    }
  }
  
  fs.writeFileSync('backend/tests/phase4.3.real-security.test.mjs', testLines.join('\n'));
  console.log('Fixed test file');
}

robustUpdate();
