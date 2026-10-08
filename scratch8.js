const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.listeners.js', 'utf8');

// 1. Export function
content = content.replace("authEvents.on('OTP_SENT', async ({ identifier, code, type }) => {", "export const sendOtpNotification = async ({ identifier, code, type }) => {");

// 2. Remove dev logs
const devLogEmail = `if (process.env.NODE_ENV !== 'production') {
      logger.info(\`[AUTH OTP DELIVERED] Identifier: \${maskEmail(identifier)} | Verification OTP Code: \${code}\`);
    } else {
      logger.info(\`[AUTH OTP DISPATCHED] Identifier: \${maskEmail(identifier)}\`);
    }`;
content = content.replace(devLogEmail, "logger.info(`[AUTH OTP DISPATCHED] Identifier: ${maskEmail(identifier)}`);");

const devFallbackEmail = `if (process.env.NODE_ENV !== 'production') {
        logger.warn(\`No active SMTP/Resend provider configured. Email not sent. [DEV OTP CODE: \${code}]\`);
      } else {
        logger.warn(\`No active SMTP/Resend provider configured. Email not sent to \${maskEmail(identifier)}\`);
      }`;
content = content.replace(devFallbackEmail, "logger.warn(`No active SMTP/Resend provider configured. Email not sent to ${maskEmail(identifier)}`);");

const devFallbackLogEmail = `if (process.env.NODE_ENV !== 'production') {
        logger.info(\`[FALLBACK DEV OTP] Code for \${maskEmail(identifier)}: \${code}\`);
      }`;
content = content.replace(devFallbackLogEmail, "");

const devLogSms = `if (process.env.NODE_ENV !== 'production') {
      logger.info(\`[AUTH OTP DELIVERED - SMS] Phone: \${maskPhone(identifier)} | Verification OTP Code: \${code}\`);
    } else {
      logger.info(\`[AUTH OTP DISPATCHED - SMS] Phone: \${maskPhone(identifier)}\`);
    }`;
content = content.replace(devLogSms, "logger.info(`[AUTH OTP DISPATCHED - SMS] Phone: ${maskPhone(identifier)}`);");

content += "\nauthEvents.on('OTP_SENT', sendOtpNotification);\n";

fs.writeFileSync('backend/src/features/auth/auth.listeners.js', content);
