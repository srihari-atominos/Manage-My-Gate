import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate';

async function fixPhoneIndex() {
  console.log('--- Manage-My-Gate: Users Phone Index Migration ---');
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB successfully.');

  const usersColl = mongoose.connection.collection('users');

  // 1. Identify and unset literal null and empty string phone fields
  const nullDocsBefore = await usersColl.countDocuments({ phone: { $exists: true, $eq: null } });
  const emptyDocsBefore = await usersColl.countDocuments({ phone: '' });
  console.log(`Found ${nullDocsBefore} document(s) with explicit null phone.`);
  console.log(`Found ${emptyDocsBefore} document(s) with empty string phone.`);

  if (nullDocsBefore > 0 || emptyDocsBefore > 0) {
    const updateResult = await usersColl.updateMany(
      { $or: [{ phone: null }, { phone: '' }] },
      { $unset: { phone: 1 } }
    );
    console.log(`Unset phone field on ${updateResult.modifiedCount} document(s).`);
  } else {
    console.log('No documents with explicit null or empty phone found.');
  }

  // 2. Check existing indexes
  const existingIndexes = await usersColl.indexes();
  console.log('Current indexes on users collection:');
  existingIndexes.forEach(idx => console.log(` - ${idx.name}: key=${JSON.stringify(idx.key)} unique=${!!idx.unique} partial=${JSON.stringify(idx.partialFilterExpression || null)}`));

  const phoneIdx = existingIndexes.find(i => i.name === 'phone_1' || (i.key && i.key.phone === 1));

  if (phoneIdx) {
    console.log(`Dropping existing index: '${phoneIdx.name}'...`);
    await usersColl.dropIndex(phoneIdx.name);
    console.log(`Successfully dropped index '${phoneIdx.name}'.`);
  }

  // 3. Create partial unique index
  console.log("Creating new partial unique index 'phone_1' with partialFilterExpression: { phone: { $type: 'string', $gt: '' } }...");
  await usersColl.createIndex(
    { phone: 1 },
    {
      name: 'phone_1',
      unique: true,
      partialFilterExpression: { phone: { $type: 'string', $gt: '' } },
      background: true
    }
  );
  console.log("Successfully created partial unique index 'phone_1'.");

  // 4. Verify new index
  const updatedIndexes = await usersColl.indexes();
  const verifiedPhoneIdx = updatedIndexes.find(i => i.name === 'phone_1');
  console.log('Verified phone_1 index configuration:');
  console.log(JSON.stringify(verifiedPhoneIdx, null, 2));

  console.log('\nMigration completed successfully! Users can now delete accounts or register without phone collisions.');
  await mongoose.disconnect();
  process.exit(0);
}

fixPhoneIndex().catch(err => {
  console.error('Migration failed with error:', err);
  process.exit(1);
});
