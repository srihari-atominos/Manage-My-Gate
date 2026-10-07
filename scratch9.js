const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.services.js', 'utf8');

const oldInitiate = `
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
`;

const newInitiate = `
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
    
    // Normalize phone number if it's a phone
    const { normalizePhone } = await import('../../utils/phone.utils.js');
    const finalIdentifier = inviteInfo.phone ? normalizePhone(identifier) : identifier.toLowerCase();

    const otpService = (await import('../otp/otp.services.js')).default;
    const plainCode = await otpService.createOTP(finalIdentifier, 'INVITATION_LOGIN');
    
    // Send the OTP explicitly without emitting it in an event payload
    const { sendOtpNotification } = await import('./auth.listeners.js');
    const method = inviteInfo.phone ? 'SMS' : 'EMAIL';
    
    // Do not wait for email/sms to complete to avoid slow response time
    sendOtpNotification({ identifier: finalIdentifier, code: plainCode, type: method }).catch((err) => {
      logger.error(\`Failed to send INVITATION_LOGIN OTP to \${finalIdentifier}: \${err.message}\`);
    });

    return { message: 'OTP sent' };
  }
`;

// wait! regex replace might fail because of indentation, so let's do a substring replace
// I will just replace the method body directly.
const indexStart = content.indexOf('async initiateInvitationOtp(token) {');
const indexEnd = content.indexOf('async verifyInvitationOtp(token, code, deviceInfo = {}) {');

if (indexStart !== -1 && indexEnd !== -1) {
  content = content.substring(0, indexStart) + newInitiate + "\n  " + content.substring(indexEnd);
  fs.writeFileSync('backend/src/features/auth/auth.services.js', content);
} else {
  console.log("Could not find block");
}
