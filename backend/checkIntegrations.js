import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkIntegrations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate');
    
    const integrations = await mongoose.connection.db.collection('integrationhubs').find({ status: 'connected' }).toArray();
    console.log("Connected Integrations:", integrations.map(i => i.provider));
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkIntegrations();
