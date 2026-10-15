const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.services.js', 'utf8');

// Replace all instances in validateInvite where `email:` is returned to also include `phone: user?.phone || '',`
// We will use a regex to match `email: .*?,` and append `\n        phone: user?.phone || '',` if it's within validateInvite.

const validateInviteRegex = /async validateInvite\([\s\S]*?(?=async initiateInvitationOtp)/;
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
