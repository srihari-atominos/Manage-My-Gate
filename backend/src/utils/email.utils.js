import nodemailer from 'nodemailer';
import logger from './logger.utils.js';

export const getSmtpTransporter = async (orgId = null) => {
  try {
    const integrationHubService = (await import('../features/integrationHub/integrationHub.service.js')).default;

    let smtpIntegration = null;
    if (orgId) {
      smtpIntegration = await integrationHubService.findSmtpConnection(orgId).catch(() => null);
    }

    let credentialsDecrypted = false;
    let host = null;
    let port = null;
    let authUsername = null;
    let authPassword = null;

    if (smtpIntegration && smtpIntegration.credentials && smtpIntegration.credentials.length > 0) {
      try {
        const { decrypt } = await import('../features/integrationHub/utils/crypto.util.js');
        const getCred = (key) => {
          const cred = smtpIntegration.credentials.find((c) => c.key === key);
          return cred ? decrypt(cred.encryptedValue, cred.iv) : null;
        };

        const decryptedHost = getCred('host');
        const decryptedPort = parseInt(getCred('port'), 10);
        const decryptedUser = getCred('authUsername');
        const decryptedPass = getCred('authPassword');

        if (decryptedHost && decryptedUser && decryptedPass) {
          host = decryptedHost;
          port = decryptedPort || 587;
          authUsername = decryptedUser;
          authPassword = decryptedPass;
          credentialsDecrypted = true;
        }
      } catch (decryptErr) {
        logger.warn(`[getSmtpTransporter] Failed to decrypt SMTP credentials for organization ${orgId}: ${decryptErr.message}. Falling back to system configuration if available.`);
      }
    }

    // Platform / System fallback when organization has no active SMTP integration
    if (!credentialsDecrypted) {
      host = process.env.SYSTEM_SMTP_HOST || process.env.SMTP_HOST;
      port = parseInt(process.env.SYSTEM_SMTP_PORT || process.env.SMTP_PORT || '587', 10);
      authUsername = process.env.SYSTEM_SMTP_USER || process.env.SMTP_USER || process.env.GMAIL_USER;
      authPassword = process.env.SYSTEM_SMTP_PASS || process.env.SMTP_PASS || process.env.GMAIL_PASS;
    }

    if (!host || !authUsername || !authPassword) {
      logger.warn(`[getSmtpTransporter] SMTP credentials not configured for organization ${orgId || 'unspecified'} and no valid system fallback found.`);
      return null;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: authUsername, pass: authPassword },
      connectionTimeout: 5000,
    });

    const senderName = credentialsDecrypted
      ? (smtpIntegration?.accountLabel || 'Manage My Gate')
      : (process.env.SYSTEM_SMTP_FROM_NAME || 'Manage My Gate');

    return {
      transporter,
      from: `"${senderName}" <${authUsername}>`,
      authUsername,
    };
  } catch (err) {
    logger.error('[getSmtpTransporter] Error creating transporter:', err.message);
    return null;
  }
};

export const sendEmail = async (orgId, to, subject, htmlBody) => {
  try {
    const smtpObj = await getSmtpTransporter(orgId);
    if (!smtpObj) {
      logger.warn(`SMTP integration not configured or credentials missing. Email not sent to ${to}`);
      return false;
    }

    const { transporter, from } = smtpObj;

    const mailOptions = {
      from,
      to,
      subject,
      html: htmlBody,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Email successfully sent to ${to}`);
    return true;
  } catch (error) {
    logger.error(`Error sending email to ${to}:`, error);
    return false;
  }
};
