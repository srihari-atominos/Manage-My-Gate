import userEvents from './user.events.js';
import integrationHubService from '../integrationHub/integrationHub.service.js';
import messageTemplateService from '../messageTemplate/messageTemplate.service.js';
import logger from '../../utils/logger.utils.js';
import nodemailer from 'nodemailer';
import { generateInviteLink } from './utils/invite.utils.js';

const DEFAULT_INVITE_BODY = `
<div style="font-family: sans-serif; padding: 20px; color: #333;">
  <h2>Workspace Invitation</h2>
  <p>You have been invited to join our secure workspace.</p>
  <p>Please click the button below to complete your profile registration and activate your account:</p>
  <p style="margin: 30px 0;">
    <a href="{{invite_link}}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
      Accept Invitation
    </a>
  </p>
  <p style="color: #666; font-size: 0.85rem; margin-top: 40px;">
    If the button above does not work, copy and paste this link in your browser:<br/>
    <a href="{{invite_link}}">{{invite_link}}</a>
  </p>
</div>
`;

// Register user domain events
userEvents.on('USER_INVITED', async ({ email, orgId, invitationToken }) => {
  try {
    const inviteLink = generateInviteLink(invitationToken);

    // 1. Fetch organization's customized user_invitation email template
    const template = await messageTemplateService.getTemplateByPurpose(orgId, 'email', 'user_invitation');

    const subject = template?.subject || 'You are invited to join the Workspace';
    const bodyTemplate = template?.body || DEFAULT_INVITE_BODY;

    // 2. Compile variables (replace {{invite_link}} and any legacy domain links with actual URL)
    const compiledSubject = subject.replace(/{{invite_link}}/g, inviteLink);
    const compiledBody = bodyTemplate
      .replace(/https?:\/\/[^\s"']+\/#\/invite\?token=[^\s"']*/gi, inviteLink)
      .replace(/{{invite_link}}/g, inviteLink);

    // 3. Send email using sendEmail helper
    logger.info(`\n================================================================================`);
    logger.info(`[INVITATION LINK GENERATED] Email: ${email}`);
    logger.info(`Invitation URL: ${inviteLink}`);
    logger.info(`================================================================================\n`);

    const { sendEmail } = await import('../../utils/email.utils.js');
    const sent = await sendEmail(orgId, email, compiledSubject, compiledBody);
    if (sent) {
      logger.info(`Invitation email successfully delivered to inbox: ${email}`);
    } else {
      logger.warn(`SMTP Server is not configured in backend/.env or Integration Hub.`);
      logger.warn(`To deliver real emails to inbox (${email}), configure SMTP_USER & SMTP_PASS in backend/.env or connect SMTP in Integration Hub.`);
      logger.warn(`Manual Activation Link for ${email}: ${inviteLink}`);
    }
  } catch (error) {
    logger.error(`Asynchronous invitation email dispatch failed: ${error.message}`);
  }
});

const DEFAULT_ADDED_BODY = `
<div style="font-family: sans-serif; padding: 20px; color: #333;">
  <h2>Workspace Update</h2>
  <p>You have been added to a new workspace/community.</p>
  <p>Please log in to your account to access it.</p>
</div>
`;

userEvents.on('USER_ADDED', async ({ email, orgId }) => {
  try {
    const smtpConnection = await integrationHubService.findSmtpConnection(orgId);

    if (!smtpConnection) {
      logger.warn(`SMTP integration is not configured for organization ${orgId}. USER_ADDED email not sent.`);
      return;
    }

    const template = await messageTemplateService.getTemplateByPurpose(orgId, 'email', 'user_added');

    const subject = template?.subject || 'You have been added to a new Workspace';
    const bodyTemplate = template?.body || DEFAULT_ADDED_BODY;

    const credentials = await integrationHubService.getDecryptedCredentialsById(smtpConnection._id);

    const transporter = nodemailer.createTransport({
      host: credentials.host,
      port: parseInt(credentials.port, 10),
      secure: parseInt(credentials.port, 10) === 465,
      auth: {
        user: credentials.authUsername,
        pass: credentials.authPassword,
      },
    });

    const mailOptions = {
      from: credentials.authUsername,
      to: email,
      subject,
      html: bodyTemplate,
      ...(template?.cc && { cc: template.cc }),
      ...(template?.bcc && { bcc: template.bcc }),
    };

    await transporter.sendMail(mailOptions);
    logger.info(`USER_ADDED email successfully sent to ${email} via SMTP.`);
  } catch (error) {
    logger.error(`Asynchronous USER_ADDED email dispatch failed: ${error.message}`);
  }
});

userEvents.on('EMAIL_OTP_SENT', async ({ email, code }) => {
  logger.info(`[USER EMAIL CHANGE OTP DELIVERED] Identifier: ${email} | Verification OTP Code: ${code}`);

  try {
    const { sendEmail } = await import('../../utils/email.utils.js');
    const emailSubject = 'Your Email Verification Code';
    const emailBody = `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-top: 0;">Email Verification</h2>
        <p>You requested to update your account email to <strong>${email}</strong>.</p>
        <p>Please enter the following 6-digit verification code in the app to verify this change:</p>
        <div style="background-color: #f3f4f6; border-radius: 6px; padding: 16px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111827;">${code}</span>
        </div>
        <p style="font-size: 13px; color: #6b7280;">This code is valid for 15 minutes. If you did not request this change, please ignore this email or contact support.</p>
      </div>
    `;
    const sent = await sendEmail(null, email, emailSubject, emailBody);
    if (sent) {
      logger.info(`Email change OTP successfully delivered to inbox: ${email}`);
    } else {
      logger.info(`Email change verification code for ${email}: ${code}`);
    }
  } catch (error) {
    logger.error(`Asynchronous EMAIL_OTP_SENT dispatch failed: ${error.message}`);
  }
});

