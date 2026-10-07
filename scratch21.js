const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.services.js', 'utf8');

const search = `if (!user.password) {
            throw new HttpError(400, 'Password is required to activate a new account.');
          }`;
const replace = `if (!user.password && !skipPasswordCheck) {
            throw new HttpError(400, 'Password is required to activate a new account.');
          }`;

content = content.replace(search, replace);
fs.writeFileSync('backend/src/features/auth/auth.services.js', content);
