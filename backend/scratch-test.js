import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { amenityFacilityRepository } from './src/features/amenityManagement/facilities/amenityFacility.repository.js';
import { AmenityFacility } from './src/features/amenityManagement/facilities/amenityFacility.model.js';

dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // 1. Create a dummy org
  const orgId = new mongoose.Types.ObjectId();
  
  // 2. Create a facility under maintenance
  const facility = await AmenityFacility.create({
    orgId,
    name: 'Test Maintenance Facility',
    code: 'TEST-MAIN-1',
    archetype: 'SHARED_CAPACITY',
    status: 'MAINTENANCE',
    concurrencyVersion: 1
  });
  
  console.log('Created facility:', facility._id);
  
  // 3. Try to soft delete
  const deleted = await amenityFacilityRepository.softDelete(facility._id, orgId);
  console.log('Deleted facility:', deleted ? 'Success' : 'Failed (Not Found)');
  
  // 4. Verify it was deleted
  const check = await AmenityFacility.findById(facility._id);
  console.log('Final isDeleted status:', check.isDeleted);
  
  await mongoose.disconnect();
}
run().catch(console.error);
