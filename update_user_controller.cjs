const fs = require('fs');
const file = 'backend/src/features/user/user.controller.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const { name, phone, phoneOtp, email, emailOtp, removeAvatar, bio, work, hometown, allowIntercomCalls } = req.body;',
  'const { name, phone, phoneOtp, email, emailOtp, updateAuthToken, removeAvatar, bio, work, hometown, allowIntercomCalls } = req.body;'
);

content = content.replace(
  'removeAvatar: removeAvatar === \'true\' || removeAvatar === true || removeAvatar === \'1\',',
  'removeAvatar: removeAvatar === \'true\' || removeAvatar === true || removeAvatar === \'1\',\n        updateAuthToken,'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Updated user.controller.js');
