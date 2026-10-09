import userEvents from './user.events.js';
import integrationHubService from '../integrationHub/integrationHub.service.js';
import messageTemplateService from '../messageTemplate/messageTemplate.service.js';
import logger from '../../utils/logger.utils.js';
import { maskEmail, maskPhone } from '../../utils/phone.utils.js';
import nodemailer from 'nodemailer';
import { generateInviteLink } from './utils/invite.utils.js';

// Admin-entered values (community, unit, role names) are inserted into email HTML
const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const INVITATION_VALID_DAYS = 7;

const DEFAULT_INVITE_BODY = `
<div style="font-family: 'Hanken Grotesk', sans-serif; padding: 30px; color: #171717; background-color: #FFF8EF; max-width: 600px; margin: 0 auto; border-radius: 18px;">
  <h2 style="color: #F45A0A;">Workspace Invitation</h2>
  <p>You have been invited to join our secure workspace.</p>
  <p>Please click the button below to complete your profile registration and activate your account:</p>
  <p style="margin: 30px 0;">
    <a href="{{invite_link}}" style="background-color: #F45A0A; color: white; padding: 14px 28px; text-decoration: none; border-radius: 18px; font-weight: bold; display: inline-block;">
      Accept Invitation
    </a>
  </p>
  <p style="color: #6F6A64; font-size: 0.85rem; margin-top: 40px;">
    If the button above does not work, copy and paste this link in your browser:<br/>
    <a href="{{invite_link}}" style="color: #F45A0A;">{{invite_link}}</a>
  </p>
</div>
`;

// Register user domain events
userEvents.on('USER_INVITED', async ({ email, phone, orgId, invitationToken, invitationSource = 'WEB', villaId, roleName, userId, inviterId, isExisting }) => {
  try {
    // An invite can be replaced while this asynchronous listener is preparing
    // the email (for example, when an admin corrects and re-sends an invite).
    // Never let a stale USER_INVITED event send an old action link.
    const tokenService = (await import('../token/token.services.js')).default;
    const isCurrentPendingInvitation = async () => {
      const tokenDoc = await tokenService.getInvitationToken(invitationToken, 'INVITATION').catch(() => null);
      return Boolean(
        tokenDoc &&
        tokenDoc.status === 'PENDING' &&
        tokenDoc.used !== true &&
        (!orgId || tokenDoc.orgId?.toString() === orgId.toString()) &&
        (!userId || tokenDoc.userId?.toString() === userId.toString())
      );
    };

    if (!(await isCurrentPendingInvitation())) {
      logger.info(`[INVITATION EMAIL SKIPPED] Stale or replaced invitation event for ${maskEmail(email || '')}.`);
      return;
    }

    const baseInviteLink = generateInviteLink(invitationToken, invitationSource);

    // 1. Fetch organization name for branded invite presentation
    let communityName = 'Nahom';
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

    // 3. Inspect target user account status to determine invitation routing mode
    let hasPassword = false;
    let targetUser = null;
    try {
      const User = (await import('./user.model.js')).default;
      if (userId) {
        targetUser = await User.findById(userId);
      } else if (email) {
        targetUser = await User.findOne({ email: email.toLowerCase() });
      }

      hasPassword = !!(targetUser && targetUser.password && targetUser.password.length > 0 && targetUser.status === 'Active');

      // Existing user has an account record in the system
      const isExistingAccount = isExisting !== undefined ? isExisting : !!targetUser;

      if (targetUser && isExistingAccount) {
        const notificationService = (await import('../notification/notification.service.js')).default;
        const tokenService = (await import('../token/token.services.js')).default;
        const tokenDoc = await tokenService.getInvitationToken(invitationToken, 'INVITATION').catch(() => null);
        const invitationId = tokenDoc && tokenDoc._id ? tokenDoc._id.toString() : null;

        const detailStr = [villaLabel, roleName].filter(Boolean).join(' • ');
        const descStr = detailStr ? ` (${detailStr})` : '';
        await notificationService.createNotification({
          recipientId: targetUser._id,
          senderId: inviterId || null,
          orgId,
          title: `Invitation to ${communityName}`,
          body: `You have been invited to join ${communityName}${descStr}. Tap to access your invitation.`,
          actionUrl: baseInviteLink,
          type: 'INVITATION',
          metadata: {
            invitationId,
            entityId: invitationId,
            orgId: orgId ? orgId.toString() : null,
            communityName,
            roleName: roleName || '',
            villaLabel: villaLabel || '',
          },
        });
      }
    } catch (notifErr) {
      logger.error(`In-app invitation notification dispatch error: ${notifErr.message}`);
    }

    const inviteMode = hasPassword ? 'signin' : 'signup';
    const inviteLink = baseInviteLink;
    const ctaButtonText = 'Step into your Community';
    const safeCommunityName = escapeHtml(communityName);
    const targetUserName = targetUser?.name || 'User';
    const registeredPhone = phone || targetUser?.phone || '';

    const customInviteBody = `
<div style="font-family: 'Hanken Grotesk', sans-serif; padding: 30px; color: #171717; background-color: #FFF8EF; max-width: 600px; margin: 0 auto; border-radius: 18px; line-height: 1.6; border: 1px solid #EFE6DC;">
  
  <!-- Nahom Logo Header -->
  <div style="text-align: center; margin-bottom: 25px;">
    <img src="https://nahom.app/logo.png" alt="Nahom Logo" style="max-height: 45px; width: auto;" onerror="this.style.display='none'" />
  </div>

  <p style="font-size: 18px; font-weight: bold; color: #F45A0A;">Hello ${escapeHtml(targetUserName)},</p>
  
  <p>You have been invited to join <strong>${safeCommunityName}</strong> by the community administration.</p>
  
  <div style="background-color: #FFF0E5; padding: 15px; border-radius: 12px; margin: 20px 0;">
    <p style="margin-top: 0; font-weight: bold; color: #F45A0A;">Your registered details are:</p>
    <ul style="list-style: none; padding-left: 0; margin-bottom: 0;">
      <li style="margin-bottom: 8px;"><strong>Email:</strong> ${escapeHtml(email || '')}</li>
      <li style="margin-bottom: 8px;"><strong>Phone:</strong> ${escapeHtml(registeredPhone)}</li>
      <li><strong>Role:</strong> ${escapeHtml(roleName || '')}</li>
    </ul>
  </div>
  
  <p>To access your community, click the button below:</p>
  
  <div style="margin: 30px 0; text-align: center;">
    <a href="{{invite_link}}" style="background-color: #F45A0A; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 18px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(244, 90, 10, 0.2);">
      ${ctaButtonText}
    </a>
  </div>
  
  <p style="color: #6F6A64; font-size: 14px;">After clicking the button, you will be taken to the appropriate application based on your device. You can sign in using your registered <strong>email address or phone number and OTP</strong>.</p>
  
  <p style="color: #6F6A64; font-size: 14px;">If the application is not installed on your mobile device, you will be directed to the appropriate play store or app store.</p>
  
  <p style="color: #6F6A64; font-size: 14px;">If you were not expecting this invitation, you can safely ignore this email.</p>
  
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #EFE6DC;">
    <p style="margin: 0;">
      Thank you,<br/>
      <strong style="color: #F45A0A;">${safeCommunityName} Team</strong>
    </p>
  </div>
</div>
`;

    // Fetch organization's customized user_invitation email template if available
    const template = await messageTemplateService.getTemplateByPurpose(orgId, 'email', 'user_invitation');

    const defaultSubject = `You’re Invited to Join ${communityName}`;
    const subject = template?.subject
      ? template.subject.replace(/{{community_name}}/g, communityName).replace(/{{invite_link}}/g, inviteLink)
      : defaultSubject;

    const bodyTemplate = template?.body || customInviteBody;

    // Compile variables – also rewrite any legacy URL formats that may be
    // stored in custom MongoDB email templates (hash-router, /invite/app/, /invite/web/)
    const compiledSubject = subject
      .replace(/{{invite_link}}/g, inviteLink);
    const compiledBody = bodyTemplate
      // Rewrite ONLY legacy sub-path style: /invite/app/<token> or /invite/web/<token>
      // Do NOT rewrite /#/invite?token=<token> – that is the correct format for this HashRouter app
      .replace(/https?:\/\/[^\s"'>]+\/invite\/(?:app|web)\/[^\s"'>]*/gi, inviteLink)
      .replace(/https?:\/\/[^\s"']+\/(?:#\/)?invite(?:\/(?:web|app))?(?:\?token=|\/)[^\s"']*/gi, inviteLink)
      .replace(/{{invite_link}}/g, inviteLink)
      .replace(/{{community_name}}/g, safeCommunityName);

    // Mask raw token in logs to comply with security directive
    const maskedToken = invitationToken ? `${invitationToken.slice(0, 6)}...` : '[MASKED]';
    logger.info(`[INVITATION CREATED] Email: ${email} | Token: ${maskedToken} | Universal URL: /invite/${maskedToken}`);

    // Check again immediately before dispatch. This closes the race where a
    // newer invite supersedes this one while its branded email is rendering.
    if (!(await isCurrentPendingInvitation())) {
      logger.info(`[INVITATION EMAIL SKIPPED] Invitation was replaced before delivery for ${maskEmail(email || '')}.`);
      return;
    }

    const { sendEmail } = await import('../../utils/email.utils.js');
    const sent = await sendEmail(orgId, email, compiledSubject, compiledBody);
    if (sent) {
      logger.info(`Invitation email successfully delivered to inbox: ${email}`);
    } else {
      logger.warn(`SMTP Server is not configured in backend/.env or Integration Hub.`);
      logger.warn(`To deliver real emails to inbox (${email}), configure SMTP_USER & SMTP_PASS in backend/.env or connect SMTP in Integration Hub.`);
    }
  } catch (error) {
    logger.error(`Asynchronous invitation email dispatch failed: ${error.message}`);
  }
});

const DEFAULT_ADDED_BODY = `
<div style="font-family: 'Hanken Grotesk', sans-serif; padding: 30px; color: #171717; background-color: #FFF8EF; max-width: 600px; margin: 0 auto; border-radius: 18px;">
  <h2 style="color: #F45A0A; margin-top: 0;">Workspace Update</h2>
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
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`[USER EMAIL CHANGE OTP DELIVERED] Identifier: ${maskEmail(email)} | Verification OTP Code: ${code}`);
  } else {
    logger.info(`[USER EMAIL CHANGE OTP DISPATCHED] Identifier: ${maskEmail(email)}`);
  }

  try {
    const { sendEmail } = await import('../../utils/email.utils.js');
    const emailSubject = 'Your Email Verification Code';
    const emailBody = `
      <div style="font-family: 'Hanken Grotesk', sans-serif; padding: 30px; color: #171717; background-color: #FFF8EF; max-width: 500px; margin: 0 auto; border: 1px solid #EFE6DC; border-radius: 18px;">
        <h2 style="color: #F45A0A; margin-top: 0;">Email Verification</h2>
        <p>You requested to update your account email to <strong>${email}</strong>.</p>
        <p>Please enter the following 6-digit verification code in the app to verify this change:</p>
        <div style="background-color: #FFF0E5; border-radius: 12px; padding: 24px; text-align: center; margin: 30px 0; border: 1px solid #F45A0A;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #F45A0A;">${code}</span>
        </div>
        <p style="font-size: 13px; color: #6F6A64; line-height: 1.5;">This code is valid for 15 minutes. If you did not request this change, please ignore this email or contact support.</p>
      </div>
    `;
    const sent = await sendEmail(null, email, emailSubject, emailBody);
    if (sent) {
      logger.info(`Email change OTP successfully delivered to inbox: ${maskEmail(email)}`);
    } else {
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`Email change verification code for ${maskEmail(email)}: ${code}`);
      } else {
        logger.warn(`Email change OTP could not be sent to inbox for ${maskEmail(email)}`);
      }
    }
  } catch (error) {
    logger.error(`Asynchronous EMAIL_OTP_SENT dispatch failed: ${error.message}`);
  }
});

