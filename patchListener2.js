const fs = require('fs');
const file = 'd:/atominos/GatedCommunity/backend/src/features/user/user.listeners.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const inviteLink = `\$\{baseInviteLink\}\$\{baseInviteLink.includes\('\?'\) \? '&' : '\?'\}mode=\$\{inviteMode\}`;/g, 'const inviteLink = baseInviteLink;');

fs.writeFileSync(file, content);
