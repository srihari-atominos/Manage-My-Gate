const fs = require('fs');
let lines = fs.readFileSync('backend/src/features/auth/auth.services.js', 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.includes('async initiateInvitationOtp('));
const endIndex = lines.findIndex((l, i) => i > startIndex && l.includes("return { message: 'OTP sent' };"));

if (startIndex !== -1 && endIndex !== -1) {
  const newLines = `
  async initiateInvitationOtp(token, preferredMethod = null) {
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
    const plainCode = await otpService.createOTP(finalIdentifier, 'INVITATION_LOGIN');
    
    const { sendOtpNotification } = await import('./auth.listeners.js');
    const method = isPhone ? 'SMS' : 'EMAIL';
    
    sendOtpNotification({ identifier: finalIdentifier, code: plainCode, type: method }).catch((err) => {
      logger.error(\`Failed to send INVITATION_LOGIN OTP to \${finalIdentifier}: \${err.message}\`);
    });

    return { message: 'OTP sent' };`.split('\n');

  lines.splice(startIndex, endIndex - startIndex + 1, ...newLines);
  fs.writeFileSync('backend/src/features/auth/auth.services.js', lines.join('\n'));
  console.log('Successfully replaced initiateInvitationOtp');
} else {
  console.log('Failed to find indices');
}
