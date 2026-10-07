const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.services.js', 'utf8');

const newVerify = `
  async verifyInvitationOtp(token, code, deviceInfo = {}) {
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

      const identifier = inviteInfo.email || inviteInfo.phone;
      if (!identifier) {
        throw new HttpError(400, 'No email or phone associated with this invitation.');
      }
      
      const { normalizePhone } = await import('../../utils/phone.utils.js');
      const finalIdentifier = inviteInfo.phone ? normalizePhone(identifier) : identifier.toLowerCase();

      const otpService = (await import('../otp/otp.services.js')).default;
      await otpService.verifyOTP(finalIdentifier, code, 'INVITATION_LOGIN', session);

      // Now accept the invitation, consuming the token inside the transaction
      const data = await this.acceptInvitation(token, null, finalIdentifier, null, {}, true);

      await session.commitTransaction();

      // Log successful login
      const { user, token: authToken, refreshToken, availableWorkspaces } = data;
      authEvents.emit('LOGIN_SUCCESS', { userId: user.id || user._id, method: 'invitation_otp', deviceInfo });

      return data;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
`;

const indexStart = content.indexOf('async verifyInvitationOtp(token, code, deviceInfo = {}) {');
const indexEnd = content.indexOf('async verifyEmailOtpLogin(email, code, deviceInfo) {');

if (indexStart !== -1 && indexEnd !== -1) {
  content = content.substring(0, indexStart) + newVerify + "\n  " + content.substring(indexEnd);
  fs.writeFileSync('backend/src/features/auth/auth.services.js', content);
} else {
  console.log("Could not find block");
}
