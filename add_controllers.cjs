const fs = require('fs');
const file = 'backend/src/features/user/user.controller.js';
let content = fs.readFileSync(file, 'utf8');

const newMethods = `
  async requestCurrentContactOtp(req, res, next) {
    try {
      const userId = req.user.id || req.user._id;
      const result = await userService.requestCurrentContactOtp(userId);
      res.success(result, 'Authorization OTP sent to current contact method');
    } catch (error) {
      next(error);
    }
  }

  async verifyCurrentContactOtp(req, res, next) {
    try {
      const userId = req.user.id || req.user._id;
      const { otp } = req.body;
      const result = await userService.verifyCurrentContactOtp(userId, otp);
      res.success(result, 'Authorization successful');
    } catch (error) {
      next(error);
    }
  }
`;

if (!content.includes('requestCurrentContactOtp')) {
  content = content.replace("async requestEmailOtp(req, res, next) {", newMethods + "\n  async requestEmailOtp(req, res, next) {");
  fs.writeFileSync(file, content, 'utf8');
  console.log('Added controller methods');
}
