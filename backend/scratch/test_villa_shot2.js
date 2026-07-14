import mongoose from 'mongoose';
import http from 'http';
import dotenv from 'dotenv';
import { initSocket } from '../src/config/socket.js';
import villaEvents from '../src/features/villa/villa.events.js';
import villaService from '../src/features/villa/villa.services.js';
import Villa from '../src/features/villa/villa.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import { loggerStorage } from '../src/utils/logger.utils.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gated_community';

async function runTests() {
  try {
    console.log('--- Connecting Database & Mocking Socket server ---');
    await mongoose.connect(MONGO_URI);
    
    // Initialize mock socket.io server so getIO() doesn't throw
    const server = http.createServer();
    initSocket(server);

    // Clean up collection
    await Villa.deleteMany({});
    await OrgMembership.deleteMany({});

    const orgId = new mongoose.Types.ObjectId();
    const residentId = new mongoose.Types.ObjectId();

    // Event capture system
    const eventsCaptured = {};
    villaEvents.on('unit_created', (data) => {
      eventsCaptured.unit_created = data;
    });
    villaEvents.on('unit_updated', (data) => {
      eventsCaptured.unit_updated = data;
    });
    villaEvents.on('resident_assigned', (data) => {
      eventsCaptured.resident_assigned = data;
    });

    console.log('\n--- Test 1: createUnit Event Emission & Correlation Logging ---');
    let createdUnit = null;
    await loggerStorage.run('correlation-12345', async () => {
      createdUnit = await villaService.createUnit(orgId, {
        unitNumber: 'V-202',
        blockOrBuilding: 'Building C',
        type: 'Penthouse',
        floorAreaSqFt: 3000
      });
    });

    console.log('Created unit ID:', createdUnit._id);
    if (!eventsCaptured.unit_created) {
      throw new Error('Event "unit_created" was not emitted');
    }
    if (String(eventsCaptured.unit_created._id) !== String(createdUnit._id)) {
      throw new Error('Event payload mismatch for unit_created');
    }
    console.log('✓ createUnit event emitted successfully with correct payload.');

    console.log('\n--- Test 2: assignPrimaryResident Transaction (Success path) ---');
    // Create OrgMembership record for user in this organization
    const membership = new OrgMembership({
      userId: residentId,
      orgId: orgId,
      residentType: 'None'
    });
    await membership.save();

    let updatedUnit = null;
    await loggerStorage.run('correlation-67890', async () => {
      updatedUnit = await villaService.assignPrimaryResident(createdUnit._id, orgId, residentId);
    });

    if (updatedUnit.primaryResidentId.toString() !== residentId.toString()) {
      throw new Error('primaryResidentId was not updated in Unit');
    }
    if (updatedUnit.status !== 'Occupied') {
      throw new Error('Unit status was not updated to Occupied');
    }

    const updatedMembership = await OrgMembership.findOne({ userId: residentId, orgId });
    if (updatedMembership.villaId.toString() !== createdUnit._id.toString()) {
      throw new Error('villaId was not linked in OrgMembership');
    }
    if (updatedMembership.residentType !== 'Owner') {
      throw new Error('residentType was not updated to Owner');
    }

    if (!eventsCaptured.resident_assigned) {
      throw new Error('Event "resident_assigned" was not emitted');
    }
    console.log('✓ assignPrimaryResident linked Unit and OrgMembership correctly in transaction.');

    console.log('\n--- Test 3: assignPrimaryResident Transaction (Failure/Rollback path) ---');
    // Attempt assignment for a user who has no membership in this organization
    const nonMemberId = new mongoose.Types.ObjectId();
    try {
      await villaService.assignPrimaryResident(createdUnit._id, orgId, nonMemberId);
      throw new Error('Expected transaction to fail, but it succeeded');
    } catch (err) {
      console.log('Assignment failed as expected (Expected error message):', err.message);
      
      // Verify unit was NOT modified to nonMemberId
      const checkUnit = await Villa.findById(createdUnit._id);
      if (checkUnit.primaryResidentId.toString() !== residentId.toString()) {
        throw new Error('Rollback failed: Unit primaryResidentId was changed');
      }
      console.log('✓ Transaction successfully rolled back all changes upon error.');
    }

    // Clean up
    await Villa.deleteMany({});
    await OrgMembership.deleteMany({});
    await mongoose.disconnect();
    
    console.log('\n======================================');
    console.log('ALL SHOT 2 VERIFICATIONS PASSED!');
    console.log('======================================');
    process.exit(0);
  } catch (error) {
    console.error('VERIFICATION FAILED:', error);
    process.exit(1);
  }
}

runTests();
