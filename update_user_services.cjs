const fs = require('fs');
const file = 'backend/src/features/user/user.services.js';
let content = fs.readFileSync(file, 'utf8');

const jwtImport = "import { signToken, verifyToken } from '../../utils/jwt.utils.js';\n";

if (!content.includes('jwt.utils.js')) {
  content = content.replace("import mongoose from 'mongoose';", "import mongoose from 'mongoose';\n" + jwtImport);
}

const newMethods = `
  async requestCurrentContactOtp(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new HttpError(404, 'User not found.');

    const contact = user.email || user.phone;
    if (!contact) {
      throw new HttpError(400, 'No email or phone number found on your profile to verify.');
    }

    const type = 'AUTHORIZE_UPDATE';
    const plainCode = await otpService.createOTP(contact, type, 15);

    if (user.email) {
      const userEvents = (await import('./user.events.js')).default;
      userEvents.emit('EMAIL_OTP_SENT', { email: user.email, code: plainCode });
      return { message: 'Authorization code sent to your current email.', type: 'email', ...(process.env.NODE_ENV !== 'production' && { devCode: plainCode }) };
    } else {
      const phoneEventEmitter = (await import('../phone/phone.events.js')).default;
      phoneEventEmitter.emit('SMS_OTP_SENT', { phone: user.phone, code: plainCode });
      return { message: 'Authorization code sent to your current phone.', type: 'phone', ...(process.env.NODE_ENV !== 'production' && { devCode: plainCode }) };
    }
  }

  async verifyCurrentContactOtp(userId, code) {
    const user = await userRepository.findById(userId);
    if (!user) throw new HttpError(404, 'User not found.');

    const contact = user.email || user.phone;
    if (!contact) throw new HttpError(400, 'No contact information found to verify.');

    await otpService.verifyOTP(contact, code, 'AUTHORIZE_UPDATE', null, true);

    const updateAuthToken = signToken({ userId: user._id.toString(), authorizedAction: 'UPDATE_CONTACT' }, '15m');
    return { verified: true, updateAuthToken };
  }
`;

if (!content.includes('requestCurrentContactOtp')) {
  content = content.replace("async requestEmailOtp(userId, newEmail) {", newMethods + "\n  async requestEmailOtp(userId, newEmail) {");
}

const verifyAuthTokenCheck = `
        const isEmailChanged = email !== undefined && email.trim() !== '' && email.trim().toLowerCase() !== (user.email || '').toLowerCase();
        const isPhoneChanged = phone !== undefined && phone.trim() !== '' && phone.trim() !== (user.phone || '');
        
        if (isEmailChanged || isPhoneChanged) {
          const updateAuthToken = arguments[1].updateAuthToken;
          if (!updateAuthToken) {
            throw new HttpError(401, 'Contact update authorization token is missing. Please verify your current contact first.');
          }
          try {
            const decoded = verifyToken(updateAuthToken);
            if (decoded.userId !== id.toString() || decoded.authorizedAction !== 'UPDATE_CONTACT') {
              throw new HttpError(401, 'Invalid or expired contact update authorization token.');
            }
          } catch (err) {
            throw new HttpError(401, 'Invalid or expired contact update authorization token.');
          }
        }
`;

if (!content.includes('Contact update authorization token is missing')) {
  content = content.replace("const payload = { $set: {}, $unset: {} };", verifyAuthTokenCheck + "\n        const payload = { $set: {}, $unset: {} };");
}

fs.writeFileSync(file, content, 'utf8');
console.log('Updated user.services.js');
