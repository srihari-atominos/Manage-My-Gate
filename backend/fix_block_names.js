/**
 * fix_block_names.js
 * Updates blockOrBuilding values in Villa collection to match
 * the exact strings used by the frontend filter dropdown.
 *
 * Before (seed):  "Block A (Studio Wing)", "Block B (Apartment Tower)", etc.
 * After  (fixed): "Block A", "Block B", "Block C", "Block D"
 *
 * Run: node fix_block_names.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_my_gate_dev';

import Villa from './src/features/villa/villa.model.js';
import Organization from './src/features/organization/organization.model.js';

const BLOCK_MAP = {
  'Block A (Studio Wing)':    'Block A',
  'Block B (Apartment Tower)':'Block B',
  'Block C (Villa Enclave)':  'Block C',
  'Block D (Penthouse)':      'Block D',
};

async function run() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║      Fix Block Names — DB Patch          ║');
  console.log('╚══════════════════════════════════════════╝\n');

  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected to MongoDB.\n');

  const org = await Organization.findOne({ name: 'Greenfield Heights Community' });
  if (!org) {
    console.error('❌  Org not found.');
    process.exit(1);
  }

  let totalUpdated = 0;

  for (const [oldName, newName] of Object.entries(BLOCK_MAP)) {
    const result = await Villa.updateMany(
      { orgId: org._id, blockOrBuilding: oldName },
      { $set: { blockOrBuilding: newName } }
    );
    console.log(`   "${oldName}" → "${newName}"  |  ${result.modifiedCount} units updated.`);
    totalUpdated += result.modifiedCount;
  }

  console.log(`\n✔  Total units updated: ${totalUpdated}`);
  console.log('✔  Block names normalised. Frontend filter will now work correctly.\n');

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

run().catch((err) => {
  console.error('❌ FAILED:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
