// Test script mimicking exactly what the mobile app sends for bulk upload
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  
  // 1. Find the user and org
  const user = await db.collection('users').findOne({ email: 'naveenpvn1702@gmail.com' });
  console.log('User found:', user?.email, user?._id, 'Phone:', user?.phone, 'Status:', user?.status);

  const adminUser = await db.collection('users').findOne({ email: 'naveenpv5886@gmail.com' });
  console.log('Admin found:', adminUser?.email, adminUser?._id);

  const membership = await db.collection('orgmemberships').findOne({ userId: adminUser._id });
  const orgId = membership.orgId.toString();
  console.log('OrgId:', orgId);

  // Check naveenpvn1702 membership
  const targetMembership = await db.collection('orgmemberships').findOne({ userId: user?._id });
  console.log('Target user membership:', targetMembership?.status, 'roleId:', targetMembership?.roleId);

  // 2. Delete all existing villas to start clean
  await db.collection('villas').deleteMany({ orgId: membership.orgId });
  console.log('Cleared all villas');

  // 3. Import the villa service and simulate exact bulk upload
  const villaService = (await import('./src/features/villa/villa.services.js')).default;
  
  // This is EXACTLY what the mobile app sends after parsing the Excel
  const villasArray = [{
    unitNumber: '105',
    blockOrBuilding: 'Block A',
    floor: 4,
    type: 'Apartment',
    floorAreaSqFt: 1200,
    status: 'Occupied',
    name: 'Naveen',
    email: 'naveenpvn1702@gmail.com',
    residentType: 'Tenant',  // Mobile parser converts "Resident Tenant" -> "Tenant"
    phone: '95971 27158'
  }];

  console.log('\n--- Starting bulkUploadVillasAndResidents ---');
  console.log('Payload:', JSON.stringify(villasArray, null, 2));

  try {
    const result = await villaService.bulkUploadVillasAndResidents(villasArray, orgId, 'WEB');
    console.log('\n--- RESULT ---');
    console.log('Successes:', JSON.stringify(result.successes, null, 2));
    console.log('Failures:', JSON.stringify(result.failures, null, 2));
    
    // 4. Check the villa in DB
    const villa = await db.collection('villas').findOne({ unitNumber: '105', orgId: membership.orgId });
    console.log('\n--- VILLA IN DB ---');
    console.log('Unit:', villa?.unitNumber, 'Residents:', JSON.stringify(villa?.residents));
  } catch (err) {
    console.error('BULK UPLOAD ERROR:', err.message);
    console.error('Stack:', err.stack);
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
