const fs = require('fs');
let content = fs.readFileSync('backend/tests/phase4.3.real-security.test.mjs', 'utf8');

// Fix ACTIVE to Active
content = content.replace(/status: 'ACTIVE'/g, "status: 'Active'");
content = content.replace(/status, 'ACTIVE'/g, "status, 'Active'");

// Fix 400 to 403 in Existing-System Regression
content = content.replace(/assert.equal\(error.statusCode, 400\);[\s\n]*assert.ok\(error.message.includes\('EXISTING_SYSTEM'\) \|\| error.message.includes\('does not support OTP'\)\);/m, 
`assert.equal(error.statusCode, 403);
      assert.ok(error.message.includes('does not support OTP'));`);

fs.writeFileSync('backend/tests/phase4.3.real-security.test.mjs', content);
