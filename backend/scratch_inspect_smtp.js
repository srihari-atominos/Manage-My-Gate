import mongoose from 'mongoose';
import IntegrationHub from './src/features/integrationHub/integrationHub.model.js';
import { decrypt } from './src/features/integrationHub/utils/crypto.util.js';

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  const smtp = await IntegrationHub.findOne({ provider: 'smtp' });
  if (smtp && smtp.credentials) {
    console.log('Account Label:', smtp.accountLabel, 'Status:', smtp.status);
    for (const c of smtp.credentials) {
      const val = decrypt(c.encryptedValue, c.iv);
      console.log(c.key, '=>', val ? (c.key.includes('Pass') ? '****' : val) : 'null');
    }
  } else {
    console.log('No SMTP integration record found.');
  }
  await mongoose.disconnect();
}

check();
