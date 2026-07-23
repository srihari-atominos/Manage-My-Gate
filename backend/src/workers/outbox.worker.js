import OutboxEvent from '../features/outbox/outboxEvent.model.js';
import integrationHubService from '../features/integrationHub/integrationHub.service.js';
import messageTemplateService from '../features/messageTemplate/messageTemplate.service.js';
import logger from '../utils/logger.utils.js';
import nodemailer from 'nodemailer';
import { generateInviteLink } from '../features/user/utils/invite.utils.js';

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

/**
 * Handle USER_INVITED event type
 */
async function handleUserInvited(payload) {
  const { email, orgId, invitationToken } = payload;
  const inviteLink = generateInviteLink(invitationToken);

  // 1. Check if SMTP integration is connected for this organization
  const smtpConnection = await integrationHubService.findSmtpConnection(orgId);

  if (!smtpConnection) {
    throw new Error(`SMTP integration is not configured for organization ${orgId}. Link for manual activation: ${inviteLink}`);
  }

  // 2. Fetch organization's customized user_invitation email template
  const template = await messageTemplateService.getTemplateByPurpose(orgId, 'email', 'user_invitation');

  const subject = template?.subject || 'You are invited to join the Workspace';
  const bodyTemplate = template?.body || DEFAULT_INVITE_BODY;

  // 3. Compile variables
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
}

/**
 * Process a single outbox event based on its type
 */
async function processEvent(event) {
  if (event.eventType === 'USER_INVITED') {
    await handleUserInvited(event.payload);
  } else {
    throw new Error(`Unknown event type: ${event.eventType}`);
  }
}

/**
 * Polls the database for PENDING outbox events using atomic locking (findOneAndUpdate)
 */
export async function processOutboxEvents() {
  const batchLimit = 50;
  let processedCount = 0;

  while (processedCount < batchLimit) {
    // Atomically find one PENDING event and mark it as PROCESSING
    const event = await OutboxEvent.findOneAndUpdate(
      { status: 'PENDING' },
      { $set: { status: 'PROCESSING' } },
      { sort: { createdAt: 1 }, new: true }
    );

    // If no more pending events found, terminate batch run
    if (!event) {
      break;
    }

    processedCount++;
    logger.info(`[Outbox Worker] Locked event ${event._id} (${event.eventType}). Processing...`);

    try {
      await processEvent(event);
      
      // Update event status to COMPLETED on success
      event.status = 'COMPLETED';
      event.error = null;
      await event.save();
      logger.info(`[Outbox Worker] Event ${event._id} processed successfully.`);
    } catch (err) {
      logger.error(`[Outbox Worker] Failed to process event ${event._id}: ${err.message}`);
      
      event.retries += 1;
      event.error = err.message;
      
      // Retry logic: if retries < 3, set back to PENDING, otherwise mark as FAILED
      if (event.retries < 3) {
        event.status = 'PENDING';
      } else {
        event.status = 'FAILED';
      }
      await event.save();
    }
  }
}

/**
 * Initialize worker polling interval
 */
export function init() {
  logger.info('⚙️ Outbox Worker initialized.');
  // Poll every 30 seconds
  setInterval(async () => {
    try {
      await processOutboxEvents();
    } catch (err) {
      logger.error(`[Outbox Worker] Polling error: ${err.message}`);
    }
  }, 30000);
}

export default {
  init,
  processOutboxEvents,
};
