const fs = require('fs');
const file = 'd:/atominos/GatedCommunity/backend/src/features/user/user.services.js';
let content = fs.readFileSync(file, 'utf8');

// Change status to Pending Verification in inviteUser
content = content.replace(/status: 'Pending'/g, "status: 'Pending Verification'");

// Remove villaId and residentType usages in inviteUser payload in controller
const fileController = 'd:/atominos/GatedCommunity/backend/src/features/user/user.controller.js';
let contentC = fs.readFileSync(fileController, 'utf8');
contentC = contentC.replace(/const \{ email, phone, villaId, residentType, roleName, name, onboardingMode = 'INVITATION' \} = req\.body;/g, "const { email, phone, roleName, name, onboardingMode = 'INVITATION' } = req.body;\n      const villaId = null;\n      const residentType = 'None';");

contentC = contentC.replace(/const \{\s*email,\s*phone = '',\s*name = '',\s*residentType = 'None',\s*roleName,\s*villaNumber,\s*villaId: payloadVillaId,\s*invitationSource: itemSource,\s*onboardingMode: itemMode,?\s*\} = invite;/g, "const {\n        email,\n        phone = '',\n        name = '',\n        roleName,\n        invitationSource: itemSource,\n        onboardingMode: itemMode,\n      } = invite;\n      const residentType = 'None';\n      const payloadVillaId = null;");

fs.writeFileSync(fileController, contentC);
fs.writeFileSync(file, content);
