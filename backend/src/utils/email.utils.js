import nodemailer from 'nodemailer';
import integrationHubService from '../features/integrationHub/integrationHub.service.js';
import logger from './logger.utils.js';

export const sendEmail = async (orgId, to, subject, htmlBody) => {
  try {
    const smtpConnection = await integrationHubService.findSmtpConnection(orgId);
    if (!smtpConnection) {
      logger.warn(`SMTP integration not configured for org ${orgId}. Email not sent to ${to}`);
      return false;
    }

    const credentials = await integrationHubService.getDecryptedCredentialsById(smtpConnection._id);

    const transporter = nodemailer.createTransport({
      host: credentials.host,
      port: parseInt(credentials.port, 10),
      secure: parseInt(credentials.port, 10) === 465,
      auth: {
        user: credentials.authUsername,
        pass: credentials.authPassword,
      }
    });

    const mailOptions = {
      from: `"${smtpConnection.name}" <${credentials.authUsername}>`,
      to,
      subject,
      html: htmlBody
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}`);
    return true;
  } catch (error) {
    logger.error(`Error sending email to ${to}:`, error);
    return false;
  }
};
