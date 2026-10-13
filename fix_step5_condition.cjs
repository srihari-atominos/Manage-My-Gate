const fs = require('fs');

const file = 'backend/src/features/user/user.services.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /if \(\(mode === 'ADMIN_ANNOUNCEMENT' \|\| isAlreadyActiveMemberAssigningUnit\) && \(villaId \|\| rootVillaId\)\) \{/;

const replacement = `if (villaId || rootVillaId) {`;

content = content.replace(regex, replacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed Step 5 condition.');
