const fs = require('fs');
let content = fs.readFileSync('backend/tests/phase4.3.real-security.test.mjs', 'utf8');

// Replace ._id with .id for verifyRes
content = content.replace(/verifyRes\.user\._id/g, 'verifyRes.user.id');

// Update Exhausted OTP assertion
content = content.replace(
  /assert\.ok\(error\.message\.includes\('Maximum verification attempts reached'\) \|\| error\.message\.includes\('Invalid'\)\);/g,
  "assert.ok(error.message.includes('Too many failed attempts') || error.message.includes('Maximum verification'));"
);

fs.writeFileSync('backend/tests/phase4.3.real-security.test.mjs', content);
console.log('Fixed assertions in phase4.3.real-security.test.mjs');
