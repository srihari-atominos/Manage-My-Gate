const fs = require('fs');
const file = 'backend/src/features/organization/organization.listeners.js';
let content = fs.readFileSync(file, 'utf8');

const newListener = `
  orgEventEmitter.on('ORGANIZATION_CREATED', async (payload) => {
    const { organizationId, organizationName, adminEmail, adminName, adminPhone } = payload;
    
    if (!adminEmail) {
      logger.info(\`[ORGANIZATION_CREATED] No admin email provided for \${organizationName}. Skipping welcome email.\`);
      return;
    }

    try {
      const { sendEmail } = await import('../../utils/email.utils.js');
      
      const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      
      const safeCommunityName = escapeHtml(organizationName);
      const targetUserName = adminName ? escapeHtml(adminName) : 'Community Admin';
      const registeredPhone = adminPhone || 'Not Provided';
      
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3004';
      
      const emailSubject = \`Welcome to \${safeCommunityName}\`;
      const emailBody = \`
<div style="font-family: 'Hanken Grotesk', sans-serif; padding: 30px; color: #171717; background-color: #FFF8EF; max-width: 600px; margin: 0 auto; border-radius: 18px;">
  <!-- Nahom Logo Header -->
  <div style="text-align: center; margin-bottom: 25px;">
    <img src="https://nahom.app/logo.png" alt="Nahom Logo" style="max-height: 45px; width: auto;" onerror="this.style.display='none'" />
  </div>

  <p style="font-size: 18px; font-weight: bold; color: #F45A0A;">Hello \${targetUserName},</p>
  
  <p>You have been assigned as the Community Admin for <strong>\${safeCommunityName}</strong> by the platform administration.</p>
  
  <div style="background-color: #FFF0E5; padding: 15px; border-radius: 12px; margin: 20px 0;">
    <p style="margin-top: 0; font-weight: bold; color: #F45A0A;">Your registered details are:</p>
    <ul style="list-style: none; padding-left: 0; margin-bottom: 0;">
      <li style="margin-bottom: 8px;"><strong>Email:</strong> \${escapeHtml(adminEmail)}</li>
      <li style="margin-bottom: 8px;"><strong>Phone:</strong> \${escapeHtml(registeredPhone)}</li>
      <li><strong>Role:</strong> Community Admin</li>
    </ul>
  </div>
  
  <p>To access your community dashboard, click the button below and sign in using your registered email address or phone number:</p>
  
  <div style="margin: 30px 0; text-align: center;">
    <a href="\${clientUrl}" style="background-color: #F45A0A; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 18px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(244, 90, 10, 0.2);">
      Login to Dashboard
    </a>
  </div>
  
  <p style="font-size: 13px; color: #6b7280; margin-top: 30px;">
    If you were not expecting this invitation, you can safely ignore this email.
    <br><br>
    Thank you,<br>
    \${safeCommunityName} Team
  </p>
</div>
\`;
      
      const sent = await sendEmail(null, adminEmail, emailSubject, emailBody);
      if (sent) {
        logger.info(\`[ORGANIZATION_CREATED] Welcome email successfully delivered to \${maskEmail(adminEmail)}\`);
      } else {
        logger.warn(\`[ORGANIZATION_CREATED] Welcome email could not be sent to \${maskEmail(adminEmail)}\`);
      }
    } catch (error) {
      logger.error(\`Asynchronous ORGANIZATION_CREATED dispatch failed: \${error.message}\`);
    }
  });
`;

if (!content.includes("orgEventEmitter.on('ORGANIZATION_CREATED'")) {
  content = content.replace("logger.info('[Organization] Event listeners initialized.');", newListener + "\\n  logger.info('[Organization] Event listeners initialized.');");
  fs.writeFileSync(file, content, 'utf8');
  console.log('Added ORGANIZATION_CREATED listener');
} else {
  console.log('Listener already exists');
}
