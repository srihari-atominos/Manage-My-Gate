import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_my_gate_dev';

async function main() {
  await mongoose.connect(mongoUri);
  console.log('Connected!');

  const RolePermission = mongoose.models.RolePermission || mongoose.model('RolePermission', new mongoose.Schema({
    roleId: mongoose.Schema.Types.ObjectId,
    permissionId: mongoose.Schema.Types.ObjectId
  }));

  const mappings = await RolePermission.find({ roleId: '6a463c08cab44d60e627b682' });
  console.log(`\nFound ${mappings.length} mappings for role 6a463c08cab44d60e627b682:`);
  mappings.forEach(m => {
    console.log(`Mapping ID: ${m._id} | Role: ${m.roleId} | Permission: ${m.permissionId}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
