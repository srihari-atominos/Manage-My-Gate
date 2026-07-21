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

    // 1. Check if SMTP integration is connected for this organization
    const smtpConnection = await integrationHubService.findSmtpConnection(orgId);

    if (!smtpConnection) {
      logger.warn(
        `SMTP integration is not configured for organization ${orgId}. Invitation email not sent. Link for manual activation: ${inviteLink}`
      );
      return;
    }

    // 2. Fetch organization's customized user_invitation email template
    const template = await messageTemplateService.getTemplateByPurpose(orgId, 'email', 'user_invitation');

    const subject = template?.subject || 'You are invited to join the Workspace';
    const bodyTemplate = template?.body || DEFAULT_INVITE_BODY;

    // 3. Compile variables (replace {{invite_link}} with actual URL)
    const compiledSubject = subject.replace(/{{invite_link}}/g, inviteLink);
    const compiledBody = bodyTemplate.replace(/{{invite_link}}/g, inviteLink);

    // 4. Decrypt SMTP credentials
    const credentials = await integrationHubService.getDecryptedCredentialsById(smtpConnection._id);

    // 5. Initialize Mail transporter
    const transporter = nodemailer.createTransport({
      host: credentials.host,
      port: parseInt(credentials.port, 10),
      secure: parseInt(credentials.port, 10) === 465,
      auth: {
        user: credentials.authUsername,
        pass: credentials.authPassword,
      },
    });

    // 6. Send invitation email
    const mailOptions = {
      from: credentials.authUsername,
      to: email,
      subject: compiledSubject,
      html: compiledBody,
      ...(template?.cc && { cc: template.cc }),
      ...(template?.bcc && { bcc: template.bcc }),
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Invitation email successfully sent to ${email} via SMTP.`);
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
