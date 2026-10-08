const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.router.js', 'utf8');

const newRoutes = `
// Invitation OTP Routes
router.post('/invite/otp', otpLimiter, validate(inviteOtpInitiateRules), authController.initiateInvitationOtp);
router.post('/invite/otp/verify', authLimiter, validate(inviteOtpVerifyRules), authController.verifyInvitationOtp);

router.post('/login/email-otp', otpLimiter, validate(emailOtpLoginRules), authController.initiateEmailOtpLogin);
`;

content = content.replace("router.post('/login/email-otp', otpLimiter, validate(emailOtpLoginRules), authController.initiateEmailOtpLogin);", newRoutes);
fs.writeFileSync('backend/src/features/auth/auth.router.js', content);
