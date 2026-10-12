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
      const { sendEmail, getEmailLogoHtml } = await import('../../utils/email.utils.js');
      const emailSubject = 'Verify your email for Workspace Setup';
      const emailBody = `
        <div style="font-family: 'Hanken Grotesk', sans-serif; padding: 30px; color: #171717; background-color: #FFF8EF; max-width: 500px; margin: 0 auto; border: 1px solid #EFE6DC; border-radius: 18px;">
${getEmailLogoHtml()}
          <h2 style="color: #F45A0A; margin-top: 0;">Workspace Setup Verification</h2>
          <p>You have been nominated as a Community Admin for a new workspace.</p>
          <p>Please provide the following 6-digit verification code to the Platform Admin to proceed with the setup:</p>
          <div style="background-color: #FFF0E5; border-radius: 12px; padding: 24px; text-align: center; margin: 30px 0; border: 1px solid #F45A0A;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #F45A0A;">${code}</span>
          </div>
          <p style="font-size: 13px; color: #6F6A64; line-height: 1.5;">This code is valid for 15 minutes. If you are not expecting this email, please ignore it.</p>
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #EFE6DC;">
            <p style="margin: 0; font-size: 14px; color: #6F6A64;">
              Thank you,<br/>
              <strong style="color: #F45A0A;">Nahom Team</strong>
            </p>
          </div>
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

  
  orgEventEmitter.on('ORGANIZATION_CREATED', async (payload) => {
    const { organizationId, organizationName, adminEmail, adminName, adminPhone } = payload;
    
    if (!adminEmail) {
      logger.info(`[ORGANIZATION_CREATED] No admin email provided for ${organizationName}. Skipping welcome email.`);
      return;
    }

    try {
      const { sendEmail, getEmailLogoHtml } = await import('../../utils/email.utils.js');
      
      const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      
      const safeCommunityName = escapeHtml(organizationName);
      const targetUserName = adminName ? escapeHtml(adminName) : 'Community Admin';
      const registeredPhone = adminPhone || 'Not Provided';
      
      const isLocalhost = (url) => !url || /localhost|127\.0\.0\.1|::1/i.test(url);
      const rawUrl = process.env.WEB_APP_URL || process.env.CLIENT_URL || process.env.APP_CLIENT_URL;
      const clientUrl = (rawUrl && !isLocalhost(rawUrl)) ? rawUrl.trim().replace(/\/+$/, '') : 'https://managemygate.e3esg.com';
      
      const emailSubject = `Welcome to ${safeCommunityName}`;
      const emailBody = `
<div style="font-family: 'Hanken Grotesk', sans-serif; padding: 30px; color: #171717; background-color: #FFF8EF; max-width: 600px; margin: 0 auto; border-radius: 18px;">
${getEmailLogoHtml()}

  <p style="font-size: 18px; font-weight: bold; color: #F45A0A;">Hello ${targetUserName},</p>
  
  <p>You have been assigned as the Community Admin for <strong>${safeCommunityName}</strong> by the platform administration.</p>
  
  <div style="background-color: #FFF0E5; padding: 15px; border-radius: 12px; margin: 20px 0;">
    <p style="margin-top: 0; font-weight: bold; color: #F45A0A;">Your registered details are:</p>
    <ul style="list-style: none; padding-left: 0; margin-bottom: 0;">
      <li style="margin-bottom: 8px;"><strong>Email:</strong> ${escapeHtml(adminEmail)}</li>
      <li style="margin-bottom: 8px;"><strong>Phone:</strong> ${escapeHtml(registeredPhone)}</li>
      <li><strong>Role:</strong> Community Admin</li>
    </ul>
  </div>
  
  <p>To access your community dashboard, click the button below and sign in using your registered email address or phone number:</p>
  
  <div style="margin: 30px 0; text-align: center;">
    <a href="${clientUrl}" style="background-color: #F45A0A; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 18px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(244, 90, 10, 0.2);">
      Step into your community
    </a>
  </div>
  
  <p style="font-size: 13px; color: #6b7280; margin-top: 30px;">
    If you were not expecting this invitation, you can safely ignore this email.
    <br><br>
    Thank you,<br>
    Nahom Team
  </p>
</div>
`;
      
      const sent = await sendEmail(null, adminEmail, emailSubject, emailBody);
      if (sent) {
        logger.info(`[ORGANIZATION_CREATED] Welcome email successfully delivered to ${maskEmail(adminEmail)}`);
      } else {
        logger.warn(`[ORGANIZATION_CREATED] Welcome email could not be sent to ${maskEmail(adminEmail)}`);
      }
    } catch (error) {
      logger.error(`Asynchronous ORGANIZATION_CREATED dispatch failed: ${error.message}`);
    }
  });

  logger.info('[Organization] Event listeners initialized.');
};

initOrganizationListeners();
