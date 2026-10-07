const fs = require('fs');
let content = fs.readFileSync('frontend/src/features/auth/services/authService.js', 'utf8');

const newMethods = `
export const initiateInvitationOtp = async (token) => {
  return await apiClient.post('/auth/invite/otp', { token })
}

export const verifyInvitationOtp = async (token, code) => {
  return await apiClient.post('/auth/invite/otp/verify', { token, code })
}
`;

content = content.replace("export const validateInvite", newMethods + "\nexport const validateInvite");
content = content.replace("validateInvite,", "initiateInvitationOtp,\n  verifyInvitationOtp,\n  validateInvite,");
fs.writeFileSync('frontend/src/features/auth/services/authService.js', content);
