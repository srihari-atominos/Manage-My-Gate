import logger from './logger.utils.js';
import { getSmtpTransporter } from './email.utils.js';

class EmailService {
  async sendWelcomeEmail({ to, organizationName, loginUrl }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Manage-My-Gate, ${organizationName}!</h2>
        <p style="color: #555; font-size: 16px;">Your workspace has been successfully provisioned and is ready for use.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="padding: 12px 24px; background-color: #3399cc; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Workspace</a>
        </p>
        <br/>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="color: #777; font-size: 14px;">Best regards,</p>
        <p style="color: #333; font-weight: bold; font-size: 14px;">Manage My Gate Team</p>
      </div>
    `;

    try {
      const smtpObj = await getSmtpTransporter();
      if (!smtpObj) {
        logger.warn(`Failed to send Welcome email to ${to}: SMTP credentials unavailable`);
        return;
      }
      const { transporter, from } = smtpObj;
      await transporter.sendMail({
        from,
        to,
        subject: 'Welcome to Manage-My-Gate',
        html,
      });
      logger.info(`Welcome email sent to ${to}`);
    } catch (error) {
      logger.error(`Failed to send Welcome email to ${to}:`, error);
      throw error;
    }
  }

  async sendPaymentReceipt({ to, organizationName, invoiceId, invoicePath }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Payment Receipt - ${invoiceId}</h2>
        <p style="color: #555; font-size: 16px;">Dear ${organizationName},</p>
        <p style="color: #555; font-size: 16px;">Thank you for your payment. Your subscription renewal was successful.</p>
        <p style="color: #555; font-size: 16px;">Please find attached your GST-compliant PDF invoice.</p>
        <br/>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="color: #777; font-size: 14px;">Best regards,</p>
        <p style="color: #333; font-weight: bold; font-size: 14px;">Manage My Gate Team</p>
      </div>
    `;

    try {
      const smtpObj = await getSmtpTransporter();
      if (!smtpObj) {
        logger.warn(`Failed to send Payment Receipt to ${to}: SMTP credentials unavailable`);
        return;
      }
      const { transporter, from } = smtpObj;
      await transporter.sendMail({
        from,
        to,
        subject: `Payment Receipt: ${invoiceId}`,
        html,
        attachments: invoicePath ? [
          {
            filename: `Invoice_${invoiceId}.pdf`,
            path: invoicePath
          }
        ] : []
      });
      logger.info(`Payment receipt sent to ${to} for invoice ${invoiceId}`);
    } catch (error) {
      logger.error(`Failed to send Payment Receipt to ${to}:`, error);
      throw error;
    }
  }

  async sendExpiryWarning({ to, organizationName, daysRemaining, renewalUrl }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d9534f;">Subscription Expiring Soon!</h2>
        <p style="color: #555; font-size: 16px;">Dear ${organizationName},</p>
        <p style="color: #555; font-size: 16px;">Your Manage-My-Gate subscription is expiring in <strong style="color: #d9534f;">${daysRemaining} days</strong>.</p>
        <p style="color: #555; font-size: 16px;">Please renew your subscription to avoid service interruption.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${renewalUrl}" style="padding: 12px 24px; background-color: #f0ad4e; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">Renew Now</a>
        </p>
        <br/>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="color: #777; font-size: 14px;">Best regards,</p>
        <p style="color: #333; font-weight: bold; font-size: 14px;">Manage My Gate Team</p>
      </div>
    `;

    try {
      const smtpObj = await getSmtpTransporter();
      if (!smtpObj) {
        logger.warn(`Failed to send Expiry Warning to ${to}: SMTP credentials unavailable`);
        return;
      }
      const { transporter, from } = smtpObj;
      await transporter.sendMail({
        from,
        to,
        subject: 'Action Required: Subscription Expiring',
        html,
      });
      logger.info(`Expiry warning sent to ${to}`);
    } catch (error) {
      logger.error(`Failed to send Expiry Warning to ${to}:`, error);
      throw error;
    }
  }
}

export default new EmailService();
