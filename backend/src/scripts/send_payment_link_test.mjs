import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import IntegrationHub from '../features/integrationHub/integrationHub.model.js';
import { decrypt } from '../features/integrationHub/utils/crypto.util.js';

async function sendTestPaymentEmail() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';
  await mongoose.connect(mongoUri);

  try {
    const recipientEmail = 'naveenpv5886@gmail.com';
    const orgName = 'Green Villa';
    const amount = 186300;
    const currency = 'INR';
    const paymentLink = 'http://localhost:3004/#/pay/6a7c01a500a96d5851073868';

    console.log(`Checking email provider integrations for ${recipientEmail}...`);

    const smtpIntegration = await IntegrationHub.findOne({ provider: 'smtp', status: 'connected' });
    if (smtpIntegration) {
      const getCred = (key) => {
        const cred = smtpIntegration.credentials.find((c) => c.key === key);
        return cred ? decrypt(cred.encryptedValue, cred.iv) : null;
      };
      const host = getCred('host');
      const port = getCred('port');
      const authUsername = getCred('authUsername');
      const authPassword = getCred('authPassword');

      const nodemailer = (await import('nodemailer')).default;
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port, 10),
        secure: parseInt(port, 10) === 465,
        auth: { user: authUsername, pass: authPassword },
      });

      console.log('Sending Payment Link email via Gmail SMTP...');
      const info = await transporter.sendMail({
        from: `"${smtpIntegration.accountLabel}" <${authUsername}>`,
        to: recipientEmail,
        subject: `Payment Request & Order Confirmation — ${orgName}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #2563eb;">Manage-My-Gate</h2>
            <h3>Order & Payment Link Generated</h3>
            <p>Dear Customer,</p>
            <p>Your order for <strong>${orgName}</strong> has been generated successfully.</p>
            <p style="font-size: 16px;">Total Amount: <strong>₹${amount.toLocaleString()} ${currency}</strong></p>
            <div style="margin: 25px 0;">
              <a href="${paymentLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Click Here to Complete Payment</a>
            </div>
            <p style="color: #6b7280; font-size: 13px;">If you have any questions, please contact our support team.</p>
          </div>
        `,
      });
      console.log('Successfully dispatched Payment Link email to', recipientEmail, 'MessageId:', info.messageId);
    } else {
      console.log('No connected Resend integration found in IntegrationHub.');
    }
  } catch (err) {
    console.error('Failed to send email:', err);
  } finally {
    await mongoose.disconnect();
  }
}

sendTestPaymentEmail();
