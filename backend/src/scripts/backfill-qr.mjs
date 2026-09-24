import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/database_name';

async function backfill() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.collection('amenity_management_access_passes');
  
  const allPasses = await db.find({}).toArray();
  console.log(`Total passes in DB: ${allPasses.length}`);
  
  let updated = 0;
  for (const pass of allPasses) {
    if (!pass.qrData || pass.qrData.length === 0) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const passTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      await db.updateOne(
        { _id: pass._id },
        { $set: { qrData: rawToken, passTokenHash: passTokenHash } }
      );
      updated++;
    }
  }
  
  console.log(`Updated ${updated} passes.`);
  await mongoose.disconnect();
}
backfill().catch(console.error);
