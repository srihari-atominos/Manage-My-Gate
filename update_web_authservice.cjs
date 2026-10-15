const fs = require('fs');
const file = 'frontend/src/features/auth/services/authService.js';
let content = fs.readFileSync(file, 'utf8');

const newMethods = `
export const requestCurrentContactOtp = async () => {
  return await apiClient.post('/users/request-current-contact-otp')
}

export const verifyCurrentContactOtp = async (otp) => {
  return await apiClient.post('/users/verify-current-contact-otp', { otp })
}

export const requestEmailChangeOtp = async (newEmail) => {
  return await apiClient.post('/users/request-email-otp', { newEmail })
}

export const requestPhoneChangeOtp = async (newPhone) => {
  return await apiClient.post('/users/request-phone-otp', { newPhone })
}
`;

if (!content.includes('requestCurrentContactOtp')) {
  content = content.replace("export const logoutApi = async () => {", newMethods + "\nexport const logoutApi = async () => {");
  
  content = content.replace("export default {", "export default {\n  requestCurrentContactOtp,\n  verifyCurrentContactOtp,\n  requestEmailChangeOtp,\n  requestPhoneChangeOtp,");
  fs.writeFileSync(file, content, 'utf8');
  console.log('Added web authService methods');
}
