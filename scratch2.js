const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.controller.js', 'utf8');

const newMethods = `
  async initiateInvitationOtp(req, res, next) {
    try {
      const { token } = req.body;
      const data = await authService.initiateInvitationOtp(token);
      res.success(data, data?.message || 'OTP sent for invitation');
    } catch (error) {
      next(error);
    }
  }

  async verifyInvitationOtp(req, res, next) {
    try {
      const { token, code } = req.body;
      const deviceInfo = {
        deviceName: req.headers['user-agent'],
        browser: 'Browser',
        os: 'OS',
        ipAddress: req.ip,
      };
      const data = await authService.verifyInvitationOtp(token, code, deviceInfo);
      setAuthCookie(res, data.token);
      if (data.refreshToken) {
        setRefreshTokenCookie(res, data.refreshToken);
      }
      res.success(data, 'Invitation accepted and login successful');
    } catch (error) {
      next(error);
    }
  }
`;

content = content.replace('async verifyEmailOtpLogin(req, res, next) {', newMethods + '\n  async verifyEmailOtpLogin(req, res, next) {');
fs.writeFileSync('backend/src/features/auth/auth.controller.js', content);
