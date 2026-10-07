const fs = require('fs');
let content = fs.readFileSync('src/features/organization/organization.validator.js', 'utf8');
content += \nexport const updateLoginPolicyRules = [\n  body('loginPolicy').optional().isString().isIn(['Email', 'SSO', 'Both']).withMessage('Invalid login policy'),\n];\n;
fs.writeFileSync('src/features/organization/organization.validator.js', content, 'utf8');
