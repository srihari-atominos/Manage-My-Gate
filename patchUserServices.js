const fs = require('fs');
const file = 'd:/atominos/GatedCommunity/backend/src/features/user/user.services.js';
let content = fs.readFileSync(file, 'utf8');

// Replace password generation logic in inviteUser
const uuidRegex = /const \{ v4: uuidv4 \} = await import\('uuid'\);\s*const randomPassword = uuidv4\(\);\s*const \{ hashPassword \} = await import\('\.\.\/\.\.\/utils\/crypto\.utils\.js'\);\s*const invitePassword = await hashPassword\(randomPassword\);/g;
content = content.replace(uuidRegex, '');

content = content.replace(/password: invitePassword,/g, '');
content = content.replace(/status:\s*'Pending'/g, "status: 'Pending Verification'");

fs.writeFileSync(file, content);
