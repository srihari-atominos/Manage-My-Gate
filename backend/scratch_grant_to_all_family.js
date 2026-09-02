import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const Role = mongoose.model('Role', new mongoose.Schema({}, { strict: false, collection: 'roles' }));
  const RolePermission = mongoose.model('RolePermission', new mongoose.Schema({}, { strict: false, collection: 'rolepermissions' }));
  const Permission = mongoose.model('Permission', new mongoose.Schema({}, { strict: false, collection: 'permissions' }));

  // Find billing:action_center permission
  const perm = await Permission.findOne({ feature: 'billing', action: 'action_center' });
  if (!perm) {
    console.error('Permission billing:action_center not found!');
    process.exit(1);
  }
  console.log('Found Permission ID:', perm._id);

  // Find all Family Member roles in DB
  const familyRoles = await Role.find({ name: 'Family Member' });
  console.log(`Found ${familyRoles.length} Family Member roles in database.`);

  for (const role of familyRoles) {
    const exists = await RolePermission.findOne({ roleId: role._id, permissionId: perm._id });
    if (!exists) {
      await RolePermission.create({ roleId: role._id, permissionId: perm._id });
      console.log(`Granted billing:action_center to Role ID: ${role._id} (Org ID: ${role.orgId})`);
    } else {
      console.log(`Role ID: ${role._id} already has permission.`);
    }
  }

  process.exit(0);
}

run().catch(console.error);
