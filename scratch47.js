const fs = require('fs');
let lines = fs.readFileSync('backend/tests/phase4.3.real-security.test.mjs', 'utf8').split('\n');

lines[66] = lines[66].replace('invite.invitationToken)', "invite.invitationToken, 'SMS')");
lines[71] = lines[71].replace('plainCode)', "plainCode, 'SMS')");
lines[103] = lines[103].replace('invite.invitationToken)', "invite.invitationToken, 'SMS')");
lines[108] = lines[108].replace('plainCode)', "plainCode, 'SMS')");

fs.writeFileSync('backend/tests/phase4.3.real-security.test.mjs', lines.join('\n'));
console.log('Fixed lines directly by array index');
