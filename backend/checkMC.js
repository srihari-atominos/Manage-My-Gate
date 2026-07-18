import mongoose from 'mongoose';
import dotenv from 'dotenv';
import IntegrationHub from './src/features/integrationHub/integrationHub.model.js';
import { decrypt } from './src/features/integrationHub/utils/crypto.util.js';

dotenv.config();

async function checkMC() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate');
    
    const mcIntegration = await IntegrationHub.findOne({ provider: 'messagecentral' });
    if (!mcIntegration) {
      console.log('No Message Central integration found.');
      return;
    }
    const getCred = (key) => {
      const cred = mcIntegration.credentials.find((c) => c.key === key);
      return cred ? decrypt(cred.encryptedValue, cred.iv) : null;
    };
    const authToken = getCred('authToken');
    
    console.log("authToken length:", authToken?.length);
    console.log("Is it base64-like?", /^[A-Za-z0-9+/=]+$/.test(authToken));
    console.log("Raw authToken:", authToken); // print it just to see if it has dots or special chars
    
  } catch (error) {
    console.error("Test Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkMC();
