const fs = require('fs');
let content = fs.readFileSync('mobile/mobile-app/src/features/auth/services/authService.ts', 'utf8');

const newMethods = `
  initiateInvitationOtp: async (token: string) => {
    return await apiClient.post('/auth/invite/otp', { token });
  },
  verifyInvitationOtp: async (token: string, code: string, deviceInfo: any = {}) => {
    return await apiClient.post('/auth/invite/otp/verify', { token, code, deviceInfo });
  },
`;

content = content.replace('exchangeHandoff: async', newMethods + '  exchangeHandoff: async');
fs.writeFileSync('mobile/mobile-app/src/features/auth/services/authService.ts', content);
