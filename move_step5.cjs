const fs = require('fs');

const file = 'backend/src/features/user/user.services.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove Step 5 from its current location
const step5Regex = /\/\/ Step 5: Immediate Unit Assignment for ADMIN_ANNOUNCEMENT or Existing Active Member\r?\n\s*if \(\(mode === 'ADMIN_ANNOUNCEMENT' \|\| isAlreadyActiveMemberAssigningUnit\) && \(villaId \|\| rootVillaId\)\) \{\r?\n\s*const targetAssignVillaId = villaId \|\| rootVillaId;\r?\n\s*const targetAssignResidentType = villaId \? calculatedResidentType : rootResidentType;\r?\n\s*const villaService = \(await import\('\.\.\/villa\/villa\.services\.js'\)\)\.default;\r?\n\s*await villaService\.assignExistingUser\(targetAssignVillaId, user\._id, targetAssignResidentType, orgId, false\)\.catch\(\(err\) => \{\r?\n\s*logger\.warn\(`Immediate villa assignment during announcement warning: \$\{err\.message\}`\);\r?\n\s*\}\);\r?\n\s*\}/;

content = content.replace(step5Regex, '');

// 2. Insert Step 5 AFTER await session.commitTransaction();
const commitRegex = /await session\.commitTransaction\(\);/;

const replacement = `await session.commitTransaction();

        // Step 5: Immediate Unit Assignment for ADMIN_ANNOUNCEMENT or Existing Active Member (Moved after commit to avoid deadlock)
        if ((mode === 'ADMIN_ANNOUNCEMENT' || isAlreadyActiveMemberAssigningUnit) && (villaId || rootVillaId)) {
          const targetAssignVillaId = villaId || rootVillaId;
          const targetAssignResidentType = villaId ? calculatedResidentType : rootResidentType;
          const villaService = (await import('../villa/villa.services.js')).default;
          await villaService.assignExistingUser(targetAssignVillaId, user._id, targetAssignResidentType, orgId, false).catch((err) => {
            logger.warn(\`Immediate villa assignment during announcement warning: \${err.message}\`);
          });
        }`;

content = content.replace(commitRegex, replacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Step 5 moved.');
