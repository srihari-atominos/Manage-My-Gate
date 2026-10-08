const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.services.js', 'utf8');

content = content.replace(/message:\s*isDev\s*'([^']+)'/g, "message: '$1'");
fs.writeFileSync('backend/src/features/auth/auth.services.js', content);
