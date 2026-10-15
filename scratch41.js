const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.services.js', 'utf8');

const newVerify = `
  async verifyInvitationOtp(token, code, preferredMethod = null, deviceInfo = {}) {
    if (typeof preferredMethod === 'object' && preferredMethod !== null && !deviceInfo) {
      deviceInfo = preferredMethod;
      preferredMethod = null;
    }
    const mongoose = (await import('mongoose')).default;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const inviteInfo = await this.validateInvite(token);
      if (!inviteInfo || !inviteInfo.valid) {
        throw new HttpError(400, 'Invalid or expired invitation token.');
      }
      if (inviteInfo.authenticationMethod !== 'OTP_LOGIN') {
        throw new HttpError(403, 'This organization does not support OTP Login for invitations.');
      }

      let isPhone = false;
      let identifier = null;
      if (preferredMethod === 'SMS' && inviteInfo.phone && String(inviteInfo.phone).trim().length > 0) {
        identifier = String(inviteInfo.phone).trim();
        isPhone = true;
      } else if (preferredMethod === 'EMAIL' && inviteInfo.email && inviteInfo.email.trim().length > 0 && !inviteInfo.email.includes('@noemail.local')) {
        identifier = inviteInfo.email.trim();
        isPhone = false;
      } else {
        if (inviteInfo.email && inviteInfo.email.trim().length > 0 && !inviteInfo.email.includes('@noemail.local')) {
          identifier = inviteInfo.email.trim();
          isPhone = false;
        } else if (inviteInfo.phone && String(inviteInfo.phone).trim().length > 0) {
          identifier = String(inviteInfo.phone).trim();
          isPhone = true;
        }
      }
      if (!identifier) throw new HttpError(400, 'No email or phone associated with this invitation.');
      
      const { normalizePhone } = await import('../../utils/phone.utils.js');
      const finalIdentifier = isPhone ? normalizePhone(identifier) : identifier.toLowerCase();

      const otpService = (await import('../otp/otp.services.js')).default;
      await otpService.verifyOTP(finalIdentifier, code, 'INVITATION_LOGIN', session);
`;

const startIndex = content.indexOf('async verifyInvitationOtp(');
const searchEndStr = "await otpService.verifyOTP(finalIdentifier, code, 'INVITATION_LOGIN', session);";
const endIndex = content.indexOf(searchEndStr, startIndex) + searchEndStr.length;

if (startIndex !== -1 && endIndex > startIndex) {
  content = content.substring(0, startIndex) + newVerify.trim() + content.substring(endIndex);
  fs.writeFileSync('backend/src/features/auth/auth.services.js', content);
  console.log('Fixed verifyInvitationOtp perfectly!');
} else {
  console.log('Could not find verifyInvitationOtp or the end string.');
}
