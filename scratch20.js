const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.services.js', 'utf8');

content = content.replace(
  /if \(\!user\.password\) \{\s*throw new HttpError\(400, 'Password is required to activate a new account\.'\);\s*\}/,
  "if (!user.password && !skipPasswordCheck) {\n            throw new HttpError(400, 'Password is required to activate a new account.');\n          }"
);

fs.writeFileSync('backend/src/features/auth/auth.services.js', content);
