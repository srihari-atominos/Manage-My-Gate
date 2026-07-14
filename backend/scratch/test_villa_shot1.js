import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Villa from '../src/features/villa/villa.model.js';
import villaRepository from '../src/features/villa/villa.repository.js';
import { createVillaRules, updateVillaRules } from '../src/features/villa/villa.validateRules.js';
import { validationResult } from 'express-validator';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gated_community';

async function testValidators() {
  console.log('\n--- Testing Validators ---');

  // Test 1: Invalid payload for creation
  let req = {
    body: {
      orgId: 'invalid-id',
      unitNumber: '',
      type: 'PenthouseSuite', // Invalid enum
      status: 'UnknownStatus', // Invalid enum
      primaryResidentId: 'invalid-resident',
      floorAreaSqFt: 'not-a-number'
    }
  };

  for (const rule of createVillaRules) {
    await rule.run(req);
  }
  let errors = validationResult(req);
  console.log('Validation errors for bad payload (Expected errors):', errors.array().map(e => e.msg));
  if (errors.isEmpty()) {
    throw new Error('Validator failed to catch invalid create payload');
  }

  // Test 2: Valid payload for creation
  const validOrgId = new mongoose.Types.ObjectId().toString();
  req = {
    body: {
      orgId: validOrgId,
      unitNumber: 'V-101',
      type: 'Villa',
      status: 'Vacant',
      floorAreaSqFt: 2500
    }
  };

  for (const rule of createVillaRules) {
    await rule.run(req);
  }
  errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new Error('Validator rejected a valid create payload: ' + JSON.stringify(errors.array()));
  }
  console.log('✓ Create Validator passed valid payload successfully.');

  // Test 3: Invalid payload for update
  req = {
    body: {
      unitNumber: '', // Cannot be empty
      status: 'InvalidStatus'
    }
  };
  for (const rule of updateVillaRules) {
    await rule.run(req);
  }
  errors = validationResult(req);
  console.log('Validation errors for bad update payload (Expected errors):', errors.array().map(e => e.msg));
  if (errors.isEmpty()) {
    throw new Error('Validator failed to catch invalid update payload');
  }
  console.log('✓ Update Validator verified successfully.');
}

async function testDatabase() {
  console.log('\n--- Testing Database Schema and Repository ---');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', MONGO_URI);

  // Clean up any old test data and old indexes
  await Villa.deleteMany({});
  try {
    await Villa.collection.dropIndexes();
    console.log('Old indexes dropped.');
  } catch (err) {
    console.log('No indexes to drop or index drop failed (could be normal if collection is empty).');
  }
  await Villa.syncIndexes();
  console.log('Indexes synced.');

  const orgId1 = new mongoose.Types.ObjectId();
  const orgId2 = new mongoose.Types.ObjectId();

  // Test 1: Creation & Default Values
  console.log('Creating valid villa for orgId1...');
  const villa1 = await villaRepository.create(orgId1, {
    unitNumber: ' 101 ', // trimmed verification
    blockOrBuilding: 'Block A',
    type: 'Apartment',
    floorAreaSqFt: 1200
  });

  console.log('Created Villa details:', {
    id: villa1._id,
    orgId: villa1.orgId,
    unitNumber: villa1.unitNumber,
    type: villa1.type,
    status: villa1.status, // Default 'Vacant'
    primaryResidentId: villa1.primaryResidentId, // Default null
    floorAreaSqFt: villa1.floorAreaSqFt
  });

  if (villa1.unitNumber !== '101') {
    throw new Error('Unit number trim failed');
  }
  if (villa1.status !== 'Vacant') {
    throw new Error('Default status was not Vacant');
  }
  if (villa1.primaryResidentId !== null) {
    throw new Error('Default primaryResidentId was not null');
  }
  console.log('✓ Villa created with expected defaults.');

  // Test 2: Duplicate check within same organization
  try {
    await villaRepository.create(orgId1, {
      unitNumber: '101',
      blockOrBuilding: 'Block B'
    });
    throw new Error('Expected duplicate key error but operation succeeded');
  } catch (err) {
    if (err.code === 11000) {
      console.log('✓ Correctly blocked duplicate unitNumber in same org.');
    } else {
      throw err;
    }
  }

  // Test 3: Same unitNumber in different organization (should succeed)
  const villa2 = await villaRepository.create(orgId2, {
    unitNumber: '101',
    blockOrBuilding: 'Block A'
  });
  console.log('✓ Correctly allowed same unit number in a different organization. ID:', villa2._id);

  // Test 4: Repository tenant-scoping isolation
  console.log('Verifying repository tenant-scoping...');
  
  // Find check
  const foundInOrg1 = await villaRepository.find(orgId1);
  if (foundInOrg1.length !== 1 || foundInOrg1[0].unitNumber !== '101') {
    throw new Error('find() returned incorrect results or leaked cross-tenant');
  }

  // findById scoping check
  const foundByIdCorrect = await villaRepository.findById(villa1._id, orgId1);
  if (!foundByIdCorrect) {
    throw new Error('findById failed to locate villa with correct orgId');
  }
  const foundByIdWrong = await villaRepository.findById(villa1._id, orgId2);
  if (foundByIdWrong !== null) {
    throw new Error('SECURITY LEAK: findById returned a record belonging to another tenant!');
  }
  console.log('✓ findById tenant-scoping verified.');

  // update scoping check
  const updatedWrong = await villaRepository.update(villa1._id, orgId2, { status: 'Occupied' });
  if (updatedWrong !== null) {
    throw new Error('SECURITY LEAK: update modified a record belonging to another tenant!');
  }
  const updatedCorrect = await villaRepository.update(villa1._id, orgId1, { status: 'Occupied' });
  if (!updatedCorrect || updatedCorrect.status !== 'Occupied') {
    throw new Error('update failed with correct orgId');
  }
  console.log('✓ update tenant-scoping verified.');

  // delete scoping check
  const deletedWrong = await villaRepository.delete(villa1._id, orgId2);
  if (deletedWrong !== null) {
    throw new Error('SECURITY LEAK: delete removed a record belonging to another tenant!');
  }
  const deletedCorrect = await villaRepository.delete(villa1._id, orgId1);
  if (!deletedCorrect) {
    throw new Error('delete failed with correct orgId');
  }
  console.log('✓ delete tenant-scoping verified.');

  // Test 5: Paginated retrieval
  console.log('Testing paginated query...');
  // Create 5 villas in orgId2
  await villaRepository.create(orgId2, { unitNumber: '102', status: 'Vacant' });
  await villaRepository.create(orgId2, { unitNumber: '103', status: 'Vacant' });
  await villaRepository.create(orgId2, { unitNumber: '104', status: 'Vacant' });
  await villaRepository.create(orgId2, { unitNumber: '201', status: 'Occupied' });

  const { data, total } = await villaRepository.findPaginated({
    orgId: orgId2,
    page: 1,
    limit: 3,
    search: '10' // should match 101, 102, 103, 104
  });

  console.log(`Pagination results: total matches = ${total}, records returned = ${data.length}`);
  if (total !== 4 || data.length !== 3) {
    throw new Error(`Pagination did not return correct counts. Total: ${total}, length: ${data.length}`);
  }
  console.log('✓ findPaginated paging and filtering verified.');

  // Clean up
  await Villa.deleteMany({});
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB. All database tests passed successfully.');
}

async function runTests() {
  try {
    await testValidators();
    await testDatabase();
    console.log('\n=====================================');
    console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
    console.log('=====================================');
    process.exit(0);
  } catch (error) {
    console.error('VERIFICATION FAILED:', error);
    process.exit(1);
  }
}

runTests();
