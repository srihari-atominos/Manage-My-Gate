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
userEvents.on('USER_INVITED', async ({ email, orgId, invitationToken, invitationSource = 'WEB', villaId, roleName, userId }) => {
  try {
    const inviteLink = generateInviteLink(invitationToken, invitationSource);
    const rejectInviteLink = `${inviteLink}${inviteLink.includes('?') ? '&' : '?'}action=reject`;

    // 1. Fetch organization name for branded invite presentation
    let communityName = 'ManageMyGate';
    if (orgId) {
      try {
        const Organization = (await import('../organization/organization.model.js')).default;
        const org = await Organization.findById(orgId).select('name');
        if (org && org.name) communityName = org.name;
      } catch (e) {}
    }

    // 2. Fetch villa/unit details if provided
    let villaLabel = '';
    if (villaId) {
      try {
        const Villa = (await import('../villa/villa.model.js')).default;
        const v = await Villa.findById(villaId).select('unitNumber blockOrBuilding type');
        if (v) {
          const blockStr = v.blockOrBuilding ? ` (${v.blockOrBuilding})` : '';
          villaLabel = `${v.unitNumber || 'Unit'}${blockStr}`;
        }
      } catch (e) {}
    }

    // 3. Create in-app Notification for existing registered user
    try {
      const User = (await import('./user.model.js')).default;
      let targetUserId = userId;
      if (!targetUserId && email) {
        const foundUser = await User.findOne({ email: email.toLowerCase() }).select('_id');
        if (foundUser) targetUserId = foundUser._id;
      }

      if (targetUserId) {
        const notificationService = (await import('../notification/notification.service.js')).default;
        const detailStr = [villaLabel, roleName].filter(Boolean).join(' • ');
        const descStr = detailStr ? ` (${detailStr})` : '';
        await notificationService.createNotification({
          recipientId: targetUserId,
          orgId,
          title: `Invitation to ${communityName}`,
          body: `You have been invited to join ${communityName}${descStr}. Tap to Accept or Reject this invitation.`,
          actionUrl: inviteLink,
          type: 'INVITATION',
        });
      }
    } catch (notifErr) {
      logger.error(`In-app invitation notification dispatch error: ${notifErr.message}`);
    }

    const isApp = String(invitationSource).toUpperCase() === 'APP';
    const instructions = isApp
      ? `<p style="color: #4b5563; font-size: 0.9rem; line-height: 1.5; margin-top: 16px;">
           This is a mobile invitation for the <strong>Nahom Mobile App</strong>.<br/>
           Clicking the buttons below will open Nahom directly to respond to your invitation.
         </p>`
      : `<p style="color: #4b5563; font-size: 0.9rem; line-height: 1.5; margin-top: 16px;">
           This is an invitation for the <strong>Web Workspace</strong>.<br/>
           Clicking the buttons below will open your secure portal to respond to your invitation.
         </p>`;

    const unitRoleDetails = (villaLabel || roleName) ? `
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 18px; margin: 16px 0 24px 0; text-align: left;">
        ${communityName ? `<p style="margin: 4px 0; font-size: 14px; color: #374151;"><strong>Organization:</strong> ${communityName}</p>` : ''}
        ${villaLabel ? `<p style="margin: 4px 0; font-size: 14px; color: #374151;"><strong>Villa / Unit:</strong> ${villaLabel}</p>` : ''}
        ${roleName ? `<p style="margin: 4px 0; font-size: 14px; color: #374151;"><strong>Role:</strong> ${roleName}</p>` : ''}
      </div>
    ` : '';

    const customInviteBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px 24px; color: #1f2937; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
  <div style="margin-bottom: 24px;">
    <span style="display: inline-block; background-color: #e0e7ff; color: #4338ca; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em;">
      ${isApp ? 'Mobile App Invitation' : 'Web Workspace Invitation'}
    </span>
  </div>
  <h2 style="font-size: 22px; font-weight: 800; color: #111827; margin: 0 0 12px 0;">You're invited to join ${communityName}</h2>
  <p style="font-size: 15px; line-height: 1.6; color: #374151; margin: 0 0 16px 0;">
    Hello,<br/><br/>
    You have been invited to join <strong>${communityName}</strong> on Nahom. Please select your response below to proceed.
  </p>

  ${unitRoleDetails}

  <div style="margin: 28px 0; text-align: center;">
    <a href="{{invite_link}}" style="background-color: #16a34a; color: #ffffff; display: inline-block; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; margin-right: 12px; box-shadow: 0 2px 4px rgba(22, 163, 74, 0.2);">
      Accept Invitation
    </a>
    <a href="{{reject_link}}" style="background-color: #dc2626; color: #ffffff; display: inline-block; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);">
      Reject Invitation
    </a>
  </div>
  ${instructions}
  <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 20px;">
    <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0 0 8px 0;">
      This invitation link is single-use and will expire in 24 hours.
    </p>
    <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">
      If you were not expecting this invitation, you can click Reject or safely ignore this email.
    </p>
    <p style="color: #6b7280; font-size: 12px; word-break: break-all; margin-top: 16px;">
      Direct Link: <a href="{{invite_link}}" style="color: #4f46e5;">{{invite_link}}</a>
    </p>
  </div>
</div>
`;

    // Fetch organization's customized user_invitation email template if available
    const template = await messageTemplateService.getTemplateByPurpose(orgId, 'email', 'user_invitation');

    const defaultSubject = `You're invited to join ${communityName}`;
    const subject = template?.subject
      ? template.subject.replace(/{{community_name}}/g, communityName).replace(/{{invite_link}}/g, inviteLink)
      : defaultSubject;

    const bodyTemplate = template?.body || customInviteBody;

    // Compile variables
    const compiledSubject = subject.replace(/{{invite_link}}/g, inviteLink);
    const compiledBody = bodyTemplate
      .replace(/https?:\/\/[^\s"']+\/(?:#\/)?invite(?:\/(?:web|app))?(?:\?token=|\/)[^\s"']*/gi, inviteLink)
      .replace(/{{invite_link}}/g, inviteLink)
      .replace(/{{reject_link}}/g, rejectInviteLink)
      .replace(/{{community_name}}/g, communityName);

    // Send email using sendEmail helper
    logger.info(`\n================================================================================`);
    logger.info(`[INVITATION LINK GENERATED] Email: ${email} | Source: ${invitationSource}`);
    logger.info(`Accept URL: ${inviteLink}`);
    logger.info(`Reject URL: ${rejectInviteLink}`);
    logger.info(`================================================================================\n`);

    const { sendEmail } = await import('../../utils/email.utils.js');
    const sent = await sendEmail(orgId, email, compiledSubject, compiledBody);
    if (sent) {
      logger.info(`Invitation email successfully delivered to inbox: ${email}`);
    } else {
      logger.warn(`SMTP Server is not configured in backend/.env or Integration Hub.`);
      logger.warn(`To deliver real emails to inbox (${email}), configure SMTP_USER & SMTP_PASS in backend/.env or connect SMTP in Integration Hub.`);
      logger.warn(`Manual Activation Link for ${email} (${invitationSource}): ${inviteLink}`);
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

