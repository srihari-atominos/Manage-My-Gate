const fs = require('fs');
const file = 'backend/src/features/user/user.services.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const phoneEventEmitter = (await import('../phone/phone.events.js')).default;\n        phoneEventEmitter.emit('SMS_OTP_SENT', { phone: user.phone, code: plainCode });",
  "const authEvents = (await import('../auth/auth.events.js')).default;\n        authEvents.emit('OTP_SENT', { identifier: user.phone, code: plainCode, type: 'SMS' });"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed auth events import for current contact SMS');
