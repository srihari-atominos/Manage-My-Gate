import { sendEmail } from '../utils/email.utils.js';
import mongoose from 'mongoose';

async function testGmailDispatch() {
  console.log('--- Testing Live Gmail Message Delivery ---');
  try {
    const dbUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage-my-gate';
    await mongoose.connect(dbUrl);
    console.log('Connected to MongoDB.');

    const recipient = 'naveenpv5886@gmail.com';
    const subject = '[Manage My Gate] Direct Message Test via Gmail';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb; margin-top: 0;">Message from Manage My Gate SuperAdmin</h2>
        <p style="font-size: 15px; color: #334155; line-height: 1.6;">
          Hi Naveen! This is a test email sent directly via your connected Gmail SMTP integration in the Manage My Gate CRM platform.
        </p>
        <div style="background-color: #f1f5f9; padding: 14px; border-radius: 6px; margin: 16px 0; font-size: 14px; color: #1e293b;">
          <strong>Channel:</strong> GMAIL<br/>
          <strong>Sender:</strong> SuperAdmin Support<br/>
          <strong>Status:</strong> Dispatched Live
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b;">Manage My Gate CRM Platform</p>
      </div>
    `;

    const success = await sendEmail(null, recipient, subject, html);
    console.log('sendEmail Result:', success ? 'SUCCESS ✅ (Email Delivered)' : 'FAILED ❌');
  } catch (err) {
    console.error('Error during test execution:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testGmailDispatch();
