import mongoose from 'mongoose';
import dotenv from 'dotenv';
import IntegrationHub from './src/features/integrationHub/integrationHub.model.js';
import { decrypt } from './src/features/integrationHub/utils/crypto.util.js';

dotenv.config();

async function testMC() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate');
    
    const mcIntegration = await IntegrationHub.findOne({ provider: 'messagecentral', status: 'connected' });
    if (!mcIntegration) {
      console.log('No Message Central integration found.');
      return;
    }
    const getCred = (key) => {
      const cred = mcIntegration.credentials.find((c) => c.key === key);
      return cred ? decrypt(cred.encryptedValue, cred.iv) : null;
    };
    const customerId = getCred('customerId');
    const authToken = getCred('authToken');
    const countryCode = getCred('countryCode');
    
    console.log("Creds:", { customerId, authToken: authToken ? '***' : null, countryCode });
    
    const base64Key = Buffer.from(authToken).toString('base64');
    const tokenUrl = `https://cpaas.messagecentral.com/auth/v1/authentication/token?customerId=${encodeURIComponent(customerId)}&key=${encodeURIComponent(base64Key)}&scope=NEW&country=${encodeURIComponent(countryCode)}`;
    const tokenRes = await fetch(tokenUrl, { method: 'GET' });
    
    if (tokenRes.ok) {
      const tokenData = await tokenRes.json();
      console.log("Got Token:", tokenData);
      const jwt = tokenData.token;

      const identifier = '9786608686';
      const code = '123456';
      const mobileNumber = identifier.replace(/^\+\d+\s*/, '');
      
      const sendUrl = `https://cpaas.messagecentral.com/verification/v3/send?countryCode=${countryCode}&customerId=${customerId}&flowType=SMS&mobileNumber=${mobileNumber}&otp=${code}`;
      const sendRes = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'authToken': jwt,
        }
      });
      
      console.log("Send Status:", sendRes.status, sendRes.statusText);
      const resText = await sendRes.text();
      console.log("Send Body:", resText);
    } else {
      console.log("Token Fetch Failed:", tokenRes.status, tokenRes.statusText);
      console.log("Token Body:", await tokenRes.text());
    }
    
  } catch (error) {
    console.error("Test Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

testMC();
