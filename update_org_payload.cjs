const fs = require('fs');
const file = 'backend/src/features/organization/organization.services.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /orgEventEmitter\.emit\('ORGANIZATION_CREATED',\s*\{\s*organizationId:\s*newOrg\._id\.toString\(\),\s*organizationName:\s*newOrg\.name,\s*creatorUserId:\s*creatorUserId\.toString\(\),\s*\}\);/m;

const replacement = `orgEventEmitter.emit('ORGANIZATION_CREATED', {
        organizationId: newOrg._id.toString(),
        organizationName: newOrg.name,
        creatorUserId: creatorUserId.toString(),
        adminEmail: communityAdminUser.email,
        adminName: communityAdminUser.name,
        adminPhone: communityAdminUser.phone
      });`;

if (content.match(regex)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated ORGANIZATION_CREATED payload');
} else {
  console.log('Regex did not match');
}
