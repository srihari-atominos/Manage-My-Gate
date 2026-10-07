const fs = require('fs');
let content = fs.readFileSync('backend/tests/phase4.3.real-security.test.mjs', 'utf8');

content = content.replace(/organizationType: 'Residential' \}, superAdminId\);/g, "organizationType: 'Residential' });");

fs.writeFileSync('backend/tests/phase4.3.real-security.test.mjs', content);
