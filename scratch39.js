const fs = require('fs');
let lines = fs.readFileSync('backend/tests/phase4.3.real-security.test.mjs', 'utf8').split('\n');

let inTest2 = false;
let inTest4 = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("2. OTP invitation - existing user/phone")) {
    inTest2 = true;
  }
  if (lines[i].includes("3. OTP invitation - new user/email")) {
    inTest2 = false;
  }
  if (lines[i].includes("4. OTP invitation - new user/phone")) {
    inTest4 = true;
  }
  if (lines[i].includes("5. Wrong OTP must actually fail")) {
    inTest4 = false;
  }
  
  if ((inTest2 || inTest4) && lines[i].includes("initiateInvitationOtp(invite.invitationToken)")) {
    lines[i] = lines[i].replace("initiateInvitationOtp(invite.invitationToken)", "initiateInvitationOtp(invite.invitationToken, 'SMS')");
  }
  if ((inTest2 || inTest4) && lines[i].includes("verifyInvitationOtp(invite.invitationToken, plainCode)")) {
    lines[i] = lines[i].replace("verifyInvitationOtp(invite.invitationToken, plainCode)", "verifyInvitationOtp(invite.invitationToken, plainCode, 'SMS')");
  }
}

fs.writeFileSync('backend/tests/phase4.3.real-security.test.mjs', lines.join('\n'));
console.log('Fixed exactly test 2 and 4');
