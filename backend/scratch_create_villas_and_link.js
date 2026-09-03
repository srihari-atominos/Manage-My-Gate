import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Villa from './src/features/villa/villa.model.js';
import User from './src/features/user/user.model.js';

const MONGODB_URI = process.env.MONGODB_URI;
const ORG_ID = '6a9513437911e056d83636ea';
const DOMAIN = 'globalcom927.com';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing villas for this org (if any)
  await Villa.deleteMany({ orgId: ORG_ID });

  // Fetch all users we need to link
  const owner1 = await User.findOne({ email: `owner@${DOMAIN}` });
  const tenant1 = await User.findOne({ email: `tenant@${DOMAIN}` });
  const owner2 = await User.findOne({ email: `owner2@${DOMAIN}` });
  const tenant2 = await User.findOne({ email: `tenant2@${DOMAIN}` });
  const family1 = await User.findOne({ email: `family1@${DOMAIN}` });
  const family2 = await User.findOne({ email: `family2@${DOMAIN}` });

  // 1. Create Villa A-101
  const villa1 = await Villa.create({
    orgId: ORG_ID,
    unitNumber: '101',
    villaNumber: '101', // Explicitly set to avoid index violation
    blockOrBuilding: 'Block A',
    status: 'Occupied',
    ownerId: owner1._id,
    primaryResidentId: owner1._id,
    residents: [
      { userId: owner1._id, residencyType: 'Owner', isPrimary: true },
      { userId: family1._id, residencyType: 'Family', isPrimary: false }
    ]
  });
  console.log('Created Villa A-101:', villa1._id);

  // Link users to Villa A-101
  await User.updateOne({ _id: owner1._id }, { $set: { villaId: villa1._id, residencyType: 'Owner' } });
  await User.updateOne({ _id: family1._id }, { $set: { villaId: villa1._id, residencyType: 'Family' } });

  // 2. Create Villa A-102
  const villa2 = await Villa.create({
    orgId: ORG_ID,
    unitNumber: '102',
    villaNumber: '102',
    blockOrBuilding: 'Block A',
    status: 'Occupied',
    primaryResidentId: tenant1._id,
    residents: [
      { userId: tenant1._id, residencyType: 'Tenant', isPrimary: true }
    ]
  });
  console.log('Created Villa A-102:', villa2._id);

  // Link users to Villa A-102
  await User.updateOne({ _id: tenant1._id }, { $set: { villaId: villa2._id, residencyType: 'Tenant' } });

  // 3. Create Villa B-201
  const villa3 = await Villa.create({
    orgId: ORG_ID,
    unitNumber: '201',
    villaNumber: '201',
    blockOrBuilding: 'Block B',
    status: 'Occupied',
    ownerId: owner2._id,
    primaryResidentId: owner2._id,
    residents: [
      { userId: owner2._id, residencyType: 'Owner', isPrimary: true },
      { userId: family2._id, residencyType: 'Family', isPrimary: false }
    ]
  });
  console.log('Created Villa B-201:', villa3._id);

  // Link users to Villa B-201
  await User.updateOne({ _id: owner2._id }, { $set: { villaId: villa3._id, residencyType: 'Owner' } });
  await User.updateOne({ _id: family2._id }, { $set: { villaId: villa3._id, residencyType: 'Family' } });

  // 4. Create Villa B-202
  const villa4 = await Villa.create({
    orgId: ORG_ID,
    unitNumber: '202',
    villaNumber: '202',
    blockOrBuilding: 'Block B',
    status: 'Occupied',
    primaryResidentId: tenant2._id,
    residents: [
      { userId: tenant2._id, residencyType: 'Tenant', isPrimary: true }
    ]
  });
  console.log('Created Villa B-202:', villa4._id);

  // Link users to Villa B-202
  await User.updateOne({ _id: tenant2._id }, { $set: { villaId: villa4._id, residencyType: 'Tenant' } });

  console.log('Successfully created and linked all villas!');
  process.exit(0);
}

run().catch(console.error);
