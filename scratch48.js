const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.services.js', 'utf8');

content = content.replace(
  /const data = await this\.acceptInvitation\(token,\s*null,\s*finalIdentifier,\s*null,\s*\{\},\s*true\);/,
  "const data = await this.acceptInvitation(token, null, isPhone ? null : finalIdentifier, null, {}, true);"
);

fs.writeFileSync('backend/src/features/auth/auth.services.js', content);
console.log('Fixed acceptInvitation logic with regex');
