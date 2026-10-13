const fs = require('fs');
const file = 'mobile/mobile-app/src/features/auth/services/authService.ts';
let content = fs.readFileSync(file, 'utf8');

const newMethods = `
export const requestCurrentContactOtp = async () => {
  return await apiClient.post('/users/request-current-contact-otp');
};

export const verifyCurrentContactOtp = async (otp: string) => {
  return await apiClient.post('/users/verify-current-contact-otp', { otp });
};

export const requestPhoneChangeOtp = async (newPhone: string) => {
  return await apiClient.post('/users/request-phone-otp', { newPhone });
};
`;

if (!content.includes('requestCurrentContactOtp')) {
  content = content.replace("export const requestEmailChangeOtp = async (newEmail: string) => {", newMethods + "\nexport const requestEmailChangeOtp = async (newEmail: string) => {");
  
  content = content.replace("requestEmailChangeOtp,", "requestEmailChangeOtp,\n  requestCurrentContactOtp,\n  verifyCurrentContactOtp,\n  requestPhoneChangeOtp,");
  fs.writeFileSync(file, content, 'utf8');
  console.log('Added authService methods');
}
