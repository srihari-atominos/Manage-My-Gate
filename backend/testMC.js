import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { decrypt } from './src/features/integrationHub/utils/crypto.util.js';
import IntegrationHub from './src/features/integrationHub/integrationHub.model.js';

dotenv.config();

async function testMC() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate');
    const mcIntegration = await IntegrationHub.findOne({ provider: 'messagecentral', status: 'connected' });
    if (mcIntegration) {
      const getCred = (key) => {
        const cred = mcIntegration.credentials.find((c) => c.key === key);
        return cred ? decrypt(cred.encryptedValue, cred.iv) : null;
      };
      const customerId = getCred('customerId');
      const authToken = getCred('authToken');
      const countryCode = getCred('countryCode');
      const base64Key = Buffer.from(authToken).toString('base64');
      
      const tokenUrl = `https://cpaas.messagecentral.com/auth/v1/authentication/token?customerId=${encodeURIComponent(customerId)}&key=${encodeURIComponent(base64Key)}&scope=NEW&country=${encodeURIComponent(countryCode)}`;
      const tokenRes = await fetch(tokenUrl, { method: 'GET' });
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        const jwt = tokenData.token;

        const sendUrl = `https://cpaas.messagecentral.com/sms/v1/send`;
        const params = new URLSearchParams();
        params.append('mobileNumber', '919786608686');
        params.append('message', 'Your OTP is 123456');
        
        console.log("Trying:", sendUrl);
        const sendRes = await fetch(sendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'authToken': jwt,
          },
          body: params
        });
        
        console.log("Status:", sendRes.status, sendRes.statusText);
        const text = await sendRes.text();
        console.log("Response:", text);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

testMC();
