const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.services.js', 'utf8');

function fixIdentifierLogic(match) {
  return `
    let isPhone = false;
    let identifier = null;
    
    if (inviteInfo.email && inviteInfo.email.trim().length > 0) {
      identifier = inviteInfo.email.trim();
      isPhone = false;
    } else if (inviteInfo.phone && String(inviteInfo.phone).trim().length > 0) {
      identifier = String(inviteInfo.phone).trim();
      isPhone = true;
    }
    
    if (!identifier) {
      throw new HttpError(400, 'No email or phone associated with this invitation.');
    }
    
    const { normalizePhone } = await import('../../utils/phone.utils.js');
    const finalIdentifier = isPhone ? normalizePhone(identifier) : identifier.toLowerCase();
    const method = isPhone ? 'SMS' : 'EMAIL';
  `;
}

// Fix initiateInvitationOtp
content = content.replace(
  /const identifier = inviteInfo\.email \|\| inviteInfo\.phone;\s*if \(!identifier\) \{\s*throw new HttpError\(400, 'No email or phone associated with this invitation\.'\);\s*\}\s*const \{ normalizePhone \} = await import\('\.\.\/\.\.\/utils\/phone\.utils\.js'\);\s*const finalIdentifier = inviteInfo\.phone \? normalizePhone\(identifier\) : identifier\.toLowerCase\(\);\s*const otpService = \(await import\('\.\.\/otp\/otp\.services\.js'\)\)\.default;\s*const plainCode = await otpService\.createOTP\(finalIdentifier, 'INVITATION_LOGIN'\);\s*const \{ sendOtpNotification \} = await import\('\.\/auth\.listeners\.js'\);\s*const method = inviteInfo\.phone \? 'SMS' : 'EMAIL';/g,
  `
    let isPhone = false;
    let identifier = null;
    
    if (inviteInfo.email && inviteInfo.email.trim().length > 0) {
      identifier = inviteInfo.email.trim();
      isPhone = false;
    } else if (inviteInfo.phone && String(inviteInfo.phone).trim().length > 0) {
      identifier = String(inviteInfo.phone).trim();
      isPhone = true;
    }
    
    if (!identifier) {
      throw new HttpError(400, 'No email or phone associated with this invitation.');
    }
    
    const { normalizePhone } = await import('../../utils/phone.utils.js');
    const finalIdentifier = isPhone ? normalizePhone(identifier) : identifier.toLowerCase();

    const otpService = (await import('../otp/otp.services.js')).default;
    const plainCode = await otpService.createOTP(finalIdentifier, 'INVITATION_LOGIN');
    
    const { sendOtpNotification } = await import('./auth.listeners.js');
    const method = isPhone ? 'SMS' : 'EMAIL';
  `
);

// Fix verifyInvitationOtp
content = content.replace(
  /const identifier = inviteInfo\.email \|\| inviteInfo\.phone;\s*if \(!identifier\) \{\s*throw new HttpError\(400, 'No email or phone associated with this invitation\.'\);\s*\}\s*const \{ normalizePhone \} = await import\('\.\.\/\.\.\/utils\/phone\.utils\.js'\);\s*const finalIdentifier = inviteInfo\.phone \? normalizePhone\(identifier\) : identifier\.toLowerCase\(\);/g,
  `
    let isPhone = false;
    let identifier = null;
    
    if (inviteInfo.email && inviteInfo.email.trim().length > 0) {
      identifier = inviteInfo.email.trim();
      isPhone = false;
    } else if (inviteInfo.phone && String(inviteInfo.phone).trim().length > 0) {
      identifier = String(inviteInfo.phone).trim();
      isPhone = true;
    }
    
    if (!identifier) {
      throw new HttpError(400, 'No email or phone associated with this invitation.');
    }
    
    const { normalizePhone } = await import('../../utils/phone.utils.js');
    const finalIdentifier = isPhone ? normalizePhone(identifier) : identifier.toLowerCase();
  `
);

fs.writeFileSync('backend/src/features/auth/auth.services.js', content);
console.log('Fixed identifier selection in initiateInvitationOtp and verifyInvitationOtp');
