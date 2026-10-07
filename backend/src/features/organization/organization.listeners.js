import orgEventEmitter from './organization.events.js';
import logger from '../../utils/logger.utils.js';
import { maskEmail } from '../../utils/phone.utils.js';

export const initOrganizationListeners = () => {
  orgEventEmitter.on('COMMUNITY_ADMIN_EMAIL_OTP_SENT', async ({ email, code }) => {
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[COMMUNITY ADMIN OTP DELIVERED] Identifier: ${maskEmail(email)} | OTP: ${code}`);
    } else {
      logger.info(`[COMMUNITY ADMIN OTP DISPATCHED] Identifier: ${maskEmail(email)}`);
    }

    try {
      const { sendEmail } = await import('../../utils/email.utils.js');
      const emailSubject = 'Verify your email for Workspace Setup';
      const emailBody = `
        <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #4f46e5; margin-top: 0;">Workspace Setup Verification</h2>
          <p>You have been nominated as a Community Admin for a new workspace.</p>
          <p>Please provide the following 6-digit verification code to the Platform Admin to proceed with the setup:</p>
          <div style="background-color: #f3f4f6; border-radius: 6px; padding: 16px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111827;">${code}</span>
          </div>
          <p style="font-size: 13px; color: #6b7280;">This code is valid for 15 minutes. If you are not expecting this email, please ignore it.</p>
        </div>
      `;
      const sent = await sendEmail(null, email, emailSubject, emailBody);
      if (sent) {
        logger.info(`Community Admin OTP successfully delivered to inbox: ${maskEmail(email)}`);
      } else {
        if (process.env.NODE_ENV !== 'production') {
          logger.info(`Community Admin verification code for ${maskEmail(email)}: ${code}`);
        } else {
          logger.warn(`Community Admin OTP could not be sent to inbox for ${maskEmail(email)}`);
        }
      }
    } catch (error) {
      logger.error(`Asynchronous COMMUNITY_ADMIN_EMAIL_OTP_SENT dispatch failed: ${error.message}`);
    }
  });

  logger.info('[Organization] Event listeners initialized.');
};

initOrganizationListeners();
