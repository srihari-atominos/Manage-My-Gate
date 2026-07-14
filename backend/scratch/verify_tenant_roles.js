import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../src/features/role/role.model.js';
import roleService from '../src/features/role/role.services.js';
import roleRepository from '../src/features/role/role.repository.js';

dotenv.config({ path: '.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  try {
    const orgId = new mongoose.Types.ObjectId();
    console.log('Creating test roles with orgId:', orgId);

    // 1. Create a tenant role
    const tenantRole = await roleService.createRole({
      name: 'Custom Resident Owner',
      description: 'A custom tenant role for testing',
      orgId,
      isTenantRole: true
    });
    console.log('Created tenant role successfully:', tenantRole);

    // 2. Create a global role
    const globalRole = await roleService.createRole({
      name: 'Custom Admin Assistant',
      description: 'A custom global role for testing',
      orgId,
      isTenantRole: false
    });
    console.log('Created global role successfully:', globalRole);

    // 3. Paginated query and check projection
    const { data: roles } = await roleRepository.findAllPaginated(orgId, 0, 10);
    console.log('Paginated roles retrieved from DB:');
    roles.forEach(role => {
      console.log(`- Role: ${role.name}, isTenantRole: ${role.isTenantRole}`);
    });

    // 4. Cleanup
    await Role.deleteMany({ orgId });
    console.log('Cleanup successful');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.connection.close();
  }
}

run();
