import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate';

async function checkInvoices() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const invoices = await db.collection('invoices').find({ status: 'UNPAID' }).toArray();
    console.log(`Found ${invoices.length} UNPAID invoices.`);
    
    for (const inv of invoices) {
      console.log(`Invoice ID: ${inv._id}, targetUserId: ${inv.targetUserId}, paymentLink: ${inv.paymentLink ? 'EXISTS (' + inv.paymentLink + ')' : 'MISSING'}, orgId: ${inv.orgId}`);
    }
    
    const users = await db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users in DB.`);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkInvoices();
