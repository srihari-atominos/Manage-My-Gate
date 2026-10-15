const fs = require('fs');
let lines = fs.readFileSync('backend/src/features/auth/auth.services.js', 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.includes('async verifyInvitationOtp('));
const endIndex = lines.findIndex((l, i) => i > startIndex && l.includes("await otpService.verifyOTP(finalIdentifier, code, 'INVITATION_LOGIN', session);"));

if (startIndex !== -1 && endIndex !== -1) {
  const newLines = `
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
`.split('\n');

  lines.splice(startIndex, endIndex - startIndex + 1, ...newLines);
  fs.writeFileSync('backend/src/features/auth/auth.services.js', lines.join('\n'));
  console.log('Successfully replaced verifyInvitationOtp');
} else {
  console.log('Failed to find indices');
}
