const fs = require('fs');

const file = 'backend/src/features/user/user.services.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /\/\/ Step 5: Immediate Unit Assignment for ADMIN_ANNOUNCEMENT\r?\n\s*if \(mode === 'ADMIN_ANNOUNCEMENT' && rootVillaId\) \{/;

const replacement = `// Step 5: Immediate Unit Assignment for ADMIN_ANNOUNCEMENT or Existing Active Member
        if ((mode === 'ADMIN_ANNOUNCEMENT' || (typeof isAlreadyActiveMemberAssigningUnit !== 'undefined' && isAlreadyActiveMemberAssigningUnit)) && rootVillaId) {`;

content = content.replace(regex, replacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Step 5 patched.');
