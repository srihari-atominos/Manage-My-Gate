const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.services.js', 'utf8');

const validateInviteRegex = /async validateInvite\([\s\S]*?(?=\n\s*async verifyResetPasswordOtp)/;
const validateInviteMatch = content.match(validateInviteRegex);

if (validateInviteMatch) {
  let modifiedValidateInvite = validateInviteMatch[0].replace(
    /email:\s*user(\?)?\.email\s*(?:\|\|\s*expectedEmail)?\s*,/g,
    match => `${match}\n        phone: user?.phone || '',`
  );
  content = content.replace(validateInviteMatch[0], modifiedValidateInvite);
  fs.writeFileSync('backend/src/features/auth/auth.services.js', content);
  console.log('Fixed validateInvite to return phone');
} else {
  console.log('Could not find validateInvite block');
}
