const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.services.js', 'utf8');

const newMethods = `
  async initiateInvitationOtp(token) {
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

    const otpService = (await import('../otp/otp.services.js')).default;
    const plainCode = await otpService.createOTP(identifier, 'INVITATION_LOGIN');
    authEvents.emit('OTP_SENT', { identifier, code: plainCode, type: 'INVITATION_LOGIN' });

    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      console.log('\\n=========================================');
      console.log(\`[DEV MODE INVITATION] OTP for \${identifier} is: \${plainCode}\`);
      console.log('=========================================\\n');
    }

    return { message: isDev ? \`OTP sent (Dev Code: \${plainCode})\` : 'OTP sent' };
  }

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

      const otpService = (await import('../otp/otp.services.js')).default;
      await otpService.verifyOTP(identifier, code, 'INVITATION_LOGIN');

      // Now accept the invitation, consuming the token
      const data = await this.acceptInvitation(token, null, identifier, null, {}, true);

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

content = content.replace('async verifyEmailOtpLogin(email, code, deviceInfo) {', newMethods + '\n  async verifyEmailOtpLogin(email, code, deviceInfo) {');
fs.writeFileSync('backend/src/features/auth/auth.services.js', content);
