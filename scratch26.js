const fs = require('fs');
let content = fs.readFileSync('backend/src/features/otp/otp.services.js', 'utf8');

const searchRegex = /if \(\!otpDoc\) \{\s*throw new HttpError\(400, 'Invalid or expired OTP'\);\s*\}/;
const replaceString = `if (!otpDoc) {
      throw new HttpError(400, 'Invalid or expired OTP');
    }
    if (otpDoc.expiresAt && otpDoc.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpDoc._id }).session(session);
      throw new HttpError(400, 'Invalid or expired OTP');
    }`;

content = content.replace(searchRegex, replaceString);
fs.writeFileSync('backend/src/features/otp/otp.services.js', content);
