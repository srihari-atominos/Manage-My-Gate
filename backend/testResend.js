import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { decrypt } from './src/features/integrationHub/utils/crypto.util.js';
import IntegrationHub from './src/features/integrationHub/integrationHub.model.js';

dotenv.config();

async function testResend() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate');
    
    const resendIntegration = await IntegrationHub.findOne({ provider: 'resend', status: 'connected' });
    if (resendIntegration) {
      const apiKeyCred = resendIntegration.credentials.find((c) => c.key === 'apiKey');
      if (apiKeyCred) {
        const apiKey = decrypt(apiKeyCred.encryptedValue, apiKeyCred.iv);
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: 'ManageMyGate <onboarding@resend.dev>',
            to: ['naveenpv5886@gmail.com'],
            subject: 'Test OTP',
            html: '<p>Test</p>',
          }),
        });

        console.log("Status:", response.status);
        const data = await response.json();
        console.log("Response:", data);
      }
    } else {
      console.log("Resend not connected");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

testResend();
