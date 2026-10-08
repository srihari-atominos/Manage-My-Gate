const fs = require('fs');
let lines = fs.readFileSync('backend/src/features/auth/auth.services.js', 'utf8').split('\n');

const verifyStart = lines.findIndex(l => l.includes('async verifyInvitationOtp('));
for (let i = verifyStart; i < verifyStart + 60; i++) {
  if (lines[i].includes("const data = await this.acceptInvitation(token, null, finalIdentifier, null, {}, true);")) {
    lines[i] = lines[i].replace(
      "const data = await this.acceptInvitation(token, null, finalIdentifier, null, {}, true);",
      "const data = await this.acceptInvitation(token, null, isPhone ? null : finalIdentifier, null, {}, true);"
    );
    break;
  }
}

fs.writeFileSync('backend/src/features/auth/auth.services.js', lines.join('\n'));
console.log('Fixed acceptInvitation email pass inside verifyInvitationOtp');
