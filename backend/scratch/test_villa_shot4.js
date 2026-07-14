import mongoose from 'mongoose';
import config from '../src/config/config.js';
import villaService from '../src/features/villa/villa.services.js';
import Villa from '../src/features/villa/villa.model.js';
import User from '../src/features/user/user.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';

async function runTests() {
  console.log('--- Connecting to Test Database ---');
  await mongoose.connect(config.mongodb.uri);
  console.log('✓ Connected successfully.');

  try {
    // 1. Sync indexes
    console.log('\n--- Syncing Indexes ---');
    await Villa.collection.dropIndexes().catch(() => {});
    await Villa.syncIndexes();
    console.log('✓ Villa Indexes synced.');

    // 2. Prepare mock data
    console.log('\n--- Preparing Mock Data ---');
    const orgId = new mongoose.Types.ObjectId();
    
    const user = await User.create({
      email: `test-resident-${Date.now()}@example.com`,
      username: `testresident_${Date.now()}`,
      status: 'Active',
      password: 'mockpassword123'
    });

    const membership = await OrgMembership.create({
      userId: user._id,
      orgId,
      residentType: 'None'
    });

    const villa = await Villa.create({
      orgId,
      unitNumber: `Suite-${Date.now()}`,
      status: 'Vacant',
      type: 'Penthouse'
    });

    console.log(`Created Mock User: ${user._id}`);
    console.log(`Created Mock Unit: ${villa._id}`);

    // 3. Test assignExistingUser
    console.log('\n--- Testing assignExistingUser ---');
    const updatedVilla = await villaService.assignExistingUser(
      villa._id,
      user._id,
      'Resident Owner',
      orgId
    );

    // Asserts
    if (updatedVilla.residents.length !== 1) {
      throw new Error(`Expected residents length to be 1, got ${updatedVilla.residents.length}`);
    }
    const residentSub = updatedVilla.residents[0];
    if (String(residentSub.userId) !== String(user._id)) {
      throw new Error('Resident sub-document userId mismatch');
    }
    if (residentSub.residencyType !== 'Resident Owner') {
      throw new Error(`Resident sub-document residencyType mismatch. Expected 'Resident Owner', got '${residentSub.residencyType}'`);
    }

    // Verify User sync
    const checkUser = await User.findById(user._id);
    if (String(checkUser.villaId) !== String(villa._id) || checkUser.residencyType !== 'Resident Owner') {
      throw new Error('User document profiles not synced correctly!');
    }

    // Verify OrgMembership sync
    const checkMembership = await OrgMembership.findOne({ userId: user._id, orgId });
    if (String(checkMembership.villaId) !== String(villa._id) || checkMembership.residentType !== 'Owner') {
      throw new Error(`OrgMembership profile not synced! residentType: ${checkMembership.residentType}`);
    }
    console.log('✓ assignExistingUser completed and verified successfully.');

    // 4. Test updateResidencyType
    console.log('\n--- Testing updateResidencyType ---');
    const updatedVilla2 = await villaService.updateResidencyType(
      villa._id,
      user._id,
      'Staff',
      orgId
    );

    const residentSub2 = updatedVilla2.residents[0];
    if (residentSub2.residencyType !== 'Staff') {
      throw new Error(`Residency type not updated in sub-document! Got '${residentSub2.residencyType}'`);
    }

    const checkUser2 = await User.findById(user._id);
    if (checkUser2.residencyType !== 'Staff') {
      throw new Error('User profile residencyType not updated!');
    }

    const checkMembership2 = await OrgMembership.findOne({ userId: user._id, orgId });
    if (checkMembership2.residentType !== 'Guest') {
      throw new Error(`OrgMembership residentType not updated! Got: ${checkMembership2.residentType}`);
    }
    console.log('✓ updateResidencyType completed and verified successfully.');

    // 5. Test removeResident
    console.log('\n--- Testing removeResident ---');
    const updatedVilla3 = await villaService.removeResident(
      villa._id,
      user._id,
      orgId
    );

    if (updatedVilla3.residents.length !== 0) {
      throw new Error('Resident was not removed from sub-document array!');
    }
    if (updatedVilla3.status !== 'Vacant') {
      throw new Error(`Expected status to return to 'Vacant', got '${updatedVilla3.status}'`);
    }

    const checkUser3 = await User.findById(user._id);
    if (checkUser3.villaId !== null || checkUser3.residencyType !== 'None') {
      throw new Error('User profile was not cleared!');
    }

    const checkMembership3 = await OrgMembership.findOne({ userId: user._id, orgId });
    if (checkMembership3.villaId !== null || checkMembership3.residentType !== 'None') {
      throw new Error('OrgMembership was not cleared!');
    }
    console.log('✓ removeResident completed and verified successfully.');

    console.log('\n======================================');
    console.log('ALL SHOT 4 BACKEND VERIFICATIONS PASSED!');
    console.log('======================================');

    // Clean up
    await Villa.findByIdAndDelete(villa._id);
    await User.findByIdAndDelete(user._id);
    await OrgMembership.findByIdAndDelete(membership._id);
    
    process.exit(0);
  } catch (error) {
    console.error('VERIFICATION FAILED:', error.message);
    process.exit(1);
  }
}

runTests();
