import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { decrypt } from './src/features/integrationHub/utils/crypto.util.js';
import IntegrationHub from './src/features/integrationHub/integrationHub.model.js';
import nodemailer from 'nodemailer';

dotenv.config();

async function testSMTP() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate');
    
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

      console.log("SMTP Config:", { host, port, authUsername, authPassword: '***' });

      if (host && port && authUsername && authPassword) {
        const transporter = nodemailer.createTransport({
          host,
          port: parseInt(port, 10),
          secure: parseInt(port, 10) === 465,
          auth: {
            user: authUsername,
            pass: authPassword,
          },
        });

        const info = await transporter.sendMail({
          from: `"${smtpIntegration.accountLabel}" <${authUsername}>`,
          to: 'naveenpv5886@gmail.com',
          subject: 'Test OTP',
          html: '<p>Test SMTP OTP</p>',
        });

        console.log("SMTP Success, messageId:", info.messageId);
      }
    } else {
      console.log("SMTP not connected");
    }
  } catch (error) {
    console.error("SMTP Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

testSMTP();
